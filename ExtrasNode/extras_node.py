from PIL import Image, ImageEnhance, ImageColor, ImageOps
import numpy as np
import torch


class PreviewTextNode:
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):

        return {
            "required": {        
                "text": ("STRING", {"forceInput": True}),     
                },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
            }

    RETURN_TYPES = ("STRING",)
    OUTPUT_NODE = True
    FUNCTION = "preview_text"

    CATEGORY = "AlekPet Nodes/extras"

    def preview_text(self, text, prompt=None, extra_pnginfo=None):
        return {"ui": {"string": [text,]}, "result": (text,)}


# Correction colors nodes
class HexToHueNode:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "color_hex": (
                    "STRING",
                    {"default": "#00FF33"},
                ),
            }
        }

    RETURN_TYPES = ("STRING","FLOAT", "FLOAT", "STRING", "STRING")
    RETURN_NAMES = ("string_hex", "float_hue_degrees", "float_hue_norm", "string_hue_degrees","string_hue_norm")
    FUNCTION = "to_hue"
    CATEGORY = "AlekPet Nodes/extras"


    def to_hue(self, color_hex):
        hue_degrees = ColorsCorrectNode.hex_to_hue(color_hex)
        hue_norm = ColorsCorrectNode.degrees_to_hue(hue_degrees)
        return (color_hex, hue_degrees, hue_norm, str(hue_degrees), str(hue_norm))


class ColorsCorrectNode:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "brightness": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 100.0, "step": 0.05},
                ),
                "contrast": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 100.0, "step": 0.05},
                ),
                "saturation": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 100.0, "step": 0.05},
                ),
                "gamma": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 100.0, "step": 0.05},
                ),
                "hue_degrees": (
                    "FLOAT",
                    {"default": 0.0, "min": 0.0, "max": 360.0, "step": 0.01},
                ),
                "use_color": ([True, False], {"default": True},),
            },
            "optional": {
                "hex_color": (
                    "STRING",
                    {"default": "#00FF33"},
                ),     
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "correct"
    CATEGORY = "AlekPet Nodes/extras"


    @staticmethod
    def hex_to_rgb(hex_color):
        return ImageColor.getcolor(hex_color, "RGB")


    @staticmethod
    def hex_to_hue(hex_color):
        rgb = ImageColor.getcolor(hex_color, "RGB")
        r, g, b = [x / 255.0 for x in rgb]
        mx = max(r, g, b)
        mn = min(r, g, b)
        df = mx - mn

        if mx == mn:
            h = 0
        elif mx == r:
            h = (60 * ((g - b) / df) + 360) % 360
        elif mx == g:
            h = (60 * ((b - r) / df) + 120) % 360
        elif mx == b:
            h = (60 * ((r - g) / df) + 240) % 360

        return h


    @staticmethod
    def adjust_brightness(image, factor):
        enhancer = ImageEnhance.Brightness(image)
        return enhancer.enhance(factor)


    @staticmethod
    def adjust_contrast(image, factor):
        enhancer = ImageEnhance.Contrast(image)
        return enhancer.enhance(factor)


    @staticmethod
    def adjust_saturation(image, factor):
        enhancer = ImageEnhance.Color(image)
        return enhancer.enhance(factor)


    @staticmethod
    def adjust_gamma(image, gamma):
        inv_gamma = 1.0 / gamma
        lut = [pow(x / 255.0, inv_gamma) * 255 for x in range(256)]
        lut = np.array(lut * 3, dtype=np.uint8)
        return image.point(lut)


    @staticmethod
    def degrees_to_hue(degrees):
        degrees = degrees % 360
        hue = degrees / 360.0

        if hue > 0.5:
            hue -= 1.0
        if hue < -0.5:
            hue += 1.0

        return hue


    @staticmethod
    def adjust_hue(image, hue):
        if not (-0.5 <= hue <= 0.5):
            raise ValueError("hue value is not in [-0.5, 0.5].")
 
        image_array = np.array(image.convert('RGB'), dtype=np.uint8)
        
        hsv_image = Image.fromarray(image_array).convert('HSV')
        hsv_array = np.array(hsv_image)
        
        hsv_array[..., 0] = (hsv_array[..., 0].astype(int) + int(hue * 255)) % 256
        
        rgb_image = Image.fromarray(hsv_array, mode='HSV').convert('RGB')
        return rgb_image


    @staticmethod
    def tint_image(image, hex_color):
        return ImageOps.colorize(image.convert("L"), black="black", white=hex_color)


    def correct(self, image, use_color=True, hex_color="#00FF33", brightness = 1.0, contrast = 1.0, saturation = 1.0, gamma = 1.0, hue_degrees = 0.0):
        i = 255. * image[0].cpu().numpy()
        image = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))       

        if use_color:
            image = ColorsCorrectNode.tint_image(image, hex_color)

        image = ColorsCorrectNode.adjust_brightness(image, brightness)
        image = ColorsCorrectNode.adjust_contrast(image, contrast)
        image = ColorsCorrectNode.adjust_saturation(image, saturation)
        image = ColorsCorrectNode.adjust_gamma(image, gamma)

        hue_norm = ColorsCorrectNode.degrees_to_hue(hue_degrees)
        image = ColorsCorrectNode.adjust_hue(image, hue_norm)

        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]

        return (image,)