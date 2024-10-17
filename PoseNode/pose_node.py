import hashlib
import os
from PIL import Image
import torch
import numpy as np
import folder_paths


class PoseNode(object):
    @classmethod
    def INPUT_TYPES(self):
        input_dir = folder_paths.get_input_directory()

        if not os.path.isdir(input_dir):
            os.makedirs(input_dir)

        input_dir = folder_paths.get_input_directory()

        return {
            "required": {"image": (sorted(os.listdir(input_dir)),)},
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "output_pose"
    DESCRIPTION = "PoseNode allows you to set a pose for subsequent use in ControlNet."
    CATEGORY = "AlekPet Nodes/image"

    def output_pose(self, image):
        image_path = os.path.join(folder_paths.get_input_directory(), image)

        i = Image.open(image_path)
        image = i.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]

        return (image,)

    @classmethod
    def IS_CHANGED(self, image):
        image_path = os.path.join(folder_paths.get_input_directory(), image)

        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())
        return m.digest().hex()
