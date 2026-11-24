"""Versioned furniture catalog and administrator-only asset uploads."""
import base64
import hashlib
import tempfile
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import re
import struct

from PIL.Image import DecompressionBombError
from fastapi import HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / ".usta-data" / "furniture-assets"
BUILTINS = ROOT / "public" / "furniture-catalog.json"


class Dimensions(BaseModel):
    width: float = Field(gt=.05, le=15, allow_inf_nan=False)
    height: float = Field(gt=.05, le=10, allow_inf_nan=False)
    depth: float = Field(gt=.05, le=15, allow_inf_nan=False)


class Product(BaseModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,80}$")
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=30)
    description: str = Field(max_length=1500)
    imageUrl: str = Field(max_length=250)
    modelUrl: str = Field(max_length=250)
    material: str = Field(min_length=1, max_length=60)
    dimensions: Dimensions
    colors: list[str] = Field(min_length=1, max_length=12)
    price: float | None = Field(default=None, ge=0, le=1e12, allow_inf_nan=False)
    available: bool = True


def read_builtins():
    return json.loads(BUILTINS.read_text(encoding="utf-8-sig"))


class FurnitureUploadLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        size = 0
        async def limited_receive():
            nonlocal size
            message = await receive()
            if message.get("type") == "http.request":
                size += len(message.get("body", b""))
                if size > 9_000_000:
                    raise HTTPException(413, "Fayl 8 MB dan katta.")
            return message
        await self.app(scope, limited_receive if scope.get("path") == "/api/furniture/upload" else receive, send)


def validate_model(raw, suffix):
    binary = b""
    if suffix == ".glb":
        if len(raw) < 20 or raw[:4] != b"glTF":
            raise HTTPException(422, "GLB sarlavhasi yaroqsiz.")
        _, version, length = struct.unpack_from("<4sII", raw)
        if version != 2 or length != len(raw):
            raise HTTPException(422, "Faqat to‘liq GLB 2.0 fayli qabul qilinadi.")
        size, kind = struct.unpack_from("<II", raw, 12)
        if kind != 0x4E4F534A or size > len(raw) - 20:
            raise HTTPException(422, "GLB geometriya ma’lumotlari yaroqsiz.")
        content = raw[20:20 + size]
        chunk = 20 + size
        if chunk + 8 <= len(raw):
            binary_size, binary_type = struct.unpack_from("<II", raw, chunk)
            if binary_type != 0x004E4942 or binary_size > len(raw)-chunk-8:
                raise HTTPException(422, "GLB buffer yaroqsiz.")
            binary = raw[chunk+8:chunk+8+binary_size]
    else:
        content = raw
    try:
        model = json.loads(content)
        if model.get("asset", {}).get("version") != "2.0" or not model.get("meshes"):
            raise ValueError("No glTF geometry")
        if "KHR_draco_mesh_compression" in model.get("extensionsRequired", []) or "EXT_meshopt_compression" in model.get("extensionsRequired", []) or "KHR_texture_basisu" in model.get("extensionsRequired", []):
            raise ValueError("Unsupported compressed geometry")
        for resource in model.get("buffers", []) + model.get("images", []):
            uri = resource.get("uri")
            if uri and not uri.startswith("data:"):
                raise ValueError("External resource")
        from PIL import Image
        texture_pixels = 0
        for image in model.get("images", []):
            if image.get("uri"):
                uri = image["uri"]
                if not re.match(r"data:image/(png|jpeg|webp);base64,", uri):
                    raise ValueError("Unsupported embedded image")
                image_bytes = base64.b64decode(uri.split(",",1)[1], validate=True)
            elif "bufferView" in image:
                view = model["bufferViews"][image["bufferView"]]
                offset, length = int(view.get("byteOffset",0)), int(view["byteLength"])
                if offset < 0 or length < 1 or offset+length > len(binary):
                    raise ValueError("Invalid image bounds")
                image_bytes = binary[offset:offset+length]
            else:
                raise ValueError("Missing image")
            picture = Image.open(io.BytesIO(image_bytes))
            texture_pixels += picture.width*picture.height
            if picture.width>2048 or picture.height>2048 or texture_pixels>16_000_000:
                raise ValueError("Texture too large")
            picture.verify()
        if sum(int(accessor.get("count", 0)) for accessor in model.get("accessors", [])) > 2_000_000:
            raise ValueError("Too many vertices")
    except (ValueError, TypeError, KeyError, AttributeError, IndexError, OSError, DecompressionBombError) as exc:
        raise HTTPException(422, "Model yaroqsiz yoki tashqi faylga bog‘langan. Embedded GLB/GLTF yuklang.") from exc


def install_furniture(app, db, account):
    app.add_middleware(FurnitureUploadLimit)
    def admin(request):
        user = account(request)
        allowed = {value.strip() for value in os.getenv("FURNITURE_ADMIN_IDS", "").split(",") if value.strip()}
        if str(user["id"]) not in allowed:
            raise HTTPException(403, "Bu amal faqat administrator uchun.")
        return user

    def allowed_asset(url, model):
        builtin = read_builtins()["products"]
        if any(item["modelUrl" if model else "imageUrl"] == url for item in builtin):
            return
        match = re.fullmatch(r"/api/furniture/assets/([a-f0-9]{64}\.(glb|gltf|png|jpg|webp))", url)
        if not match or not (ASSETS / match[1]).is_file():
            raise HTTPException(422, "Avval faylni xavfsiz yuklang.")
        if model and match[2] not in {"glb", "gltf"}:
            raise HTTPException(422, "3D model formati kerak.")
        if not model and match[2] not in {"png","jpg","webp"}:
            raise HTTPException(422, "Rasm formati kerak.")

    @app.get("/api/furniture")
    def catalog():
        builtin = read_builtins()
        with db() as conn:
            custom = conn.execute("SELECT id,data,active FROM furniture_catalog").fetchall()
        products = {item["id"]: item for item in builtin["products"]}
        for row in custom:
            if row["active"]:
                products[row["id"]] = row["data"]
            else:
                products.pop(row["id"], None)
        return {"categories": builtin["categories"], "products": list(products.values())}

    @app.get("/api/furniture/access")
    def access(request: Request):
        user = admin(request)
        return {"admin": True, "userId": user["id"]}

    @app.put("/api/furniture")
    def put_product(product: Product, request: Request):
        user = admin(request)
        if product.category not in {row["id"] for row in read_builtins()["categories"]}:
            raise HTTPException(422, "Kategoriya yaroqsiz.")
        if any(not re.fullmatch(r"#[a-fA-F0-9]{6}", color) for color in product.colors):
            raise HTTPException(422, "Rangni HEX shaklida kiriting.")
        allowed_asset(product.modelUrl, True)
        allowed_asset(product.imageUrl, False)
        with db() as conn:
            conn.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", ("furniture:" + product.id,))
            previous = conn.execute("SELECT data FROM furniture_catalog WHERE id=%s", (product.id,)).fetchone()
            old = previous["data"] if previous and previous["data"] else next((row for row in read_builtins()["products"] if row["id"] == product.id), None)
            version = int(old.get("version", 0)) + 1 if old else 1
            data = {**product.model_dump(), "version": version,
                    "createdAt": old["createdAt"] if old else datetime.now(timezone.utc).isoformat()}
            if old:
                conn.execute("INSERT INTO furniture_versions(id,version,data) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING",
                             (product.id, int(old["version"]), Jsonb(old)))
            conn.execute("INSERT INTO furniture_versions(id,version,data) VALUES(%s,%s,%s)", (product.id, version, Jsonb(data)))
            conn.execute("""INSERT INTO furniture_catalog(id,data,active) VALUES(%s,%s,true)
                         ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,active=true""", (product.id, Jsonb(data)))
            conn.execute("INSERT INTO furniture_audit(user_id,product_id,action) VALUES(%s,%s,'update')", (user["id"], product.id))
        return data

    @app.delete("/api/furniture/{product_id}")
    def delete_product(product_id: str, request: Request):
        user = admin(request)
        with db() as conn:
            conn.execute("""INSERT INTO furniture_catalog(id,data,active) VALUES(%s,'{}',false)
                         ON CONFLICT(id) DO UPDATE SET active=false""", (product_id,))
            conn.execute("INSERT INTO furniture_audit(user_id,product_id,action) VALUES(%s,%s,'archive')", (user["id"], product_id))
        return {"ok": True}

    @app.post("/api/furniture/upload")
    def upload_asset(request: Request, file: UploadFile):
        admin(request)
        raw = file.file.read(8_000_001)
        if len(raw) > 8_000_000:
            raise HTTPException(413, "Fayl 8 MB dan katta.")
        suffix = Path(file.filename or "").suffix.lower()
        if suffix in {".glb", ".gltf"}:
            validate_model(raw, suffix)
        elif suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            from PIL import Image, UnidentifiedImageError
            try:
                image = Image.open(io.BytesIO(raw))
                if image.width * image.height > 16_000_000:
                    raise ValueError("Image too large")
                image.load()
                image.thumbnail((1600,1600))
                buffer = io.BytesIO()
                image.convert("RGB").save(buffer, "WEBP", quality=88)
                raw, suffix = buffer.getvalue(), ".webp"
            except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError) as exc:
                raise HTTPException(422, "Rasm formati yoki hajmi yaroqsiz.") from exc
        else:
            raise HTTPException(415, "GLB, embedded GLTF, PNG, JPEG yoki WebP yuklang.")
        ASSETS.mkdir(parents=True, exist_ok=True)
        name = hashlib.sha256(raw).hexdigest() + suffix
        destination = ASSETS / name
        # Link a completed temporary file atomically, keeping existing versions immutable.
        with tempfile.NamedTemporaryFile(dir=ASSETS, delete=False) as target:
            temporary = Path(target.name)
            target.write(raw)
            target.flush()
            os.fsync(target.fileno())
        try:
            try:
                os.link(temporary, destination)
            except FileExistsError:
                pass
        finally:
            temporary.unlink(missing_ok=True)
        return {"url": "/api/furniture/assets/" + name}

    @app.get("/api/furniture/assets/{name}")
    def asset(name: str):
        if not re.fullmatch(r"[a-f0-9]{64}\.(glb|gltf|png|jpg|webp)", name):
            raise HTTPException(404)
        destination = ASSETS / name
        if not destination.is_file():
            raise HTTPException(404)
        return FileResponse(destination, headers={"Cache-Control": "public,max-age=31536000,immutable"})
