import io
import unittest
from unittest.mock import patch

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from backend.main import corners, detect, password_hash


def rectangle_image():
    image = np.zeros((200, 300, 3), dtype=np.uint8)
    cv2.rectangle(image, (35, 30), (260, 165), (255, 255, 255), -1)
    success, encoded = cv2.imencode(".png", image)
    if not success:
        raise RuntimeError("Could not create synthetic contour fixture")
    return UploadFile(io.BytesIO(encoded.tobytes()), headers=Headers({"content-type": "image/png"}))


class BackendSmokeTest(unittest.TestCase):
    def test_opencv_detects_synthetic_rectangle(self):
        points = corners(rectangle_image())
        self.assertEqual(len(points), 4)
        self.assertAlmostEqual(min(point["x"] for point in points), 35 / 300, delta=.015)
        self.assertAlmostEqual(max(point["y"] for point in points), 165 / 200, delta=.015)

    def test_missing_model_requires_manual_counting(self):
        with patch.dict("os.environ", {"MATERIAL_MODEL": "./absent-test-model.pt"}):
            with self.assertRaises(HTTPException) as error:
                detect(rectangle_image())
        self.assertEqual(error.exception.status_code, 503)

    def test_password_hash_uses_salt(self):
        self.assertNotEqual(password_hash("qurilish-ustasi", "1" * 32),
                            password_hash("qurilish-ustasi", "2" * 32))


if __name__ == "__main__":
    unittest.main()
