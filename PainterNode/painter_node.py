import hashlib
import os
from server import PromptServer
from aiohttp import web
import base64
from io import BytesIO
import time
from PIL import Image, ImageOps, ImageSequence
import torch
import numpy as np

import folder_paths
import node_helpers
from . import painter_asset_storage


# Piping image
PAINTER_DICT = {}  # Painter nodes dict instances


def toBase64ImgUrl(img):
    bytesIO = BytesIO()
    img.save(bytesIO, format="PNG")
    img_types = bytesIO.getvalue()
    img_base64 = base64.b64encode(img_types)
    return f"data:image/png;base64,{img_base64.decode('utf-8')}"


@PromptServer.instance.routes.post("/alekpet/check_canvas_changed")
async def check_canvas_changed(request):
    json_data = await request.json()
    unique_id = json_data.get("unique_id", None)
    is_ok = json_data.get("is_ok", False)

    if unique_id is not None and unique_id in PAINTER_DICT and is_ok == True:
        PAINTER_DICT[unique_id].canvas_set = True
        return web.json_response({"status": "Ok"}, status=200)

    return web.json_response({"status": "Error"}, status=200)


def wait_canvas_change(unique_id, time_out=40):
    for _ in range(time_out):
        if (
            hasattr(PAINTER_DICT[unique_id], "canvas_set")
            and PAINTER_DICT[unique_id].canvas_set == True
        ):
            PAINTER_DICT[unique_id].canvas_set = False
            return True

        time.sleep(0.1)

    return False


# end - Piping image


class PainterNode(object):

    @classmethod
    def INPUT_TYPES(self):
        self.canvas_set = False

        work_dir = folder_paths.get_input_directory()
        imgs = [
            img
            for img in os.listdir(work_dir)
            if os.path.isfile(os.path.join(work_dir, img))
        ]

        return {
            "required": {"image": (sorted(imgs),)},
            "hidden": {"unique_id": "UNIQUE_ID"},
            "optional": {"images": ("IMAGE",), "update_node": ("BOOLEAN", {"default": True})},
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "painter_execute"
    DESCRIPTION = "PainterNode allows you to draw in the node window, for later use in the ControlNet or in any other node."
    CATEGORY = "AlekPet Nodes/image"

    def painter_execute(self, image, unique_id, update_node=True, images=None):
        # Piping image input
        if unique_id not in PAINTER_DICT:
            PAINTER_DICT[unique_id] = self

        if update_node == True and images is not None:

            input_images = []

            for imgs in images:
                # Add alpha channel if not present
                if imgs.shape[2] == 3:
                    imgs = torch.cat([imgs, torch.ones((*imgs.shape[:2], 1))], dim=2)
                i = 255.0 * imgs.cpu().numpy()
                i = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8), mode="RGBA")
                input_images.append(toBase64ImgUrl(i))

            PAINTER_DICT[unique_id].canvas_set = False

            PromptServer.instance.send_sync(
                "alekpet_get_image", {"unique_id": unique_id, "images": input_images}
            )

            if not wait_canvas_change(unique_id):
                print(f"Painter_{unique_id}: Failed to get image!")
            else:
                print(f"Painter_{unique_id}: Image received, canvas changed!")
        # end - Piping image input

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
    def IS_CHANGED(self, image, unique_id, update_node=True, images=None):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())

        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(self, image, unique_id, update_node=True, images=None):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True
