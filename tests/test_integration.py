"""Run against a dedicated test database set by USTA_TEST_DATABASE_URL."""
import base64
import hashlib
import json
import os
from pathlib import Path
import secrets
import unittest
from urllib.parse import parse_qs, urlparse
from uuid import uuid4
from unittest.mock import patch

import psycopg
from fastapi.testclient import TestClient
from backend.main import app, password_hash, digest


@unittest.skipUnless(os.getenv("USTA_TEST_DATABASE_URL"), "Dedicated PostgreSQL test database required")
class Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.url = os.environ["USTA_TEST_DATABASE_URL"]
        cls.environment = patch.dict(os.environ, {"DATABASE_URL": cls.url, "APP_URL": "http://testserver",
            "APP_ORIGINS": "http://testserver", "COOKIE_SECURE": "0", "OLLAMA_MODEL": "",
            "GOOGLE_CLIENT_ID": "", "GOOGLE_CLIENT_SECRET": "", "GOOGLE_REDIRECT_URI": "",
            "TWILIO_ACCOUNT_SID": "", "TWILIO_AUTH_TOKEN": "", "TWILIO_VERIFY_SERVICE_SID": ""})
        cls.environment.start()
        # Seed the original schema and a project before applying the additive migration.
        schema = Path("backend/schema.sql").read_text(encoding="utf-8-sig")
        original = schema.split("-- Additive migration.")[0]
        with psycopg.connect(cls.url) as conn:
            conn.execute(original)
            salt = secrets.token_hex(16)
            cls.legacy_email = "legacy-" + uuid4().hex + "@example.test"
            cls.legacy_password = "local-regression-password"
            cls.legacy_id = conn.execute("INSERT INTO users(email,salt,password_hash) VALUES(%s,%s,%s) RETURNING id",
                (cls.legacy_email, salt, password_hash(cls.legacy_password, salt))).fetchone()[0]
            cls.legacy_project = str(uuid4())
            conn.execute("INSERT INTO projects(user_id,id,data) VALUES(%s,%s,%s::jsonb)",
                         (cls.legacy_id, cls.legacy_project, json.dumps({"id": cls.legacy_project, "title": "Oldingi uy rejasi",
                           "kind": "plan", "rows": [["Maydon","96 m²"]], "payload": {"width":12,"depth":8}})))
            conn.execute(schema)

    @classmethod
    def tearDownClass(cls):
        cls.environment.stop()

    def test_project_isolation_relogin_and_real_pdf(self):
        credentials = {"email": uuid4().hex + "@example.test", "password": "local-regression-password"}
        with TestClient(app) as owner, TestClient(app) as other:
            self.assertEqual(owner.post("/api/register", json=credentials).status_code, 200)
            account = owner.get("/api/me").json()
            project = {"id": str(uuid4()), "kind": "plan", "title": "Uy loyihasi", "rows": [["Maydon", "96 m²"]],
                       "payload": {"plan": {"width": 12, "depth": 8, "lotWidth": 14, "lotDepth": 10, "height": 2.8,
                            "style": "Modern", "roof": False, "elements": [{"id":"room-1","type":"Zal","x":0,"y":0,"w":4,"d":4}]}}}
            self.assertEqual(owner.put("/api/projects", json=project).status_code, 200)
            self.assertEqual(owner.get("/api/projects").json()[0]["data"], project)
            pdf = owner.get("/api/report.pdf", params={"project": project["id"]})
            self.assertEqual(pdf.status_code, 200)
            self.assertTrue(pdf.content.startswith(b"%PDF-"))
            self.assertGreater(len(pdf.content), 1000)
            other.post("/api/register", json={**credentials, "email": uuid4().hex + "@example.test"})
            self.assertEqual(other.get("/api/projects").json(), [])
            other.delete("/api/projects/" + project["id"])
            self.assertEqual(len(owner.get("/api/projects").json()), 1)
            owner.post("/api/logout")
            self.assertEqual(owner.get("/api/projects").status_code, 401)
            self.assertEqual(owner.post("/api/login", json=credentials).status_code, 200)
            self.assertEqual(owner.get("/api/me").json()["id"], account["id"])
            self.assertEqual(owner.get("/api/projects").json()[0]["data"], project)

    def test_old_email_account_survives_migration(self):
        with TestClient(app) as client:
            result = client.post("/api/login", json={"email": self.legacy_email, "password": self.legacy_password})
            self.assertEqual(result.status_code, 200)
            self.assertEqual(client.get("/api/me").json()["id"], self.legacy_id)
            self.assertTrue(any(row["data"]["id"] == self.legacy_project for row in client.get("/api/projects").json()))

    def test_unconfigured_providers_and_assistant_do_not_simulate_results(self):
        with TestClient(app) as client:
            self.assertFalse(client.get("/api/auth/config").json()["google"])
            self.assertEqual(client.get("/api/auth/google").status_code, 503)
            self.assertEqual(client.post("/api/auth/phone/send", json={"phone": "+998901234567"}).status_code, 503)
            self.assertEqual(client.post("/api/assistant", json={"messages": [{"role": "user", "content": "Salom"}]}).status_code, 401)
            client.post("/api/login", json={"email": self.legacy_email, "password": self.legacy_password})
            self.assertEqual(client.post("/api/assistant", json={"messages": [{"role": "user", "content": "Salom"}]}).status_code, 503)

    def test_google_nonce_pkce_email_link_and_state_replay(self):
        config = {"GOOGLE_CLIENT_ID": "test-client", "GOOGLE_CLIENT_SECRET": "test-secret",
                  "GOOGLE_REDIRECT_URI": "http://testserver/api/auth/google/callback"}
        identity = {"sub": uuid4().hex, "email": self.legacy_email, "email_verified": True, "name": "Sinov Ustasi",
                    "picture": "https://example.test/avatar.png"}
        with patch.dict(os.environ, config), TestClient(app) as client:
            start = client.get("/api/auth/google", follow_redirects=False)
            query = parse_qs(urlparse(start.headers["location"]).query)
            self.assertEqual(query["code_challenge_method"], ["S256"])
            self.assertIn("openid", query["scope"][0])
            state = query["state"][0]
            identity["nonce"] = query["nonce"][0]
            self.assertEqual(client.get("/api/auth/google/callback?state=wrong&code=x").status_code, 400)
            with patch("backend.auth_routes.provider_json", return_value={"id_token": "provider-test-token"}), \
                 patch("google.oauth2.id_token.verify_oauth2_token", return_value=identity):
                result = client.get("/api/auth/google/callback", params={"state": state, "code": "test-code"}, follow_redirects=False)
            self.assertEqual(result.status_code, 303)
            profile = client.get("/api/me").json()
            self.assertEqual(profile["id"], self.legacy_id)
            self.assertEqual(profile["name"], "Sinov Ustasi")
            self.assertEqual(client.get("/api/auth/google/callback", params={"state": state, "code": "test-code"}).status_code, 400)

    def test_furniture_admin_auth_versions_and_archiving(self):
        import io
        from backend.furniture import read_builtins
        product = read_builtins()["products"][0]
        with TestClient(app) as client:
            self.assertEqual(client.get("/api/furniture/access").status_code,401)
            client.post("/api/login",json={"email":self.legacy_email,"password":self.legacy_password})
            self.assertEqual(client.put("/api/furniture",json=product).status_code,403)
            with patch.dict(os.environ,{"FURNITURE_ADMIN_IDS":str(self.legacy_id)}):
                self.assertTrue(client.get("/api/furniture/access").json()["admin"])
                edited = client.put("/api/furniture",json={**product,"price":1234567})
                self.assertEqual(edited.status_code,200)
                self.assertEqual(edited.json()["version"],2)
                self.assertEqual(edited.json()["price"],1234567)
                self.assertEqual(client.post("/api/furniture/upload",files={"file":("bad.glb",b"broken","application/octet-stream")}).status_code,422)
                self.assertEqual(client.delete("/api/furniture/"+product["id"]).status_code,200)
                self.assertFalse(any(row["id"]==product["id"] for row in client.get("/api/furniture").json()["products"]))
                with psycopg.connect(self.url) as conn:
                    self.assertEqual(conn.execute("SELECT count(*) FROM furniture_versions WHERE id=%s",(product["id"],)).fetchone()[0],2)
                    self.assertEqual(conn.execute("SELECT count(*) FROM furniture_audit WHERE product_id=%s",(product["id"],)).fetchone()[0],2)

    def test_furniture_uploaded_model_and_image_roundtrip_are_authorized(self):
        import io
        import tempfile
        from PIL import Image
        from backend import furniture
        raw = Path("public/furniture-models/v1/sofa-white.glb").read_bytes()
        with tempfile.TemporaryDirectory(dir=".apk-tools") as folder, patch.object(furniture,"ASSETS",Path(folder)):
            with TestClient(app) as client:
                client.post("/api/login",json={"email":self.legacy_email,"password":self.legacy_password})
                self.assertEqual(client.post("/api/furniture/upload",files={"file":("sofa.glb",raw,"model/gltf-binary")}).status_code,403)
                with patch.dict(os.environ,{"FURNITURE_ADMIN_IDS":str(self.legacy_id)}):
                    response = client.post("/api/furniture/upload",files={"file":("sofa.glb",raw,"model/gltf-binary")})
                    self.assertEqual(response.status_code,200)
                    result = client.get(response.json()["url"])
                    self.assertEqual(result.content,raw)
                    self.assertIn("immutable",result.headers["cache-control"])
                    repeated = client.post("/api/furniture/upload",files={"file":("sofa.glb",raw,"model/gltf-binary")})
                    self.assertEqual(response.json(),repeated.json())
                    image = io.BytesIO()
                    Image.new("RGB",(12,12),"white").save(image,"PNG")
                    uploaded = client.post("/api/furniture/upload",files={"file":("preview.png",image.getvalue(),"image/png")})
                    self.assertEqual(uploaded.status_code,200)
                    self.assertTrue(uploaded.json()["url"].endswith(".webp"))
                    self.assertEqual(client.get("/api/furniture/assets/invalid.exe").status_code,404)

    def test_phone_verification_creates_account_only_after_approval(self):
        number = "+998" + str(secrets.randbelow(900000000)+100000000)
        configuration = {"TWILIO_ACCOUNT_SID":"test", "TWILIO_AUTH_TOKEN":"test", "TWILIO_VERIFY_SERVICE_SID":"test"}
        with patch.dict(os.environ,configuration), TestClient(app) as client:
            with patch("backend.auth_routes.provider_json",return_value={"status":"pending"}):
                self.assertEqual(client.post("/api/auth/phone/send",json={"phone":number}).status_code,200)
                self.assertEqual(client.post("/api/auth/phone/verify",json={"phone":number,"code":"123456"}).status_code,401)
            self.assertEqual(client.get("/api/me").status_code,401)
            with patch("backend.auth_routes.provider_json",return_value={"status":"approved"}):
                self.assertEqual(client.post("/api/auth/phone/verify",json={"phone":number,"code":"123456"}).status_code,200)
            self.assertEqual(client.get("/api/me").json()["phone"],number)

    def test_mobile_signin_is_one_time_and_bound_to_verifier(self):
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        code = secrets.token_urlsafe(40)
        with psycopg.connect(self.url) as conn:
            conn.execute("INSERT INTO mobile_signins(code,user_id,challenge,expires) VALUES(%s,%s,%s,now()+interval '2 minutes')",
                         (digest(code), self.legacy_id, challenge))
        with TestClient(app) as client:
            response = client.post("/api/auth/mobile/exchange", data={"code": code, "verifier": verifier}, follow_redirects=False)
            self.assertEqual(response.status_code, 303)
            self.assertEqual(client.get("/api/me").json()["id"], self.legacy_id)
            self.assertEqual(client.post("/api/auth/mobile/exchange", data={"code": code, "verifier": verifier}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
