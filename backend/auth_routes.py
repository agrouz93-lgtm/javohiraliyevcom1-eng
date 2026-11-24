"""External sign-in and assistant routes. Provider secrets stay on the backend."""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as HTTPRequest, urlopen

from google.auth.exceptions import GoogleAuthError
from fastapi import HTTPException, Request, Response, Form
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field


def provider_json(url, values, headers=None):
    request = HTTPRequest(url, data=urlencode(values).encode(),
                          headers={"Content-Type": "application/x-www-form-urlencoded", **(headers or {})})
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read(1_000_000))
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise HTTPException(502, "Kirish provayderi so‘rovni bajarmadi. Keyinroq qayta urinib ko‘ring.") from exc


def google_config():
    values = [os.getenv(key) for key in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI")]
    if not all(values):
        raise HTTPException(503, "Google orqali kirish hali sozlanmagan. Email orqali kiring.")
    return values


def twilio_config():
    values = [os.getenv(key) for key in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID")]
    if not all(values):
        raise HTTPException(503, "Telefon orqali kirish hali sozlanmagan. Email orqali kiring.")
    return values


class Phone(BaseModel):
    phone: str = Field(pattern=r"^\+[1-9]\d{7,14}$")


class PhoneCode(Phone):
    code: str = Field(pattern=r"^\d{4,8}$")


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=3000)


class Chat(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


def install_routes(app, db, account, session, digest):
    def limit(key, maximum, seconds):
        with db() as conn:
            row = conn.execute("""INSERT INTO request_limits(key, hits, expires) VALUES(%s,1,now() + %s * interval '1 second')
                ON CONFLICT(key) DO UPDATE SET
                hits=CASE WHEN request_limits.expires<=now() THEN 1 ELSE request_limits.hits+1 END,
                expires=CASE WHEN request_limits.expires<=now() THEN EXCLUDED.expires ELSE request_limits.expires END
                RETURNING hits""", (digest(key), seconds)).fetchone()
            if row["hits"] > maximum:
                raise HTTPException(429, "So‘rovlar ko‘payib ketdi. Biroz kutib qayta urinib ko‘ring.")

    @app.get("/api/auth/config")
    def configuration():
        return {"google_url": os.getenv("APP_URL", "http://localhost:3000").rstrip("/") + "/api/auth/google",
                "google": all(os.getenv(key) for key in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI")),
                "phone": all(os.getenv(key) for key in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID")),
                "assistant": bool(os.getenv("OLLAMA_MODEL"))}

    @app.get("/api/auth/google")
    def google_start(client: str = "", app_challenge: str = ""):
        client_id, _, redirect = google_config()
        mobile = app_challenge if client == "android" else None
        if mobile is not None and not re.fullmatch(r"[A-Za-z0-9_-]{43}", mobile):
            raise HTTPException(422, "Mobil kirish tekshiruvi yaroqsiz.")
        state, nonce, verifier = (secrets.token_urlsafe(40) for _ in range(3))
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        with db() as conn:
            conn.execute("DELETE FROM oauth_states WHERE expires<=now()")
            conn.execute("INSERT INTO oauth_states(state,nonce,verifier,mobile_challenge,expires) VALUES(%s,%s,%s,%s,now()+interval '10 minutes')",
                         (digest(state), nonce, verifier, mobile))
        query = urlencode({"client_id": client_id, "redirect_uri": redirect, "response_type": "code",
                           "scope": "openid email profile", "state": state, "nonce": nonce,
                           "code_challenge": challenge, "code_challenge_method": "S256", "prompt": "select_account"})
        response = RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + query, status_code=302)
        response.set_cookie("usta_oauth", state, max_age=600, httponly=True,
                            secure=os.getenv("COOKIE_SECURE", "0") == "1", samesite="lax", path="/api/auth")
        return response

    @app.get("/api/auth/google/callback")
    def google_callback(request: Request, state: str = "", code: str = "", error: str = ""):
        client_id, client_secret, redirect = google_config()
        app_url = os.getenv("APP_URL", "http://localhost:3000").rstrip("/")
        response = RedirectResponse(app_url + "/", status_code=303)
        response.delete_cookie("usta_oauth", path="/api/auth")
        cookie = request.cookies.get("usta_oauth", "")
        if not state or not cookie or not hmac.compare_digest(state, cookie):
            raise HTTPException(400, "Kirish sessiyasi yaroqsiz. Kirishni qayta boshlang.")
        with db() as conn:
            flow = conn.execute("DELETE FROM oauth_states WHERE state=%s AND expires>now() RETURNING nonce,verifier,mobile_challenge",
                                (digest(state),)).fetchone()
        if not flow:
            raise HTTPException(400, "Kirish havolasi eskirgan. Qayta urinib ko‘ring.")
        if error or not code:
            return RedirectResponse(app_url + "/?auth_error=cancelled", status_code=303)
        tokens = provider_json("https://oauth2.googleapis.com/token",
            {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect,
             "client_id": client_id, "client_secret": client_secret, "code_verifier": flow["verifier"]})
        try:
            from google.auth.transport.requests import Request as GoogleRequest
            from google.oauth2.id_token import verify_oauth2_token
            identity = verify_oauth2_token(tokens["id_token"], GoogleRequest(), client_id)
            if identity.get("nonce") != flow["nonce"] or identity.get("email_verified") is not True:
                raise ValueError("Unverified Google identity")
            email, subject = identity["email"].strip().lower(), identity["sub"]
        except (ValueError, KeyError, GoogleAuthError) as exc:
            raise HTTPException(401, "Google akkaunti tasdiqlanmadi.") from exc
        with db() as conn:
            # Verified email ownership allows an existing email account to retain its projects.
            conn.execute("""INSERT INTO users(email,google_subject,name,avatar) VALUES(%s,%s,%s,%s)
                ON CONFLICT DO NOTHING""",
                (email, subject, identity.get("name", ""), identity.get("picture", "")))
            row = conn.execute("""SELECT id,google_subject FROM users WHERE google_subject=%s OR email=%s
                ORDER BY (google_subject=%s) DESC NULLS LAST LIMIT 1 FOR UPDATE""",
                (subject, email, subject)).fetchone()
            if row["google_subject"] not in (None, subject):
                raise HTTPException(409, "Akkaunt bog‘lanishini tekshirish kerak.")
            conn.execute("UPDATE users SET google_subject=%s,name=%s,avatar=%s WHERE id=%s",
                         (subject, identity.get("name", ""), identity.get("picture", ""), row["id"]))
            if flow["mobile_challenge"]:
                mobile_code = secrets.token_urlsafe(40)
                conn.execute("INSERT INTO mobile_signins(code,user_id,challenge,expires) VALUES(%s,%s,%s,now()+interval '2 minutes')",
                             (digest(mobile_code), row["id"], flow["mobile_challenge"]))
                response = RedirectResponse("ustapro://signin?" + urlencode({"code": mobile_code}),status_code=303)
                response.delete_cookie("usta_oauth", path="/api/auth")
            else:
                session(conn, response, row["id"])
        return response

    @app.post("/api/auth/mobile/exchange")
    def mobile_exchange(code: str = Form(..., min_length=30, max_length=100),
                        verifier: str = Form(..., min_length=43, max_length=128)):
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        response = RedirectResponse(os.getenv("APP_URL","http://localhost:3000").rstrip("/") + "/",status_code=303)
        with db() as conn:
            row = conn.execute("DELETE FROM mobile_signins WHERE code=%s AND expires>now() RETURNING user_id,challenge",
                               (digest(code),)).fetchone()
            if not row or not hmac.compare_digest(row["challenge"],challenge):
                raise HTTPException(401,"Mobil kirish kodi yaroqsiz yoki eskirgan.")
            session(conn,response,row["user_id"])
        return response

    def twilio_request(action, values):
        sid, token, service = twilio_config()
        authorization = base64.b64encode((sid + ":" + token).encode()).decode()
        return provider_json("https://verify.twilio.com/v2/Services/" + service + "/" + action,
                             values, {"Authorization": "Basic " + authorization})

    @app.post("/api/auth/phone/send")
    def phone_send(data: Phone, request: Request):
        twilio_config()
        limit("send-phone:" + data.phone, 3, 600)
        limit("send-ip:" + request.client.host, 20, 600)
        result = twilio_request("Verifications", {"To": data.phone, "Channel": "sms"})
        if result.get("status") != "pending":
            raise HTTPException(502, "SMS yuborilmadi.")
        return {"ok": True}

    @app.post("/api/auth/phone/verify")
    def phone_verify(data: PhoneCode, response: Response):
        twilio_config()
        limit("verify:" + data.phone, 8, 600)
        result = twilio_request("VerificationCheck", {"To": data.phone, "Code": data.code})
        if result.get("status") != "approved":
            raise HTTPException(401, "SMS kodi xato yoki eskirgan.")
        with db() as conn:
            row = conn.execute("""INSERT INTO users(phone,name) VALUES(%s,%s)
                ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id""",
                (data.phone, "Usta")).fetchone()
            session(conn, response, row["id"])
        return {"ok": True}

    @app.post("/api/assistant")
    def assistant(data: Chat, request: Request):
        user = account(request)
        model = os.getenv("OLLAMA_MODEL")
        if not model:
            raise HTTPException(503, "AI yordamchi hali ulanmagan. Serverda mahalliy modelni sozlang.")
        limit("assistant:" + str(user["id"]), 30, 300)
        if data.messages[-1].role != "user":
            raise HTTPException(422, "Oxirgi xabar foydalanuvchi savoli bo‘lishi kerak.")
        system = ("Siz USTA PRO qurilish yordamchisisiz. O‘zbek tilida aniq javob bering. "
                  "Hisob formulalari va foydalanuvchi kiritgan o‘lchamlarni tushuntiring. Narxlarni o‘ylab topmang. "
                  "Rasm yoki sensor yuborilmagan bo‘lsa haqiqiy o‘lchov yoki sanoq natijasini da’vo qilmang. "
                  "Muhandislik loyihalarida mutaxassis tasdig‘i kerakligini mos holatda ayting.")
        body = json.dumps({"model": model, "stream": False,
                           "messages": [{"role": "system", "content": system}] +
                               [message.model_dump() for message in data.messages]}).encode()
        query = HTTPRequest("http://127.0.0.1:11434/api/chat", data=body, headers={"Content-Type": "application/json"})
        try:
            with urlopen(query, timeout=90) as response:
                result = json.loads(response.read(1_000_000))
            content = result["message"]["content"]
            if not isinstance(content, str) or not content.strip():
                raise ValueError("Empty reply")
            return {"content": content[:20000]}
        except (URLError, TimeoutError, ValueError, KeyError, TypeError) as exc:
            raise HTTPException(502, "AI yordamchidan javob olinmadi. Modelni tekshiring.") from exc
