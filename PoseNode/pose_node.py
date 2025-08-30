import hashlib
import os
from PIL import Image, ImageOps, ImageSequence
import torch
import numpy as np

import folder_paths
import node_helpers

class PoseNode(object):
    @classmethod
    def INPUT_TYPES(self):
        input_dir = folder_paths.get_input_directory()

        if not os.path.isdir(input_dir):
            os.makedirs(input_dir)

        input_dir = folder_paths.get_input_directory()

        imgs = [img
            for img in os.listdir(input_dir)
            if os.path.isfile(os.path.join(input_dir, img))]

        return {
            "required": {"image": (sorted(imgs),)},
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "output_pose"
    DESCRIPTION = "PoseNode allows you to set a pose for subsequent use in ControlNet."
    CATEGORY = "AlekPet Nodes/image"

    def output_pose(self, image):
        image_path = folder_paths.get_annotated_filepath(image)

        img = node_helpers.pillow(Image.open, image_path)

        output_images = []
        output_masks = []
        w, h = None, None

        excluded_formats = ['MPO']

        for i in ImageSequence.Iterator(img):
            i = node_helpers.pillow(ImageOps.exif_transpose, i)

            if i.mode == 'I':
                i = i.point(lambda i: i * (1 / 255))
            image = i.convert("RGB")

            if len(output_images) == 0:
                w = image.size[0]
                h = image.size[1]

            if image.size[0] != w or image.size[1] != h:
                continue

            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
            elif i.mode == 'P' and 'transparency' in i.info:
                mask = np.array(i.convert('RGBA').getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
            else:
                mask = torch.zeros((64,64), dtype=torch.float32, device="cpu")
            output_images.append(image)
            output_masks.append(mask.unsqueeze(0))

        if len(output_images) > 1 and img.format not in excluded_formats:
            output_image = torch.cat(output_images, dim=0)
            output_mask = torch.cat(output_masks, dim=0)
        else:
            output_image = output_images[0]
            output_mask = output_masks[0]

        return (output_image, output_mask)

    @classmethod
    def IS_CHANGED(self, image):
        image_path = folder_paths.get_annotated_filepath(image)

        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(self, image):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True