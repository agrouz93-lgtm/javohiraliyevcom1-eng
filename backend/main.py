import os
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", "16000000")
import re
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from uuid import UUID

import cv2
import numpy as np
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI()
@app.exception_handler(psycopg.Error)
async def database_unavailable(request, exception):
    return JSONResponse(status_code=503, content={"detail": "Ma’lumotlar bazasiga ulanib bo‘lmadi. Server sozlamalarini tekshiring."})


COOKIE = "usta_session"
CLASSES = {"slate": "Shifer", "board": "Taxta", "beam": "Brus", "brick": "G‘isht",
           "shifer": "Shifer", "taxta": "Taxta", "brus": "Brus", "gisht": "G‘isht", "block": "Blok", "blok": "Blok", "pipe": "Quvur", "quvur": "Quvur"}
detector = None
model_lock = Lock()


def db():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise HTTPException(503, "Ma’lumotlar bazasi hali sozlanmagan.")
    return psycopg.connect(url, row_factory=dict_row)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(password, salt):
    return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=1, maxmem=64 * 1024**2).hex()


def session(conn, response, user_id):
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions(token,user_id,expires) VALUES(%s,%s,%s)",
                 (digest(token), user_id, datetime.now(timezone.utc) + timedelta(days=7)))
    response.set_cookie(COOKIE, token, max_age=604800, httponly=True,
                        secure=os.getenv("COOKIE_SECURE", "0") == "1", samesite="lax")


def account(request):
    token = request.cookies.get(COOKIE, "")
    if not token:
        raise HTTPException(401, "Avval tizimga kiring.")
    with db() as conn:
        row = conn.execute("""SELECT users.id, email, name, avatar, phone FROM users JOIN sessions ON user_id=users.id
                              WHERE token=%s AND expires>now()""", (digest(token),)).fetchone()
    if not row:
        raise HTTPException(401, "Avval tizimga kiring.")
    return row


@app.middleware("http")
async def protect_origin(request, call_next):
    origin = request.headers.get("origin")
    if request.method not in {"GET", "HEAD", "OPTIONS"} and origin:
        allowed = os.getenv("APP_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin not in allowed:
            return Response(status_code=403)
    length = request.headers.get("content-length")
    if length and (not length.isdecimal() or int(length) > 9_000_000):
        return Response(status_code=413)
    return await call_next(request)


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=10, max_length=128)


@app.post("/api/register")
def register(data: Credentials, response: Response):
    email = data.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(422, "Email manzilini tekshiring.")
    salt = secrets.token_hex(16)
    with db() as conn:
        row = conn.execute("""INSERT INTO users(email,salt,password_hash) VALUES(%s,%s,%s)
                              ON CONFLICT DO NOTHING RETURNING id""",
                           (email, salt, password_hash(data.password, salt))).fetchone()
        if not row:
            raise HTTPException(409, "Bu email ro‘yxatdan o‘tgan.")
        session(conn, response, row["id"])
    return {"email": email}


@app.post("/api/login")
def login(data: Credentials, response: Response):
    email = data.email.strip().lower()
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email=%s", (email,)).fetchone()
        candidate = password_hash(data.password, (row["salt"] or "0" * 32) if row else "0" * 32)
        if not row or not row["password_hash"] or not hmac.compare_digest(candidate, row["password_hash"]):
            raise HTTPException(401, "Email yoki parol xato.")
        session(conn, response, row["id"])
    return {"email": email}


@app.post("/api/logout")
def logout(request: Request, response: Response):
    with db() as conn:
        conn.execute("DELETE FROM sessions WHERE token=%s", (digest(request.cookies.get(COOKIE, "")),))
    response.delete_cookie(COOKIE)
    return {"ok": True}


@app.get("/api/me")
def me(request: Request):
    return account(request)


class Entry(BaseModel):
    id: UUID
    title: str = Field(min_length=1, max_length=120)
    kind: str = Field(pattern="^(measurement|materials|plan|estimate)$")
    rows: list[tuple[str, str]] = Field(max_length=500)
    payload: dict = Field(default_factory=dict)


@app.get("/api/projects")
def projects(request: Request):
    user = account(request)
    with db() as conn:
        return conn.execute("SELECT data, updated FROM projects WHERE user_id=%s ORDER BY updated DESC",
                            (user["id"],)).fetchall()


@app.put("/api/projects")
def save(data: Entry, request: Request):
    user = account(request)
    with db() as conn:
        conn.execute("""INSERT INTO projects(user_id,id,data) VALUES(%s,%s,%s)
                        ON CONFLICT(user_id,id) DO UPDATE SET data=EXCLUDED.data,updated=now()""",
                     (user["id"], data.id, Jsonb(data.model_dump(mode="json"))))
    return {"ok": True}


@app.delete("/api/projects/{entry_id}")
def delete(entry_id: UUID, request: Request):
    user = account(request)
    with db() as conn:
        conn.execute("DELETE FROM projects WHERE user_id=%s AND id=%s", (user["id"], entry_id))
    return {"ok": True}


def decode(upload):
    raw = upload.file.read(8_000_001)
    if len(raw) > 8_000_000:
        raise HTTPException(413, "Rasm 8 MB dan katta.")
    if upload.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "JPEG, PNG yoki WebP yuklang.")
    try:
        frame = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    except cv2.error as exc:
        raise HTTPException(422, "Rasm o‘lchami yoki formati yaroqsiz.") from exc
    if frame is None:
        raise HTTPException(422, "Rasmni o‘qib bo‘lmadi.")
    return frame


@app.post("/api/corners")
def corners(image: UploadFile):
    frame = decode(image)
    height, width = frame.shape[:2]
    scale = min(1, 1024 / max(height, width))
    resized = cv2.resize(frame, None, fx=scale, fy=scale)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 60, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:20]:
        if cv2.contourArea(contour) < 0.03 * resized.shape[0] * resized.shape[1]:
            break
        approx = cv2.approxPolyDP(contour, 0.025 * cv2.arcLength(contour, True), True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            return [{"x": float(x) / resized.shape[1], "y": float(y) / resized.shape[0]} for x, y in approx[:, 0]]
    raise HTTPException(422, "Yopiq kontur topilmadi. Burchaklarni qo‘lda belgilang.")


@app.post("/api/detect")
def detect(image: UploadFile):
    global detector
    path = Path(os.getenv("MATERIAL_MODEL", "material.pt"))
    if not path.is_file() or path.suffix != ".pt":
        raise HTTPException(503, "Material modeli ulanmagan. Predmetlarni qo‘lda belgilang.")
    frame = decode(image)
    height, width = frame.shape[:2]
    try:
        with model_lock:
            if detector is None:
                from ultralytics import YOLO
                detector = YOLO(str(path))
            result = detector.predict(frame, conf=0.3, iou=0.45, agnostic_nms=True, verbose=False)[0]
    except Exception as exc:
        raise HTTPException(503, "Material modelini ishga tushirib bo‘lmadi. Qo‘lda sanash mavjud.") from exc
    output = []
    for box in result.boxes:
        key = result.names[int(box.cls.item())].strip().lower()
        if key not in CLASSES:
            continue
        x1, y1, x2, y2 = box.xyxyn[0].tolist()
        output.append({"type": CLASSES[key], "confidence": round(box.conf.item() * 100),
                       "x": x1, "y": y1, "w": x2-x1, "h": y2-y1, "pieces": 1})
    return output

class ResetRequest(BaseModel):
    email: str = Field(max_length=254)


class ResetPassword(BaseModel):
    token: str = Field(min_length=30, max_length=128)
    password: str = Field(min_length=10, max_length=128)


@app.post("/api/password/request")
def reset_request(data: ResetRequest):
    import smtplib
    import ssl
    from email.message import EmailMessage
    from urllib.parse import urlencode

    host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM")
    app_url = os.getenv("APP_URL")
    if not (host and sender and app_url):
        raise HTTPException(503, "Parolni tiklash uchun pochta xizmati sozlanmagan.")
    token = secrets.token_urlsafe(32)
    email = data.email.strip().lower()
    with db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email=%s FOR UPDATE", (email,)).fetchone()
        if not user:
            return {"ok": True}
        recent = conn.execute("SELECT 1 FROM password_resets WHERE user_id=%s AND created > now() - interval '2 minutes'", (user["id"],)).fetchone()
        if recent:
            return {"ok": True}
        conn.execute("DELETE FROM password_resets WHERE user_id=%s OR expires<=now()", (user["id"],))
        conn.execute("INSERT INTO password_resets(token,user_id,expires) VALUES(%s,%s,now() + interval '20 minutes')",
                     (digest(token), user["id"]))
    message = EmailMessage()
    message["From"], message["To"], message["Subject"] = sender, email, "USTA PRO — parolni tiklash"
    message.set_content("Havola 20 daqiqa amal qiladi:\n" + app_url.rstrip("/") + "/#"
                        + urlencode({"reset": token}))
    try:
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=8) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if os.getenv("SMTP_USER"):
                smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException, KeyError):
        with db() as conn:
            conn.execute("DELETE FROM password_resets WHERE token=%s", (digest(token),))
        # Return the same response for registered and unregistered addresses.
    return {"ok": True}


@app.post("/api/password/reset")
def reset_password(data: ResetPassword):
    salt = secrets.token_hex(16)
    with db() as conn:
        token = conn.execute("DELETE FROM password_resets WHERE token=%s AND expires>now() RETURNING user_id",
                             (digest(data.token),)).fetchone()
        if not token:
            raise HTTPException(422, "Tiklash havolasi eskirgan yoki yaroqsiz.")
        conn.execute("UPDATE users SET salt=%s,password_hash=%s WHERE id=%s",
                     (salt, password_hash(data.password, salt), token["user_id"]))
        conn.execute("DELETE FROM sessions WHERE user_id=%s", (token["user_id"],))
    return {"ok": True}


@app.get("/api/report.pdf")
def report_pdf(request: Request, project: UUID | None = None):
    from io import BytesIO
    from xml.sax.saxutils import escape

    import reportlab
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

    user = account(request)
    with db() as conn:
        rows = conn.execute("""SELECT data,updated FROM projects WHERE user_id=%s
                               AND (%s::uuid IS NULL OR id=%s) ORDER BY updated DESC""",
                            (user["id"], project, project)).fetchall()
    if not rows:
        raise HTTPException(404, "Hisobot uchun saqlangan natija topilmadi.")
    pdfmetrics.registerFont(TTFont("Usta", str(Path(reportlab.__file__).parent / "fonts" / "Vera.ttf")))
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = "Usta"
    flow = [Paragraph("USTA PRO · Qurilish hisoboti", styles["Title"])]
    for row in rows:
        data = row["data"]
        flow.append(Paragraph(escape(data["title"]), styles["Heading2"]))
        flow.append(Paragraph(row["updated"].strftime("%Y-%m-%d %H:%M %Z"), styles["Normal"]))
        for label, value in data["rows"]:
            flow.append(Paragraph(escape(label + " — " + value), styles["BodyText"]))
        flow.append(Spacer(1, 12))
    buffer = BytesIO()
    SimpleDocTemplate(buffer, title="USTA PRO").build(flow)
    return Response(buffer.getvalue(), media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="usta-hisobot.pdf"'})


class PlanPrompt(BaseModel):
    prompt: str = Field(min_length=5, max_length=400)


@app.post("/api/plan-suggestion")
def plan_suggestion(data: PlanPrompt, request: Request):
    import json
    from urllib.error import URLError
    from urllib.request import Request as HTTPRequest, urlopen

    account(request)
    model = os.getenv("OLLAMA_MODEL")
    if not model:
        raise HTTPException(503, "Mahalliy AI modeli sozlanmagan. Qoidali taklifdan foydalaning.")
    system = """Return a single JSON object for a preliminary single-story floor plan.
Fields: width, depth, lotWidth, lotDepth, height (meters), style (Modern, Classic, Minimal, Luxury),
roof (boolean), elements (list). Each element has id (unique string), type (Yotoqxona,
Oshxona, Zal, Hammom, Koridor, Devor, Eshik, Deraza, Zinapoya, Mebel),
x, y, w, d (meters). All elements must fit inside width × depth. Keep rooms non-overlapping.
Use the requested dimensions, leave circulation space, and use no Markdown."""
    body = json.dumps({"model": model, "stream": False, "format": "json",
                       "messages": [{"role": "system", "content": system},
                                    {"role": "user", "content": data.prompt}]}).encode()
    target = HTTPRequest("http://127.0.0.1:11434/api/chat", data=body,
                         headers={"Content-Type": "application/json"})
    try:
        with urlopen(target, timeout=90) as response:
            result = json.loads(response.read(1_000_000))
        return json.loads(result["message"]["content"])
    except (URLError, TimeoutError, ValueError, TypeError, KeyError) as exc:
        raise HTTPException(502, "Mahalliy modeldan yaroqli reja javobi olinmadi.") from exc


from backend.auth_routes import install_routes
install_routes(app, db, account, session, digest)

from backend.furniture import install_furniture
install_furniture(app, db, account)

from backend.payments import install_payments
install_payments(app, db, account)
