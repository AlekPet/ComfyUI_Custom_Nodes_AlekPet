import hashlib
import os
from PIL import Image, ImageOps
import torch
import numpy as np
import folder_paths

class PainterNode(object):
    @classmethod
    def INPUT_TYPES(self):
        work_dir = folder_paths.get_input_directory()
        images = [img for img in os.listdir(work_dir) if os.path.isfile(os.path.join(work_dir, img))]
        return {"required":
                    {"image": (sorted(images), )},
                }


    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "painter_execute"

    CATEGORY = "AlekPet Nodes/image"

    def painter_execute(self, image):
        image_path = folder_paths.get_annotated_filepath(image)

        i = Image.open(image_path)
        i = ImageOps.exif_transpose(i)
        image = i.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]
        if 'A' in i.getbands():
            mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
            mask = 1. - torch.from_numpy(mask)
        else:
            mask = torch.zeros((64,64), dtype=torch.float32, device="cpu")
        return (image, mask.unsqueeze(0))

    @classmethod
    def IS_CHANGED(self, image):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(self, image):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True
