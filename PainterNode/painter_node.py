import hashlib
import os
from PIL import Image
import torch
import numpy as np
import folder_paths

class PainterNode(object):
    @classmethod
    def INPUT_TYPES(self):
        temp_dir = folder_paths.get_temp_directory()

        if not os.path.isdir(temp_dir):
            os.makedirs(temp_dir)

        temp_dir = folder_paths.get_temp_directory()

        return {"required":
                {"image": (sorted(os.listdir(temp_dir)), )},
                }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "painter_execute"

    CATEGORY = "image"

    def painter_execute(self, image):
        image_path = os.path.join(
            folder_paths.get_temp_directory(), image)

        i = Image.open(image_path)
        image = i.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]

        return (image,)

    @classmethod
    def IS_CHANGED(self, image):
        image_path = os.path.join(
            folder_paths.get_temp_directory(), image)

        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()
