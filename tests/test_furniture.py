import io
from pathlib import Path
import unittest
from fastapi import HTTPException
from backend.furniture import validate_model


class ModelValidation(unittest.TestCase):
    def test_real_builtin_glb_passes(self):
        validate_model(Path("public/furniture-models/v1/sofa-white.glb").read_bytes(), ".glb")

    def test_corrupt_and_external_gltf_are_rejected(self):
        for raw, suffix in [(b"broken", ".glb"),
                            (b'{"asset":{"version":"2.0"},"meshes":[{}],"buffers":[{"uri":"https://example.test/private"}]}', ".gltf")]:
            with self.assertRaises(HTTPException):
                validate_model(raw, suffix)
