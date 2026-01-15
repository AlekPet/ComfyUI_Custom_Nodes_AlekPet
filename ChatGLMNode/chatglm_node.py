import os
import json
import requests
import base64
from io import BytesIO
import numpy as np
from server import PromptServer
from PIL import Image, ImageOps, ImageSequence
import time
import torch
import node_helpers
from comfy_api_nodes.util import (
    download_url_to_video_output,
)


ALL_CODES_LANGS = ['af', 'sq', 'am', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'be', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lg', 'lb', 'mk', 'mai', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mni-Mtei', 'lus', 'mn', 'my', 'ne', 'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro', 'ru', 'sm', 'sa', 'gd', 'nso', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu']

# Endpoints
ENDPOINT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
ENDPOINT_IMAGE_URL = "https://open.bigmodel.cn/api/paas/v4/images/generations"
ENDPOINT_VIDEO_URL = "https://open.bigmodel.cn/api/paas/v4/videos/generations"
ENDPOINT_VIDEO_CHECK_URL = "https://open.bigmodel.cn/api/paas/v4/async-result/"

# Language models: https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8#%E6%96%87%E6%9C%AC%E6%A8%A1%E5%9E%8B
LIST_LANGUAGE_MODELS = [
    # GLM-4
    "glm-4-plus",
    "glm-4-air-250414",
    "glm-4-airx",
    "glm-4-flashx",
    "glm-4-flashx-250414",
    # GLM-4.5
    "glm-4.5",
    "glm-4.5-air",
    "glm-4.5-x",
    "glm-4.5-airx",
    "glm-4.5-flash",
    # GLM-4.6
    "glm-4.6",    
    # GLM-4.7
    "glm-4.7",    
    # GLM-Z1
    "glm-z1-air",
    "glm-z1-airx",
    "glm-z1-flash",
    "glm-z1-flashx",
]

# Multimodal models: https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8#%E8%A7%86%E8%A7%89%E6%A8%A1%E5%9E%8B
LIST_MULTIMODAL_MODELS = [
    # --- GLM-4v
    "glm-4v-flash",
    "glm-4v",
    "glm-4v-plus-0111",
    # --- GLM-4.1v
    "glm-4.1v-thinking-flashx",
    "glm-4.1v-thinking-flash",
    # --- GLM-4.5v
    "glm-4.5v",
    # --- GLM-4.6v
    "glm-4.6v",    
    "glm-4.6v-flash",    
    "glm-4.6v-flashx",
    # --- other  
    "autoglm-phone",  
]

# GLM-Image: https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%9B%BE%E5%83%8F%E7%94%9F%E6%88%90
LIST_IMAGE_GENERATION_MODELS = [
    "glm-image",
    "cogview-4-250304",
    "cogview-4",
    "cogview-3-flash"
]

# GLM-Video: https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90%E5%BC%82%E6%AD%A5#cogvideox
LIST_VIDEO_GENERATION_MODELS = [
    "cogvideox-3",
    "cogvideox-2",
    "cogvideox-flash",
]

def getConfigData():
    # Directory node and config file
    dir_node = os.path.dirname(__file__)
    config_path = os.path.join(os.path.abspath(dir_node), "config.json")
    config = {
                "__comment": "Register on the site https://bigmodel.cn and get a key and add it to the field ZHIPUAI_API_KEY. Change default translate languages ​​'from' and 'to' you use",
                "from_translate": "ru",
                "to_translate": "en",
                "default_language_model": "glm-4.5-flash",
                "default_multimodal_model": "glm-4.6v-flash",
                "default_image_generate_model": "cogview-3-flash",  
                "default_video_generate_model": "cogvideox-flash",  
                "ZHIPUAI_API_KEY": "your_api_key"
            }

    # Load config.js file
    if not os.path.exists(config_path):
        print("[ChatGLMNode] File config.js file not found! Create default config.json...")
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=4)
            return config
    else:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config
        # =====

def checkPropValue(obj, key, not_include = []):
    checkVal = lambda v: v is None or v.strip() == "" or v in not_include

    prop_val = obj.get(key)

    if checkVal(prop_val):
        obj.update(getConfigData())
        return True if checkVal(obj.get(key)) else False

    else:
        return False


CONFIG = getConfigData()

def createRequest(payload, generate = "text", method = "POST", params = {}):
    global CONFIG

    if checkPropValue(CONFIG, "ZHIPUAI_API_KEY", ["your_api_key"]):
        raise ValueError("ZHIPUAI_API_KEY value is empty or missing")

    ZHIPUAI_API_KEY = CONFIG.get("ZHIPUAI_API_KEY")

    # Headers
    headers = {
        "Authorization": f"Bearer {ZHIPUAI_API_KEY}",
        "Content-Type": "application/json",
    }

    if generate == "image":
        endpoint = ENDPOINT_IMAGE_URL
    elif generate == "video":
        endpoint = ENDPOINT_VIDEO_URL
        headers.update({'Accept-Language': "en-US,en"})
    elif generate == "video-check":      
        endpoint = ENDPOINT_VIDEO_CHECK_URL + params["id"]
        headers.update({'Accept-Language': "en-US,en"})
    else:
        endpoint = ENDPOINT_URL

    try:
        response = requests.post(endpoint, headers=headers, json=payload) if method == "POST" else requests.get(endpoint, headers=headers)
        response.raise_for_status()

        if response.status_code == 200:
            json_data = response.json()
            
            if generate == "text":
                return json_data.get("choices")[0]["message"]["content"].strip()
            elif generate == "image":
                return json_data.get("data")[0]["url"]
            elif generate == "video" or generate == "video-check":
                return json_data

    except requests.HTTPError as e:
        print(f"Error request ChatGLM: {response.status_code}, {response.text}")
        raise e
    except Exception as e:
        print(f"Error ChatGLM: {e}")
        raise e


def translate(prompt, srcTrans, toTrans, model, max_tokens, temperature, top_p):
    # Check prompt exist
    if prompt is None or prompt.strip() == "":
        return ""

    # Create body request
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": f"Translate from {srcTrans} to {toTrans} and return only the translated text: {prompt}",
            },
        ],
        "max_tokens": round(max_tokens, 2),
        "temperature": round(temperature, 2),
        "top_p": round(top_p, 2),
    }

    response_translate_text = createRequest(payload)

    return response_translate_text


class ChatGLM4TranslateCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        from_lng = CONFIG.get("from_translate") if CONFIG.get("from_translate") in ALL_CODES_LANGS else "ru"
        to_lng = CONFIG.get("to_translate") if CONFIG.get("to_translate") in ALL_CODES_LANGS else "en"
        return {
            "required": {
                "from_translate": (
                    ALL_CODES_LANGS,
                    {"default": from_lng, "tooltip": "Translation from"},
                ),
                "to_translate": (
                    ALL_CODES_LANGS,
                    {"default": to_lng, "tooltip": "Translation to"},
                ),
                "model": (
                    LIST_LANGUAGE_MODELS,
                    {
                        "default": CONFIG.get("default_language_model", "glm-4.5-flash"),
                        "tooltip": "The model code to be called. Models with text 'flash' should be free!",
                    },
                ),
                "max_tokens": (
                    "INT",
                    {
                        "default": 1024,
                        "tooltip": "The maximum number of tokens for model output, maximum output is 4095, default value is 1024.",
                    },
                ),
                "temperature": (
                    "FLOAT",
                    {
                        "default": 0.95,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.01,
                        "tooltip": "Sampling temperature, controls the randomness of the output, must be a positive number within the range: [0.0, 1.0], default value is 0.95.",
                    },
                ),
                "top_p": (
                    "FLOAT",
                    {
                        "default": 0.7,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.01,
                        "tooltip": "Another method of temperature sampling, value range is: [0.0, 1.0], default value is 0.7.",
                    },
                ),
                "text": ("STRING", {"multiline": True, "placeholder": "Input text"}),
                "clip": ("CLIP",),
            }
        }

    RETURN_TYPES = (
        "CONDITIONING",
        "STRING",
    )
    FUNCTION = "chatglm_translate_text"
    DESCRIPTION = (
        "This is a node that translates the prompt into another language using ChatGLM."
    )
    CATEGORY = "AlekPet Nodes/conditioning"

    def chatglm_translate_text(
        self,
        from_translate,
        to_translate,
        model,
        max_tokens,
        temperature,
        top_p,
        text,
        clip,
    ):

        text = translate(
            text, from_translate, to_translate, model, max_tokens, temperature, top_p
        )
        tokens = clip.tokenize(text)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], text)


class ChatGLM4TranslateTextNode(ChatGLM4TranslateCLIPTextEncodeNode):
    @classmethod
    def INPUT_TYPES(self):
        return_types = super().INPUT_TYPES()
        del return_types["required"]["clip"]
        return return_types

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "chatglm_translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def chatglm_translate_text(
        self, from_translate, to_translate, model, max_tokens, temperature, top_p, text
    ):

        text = translate(
            text, from_translate, to_translate, model, max_tokens, temperature, top_p
        )

        return (text,)


# ChatGLM Instruct Node
class ChatGLM4InstructNode:
    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "model": (
                    LIST_LANGUAGE_MODELS,
                    {
                        "default": CONFIG.get("default_language_model", "glm-4.5-flash"),
                        "tooltip": "The model code to be called. Models with text 'flash' should be free!",
                    },
                ),
                "max_tokens": (
                    "INT",
                    {
                        "default": 1024,
                        "tooltip": "The maximum number of tokens for model output, maximum output is 4095, default value is 1024.",
                    },
                ),
                "temperature": (
                    "FLOAT",
                    {
                        "default": 0.95,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.01,
                        "tooltip": "Sampling temperature, controls the randomness of the output, must be a positive number within the range: [0.0, 1.0], default value is 0.95.",
                    },
                ),
                "top_p": (
                    "FLOAT",
                    {
                        "default": 0.7,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.01,
                        "tooltip": "Another method of temperature sampling, value range is: [0.0, 1.0], default value is 0.7.",
                    },
                ),
                "instruct": (
                    "STRING",
                    {
                        "multiline": True,
                        "placeholder": "Input instruct text",
                        "default": "Generate details text, without quotation marks or the word 'prompt' on english: {query}",
                        "tooltip": "Enter the instruction for the neural network to execute and indicate where to insert the query text {query}",
                    },
                ),
                "query": (
                    "STRING",
                    {
                        "multiline": True,
                        "placeholder": "Enter the query text for the instruction",
                        "tooltip": "Query field",
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "chatglm_instruct"

    CATEGORY = "AlekPet Nodes/Instruct"

    def chatglm_instruct(self, model, max_tokens, temperature, top_p, instruct, query):

        if instruct is None or instruct.strip() == "":
            raise ValueError("Instruct text is empty!")

        if query is None or query.strip() == "":
            raise ValueError("Query text is empty!")

        instruct = instruct.replace("{query}", query)

        # Create body request
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": instruct,
                },
            ],
            "max_tokens": round(max_tokens, 2),
            "temperature": round(temperature, 2),
            "top_p": round(top_p, 2),
        }

        answer = createRequest(payload)

        return (answer,)


# ChatGLM Instruct Media Node
def toBase64ImgUrl(img):
    bytesIO = BytesIO()
    img.save(bytesIO, format="PNG")
    img_types = bytesIO.getvalue()
    img_base64 = base64.b64encode(img_types)
    return f"data:image/png;base64,{img_base64.decode('utf-8')}"


class ChatGLM4InstructMediaNode:
    @classmethod
    def INPUT_TYPES(self):
        return {
            "optional": {
                "image": ("IMAGE",),
                # "video": ("STRING", {"forceInput": True, "default": ""}),
            },
            "required": {
                "model": (
                    LIST_MULTIMODAL_MODELS,
                    {
                        "default": CONFIG.get("default_multimodal_model", "glm-4.6v-flash"),
                        "tooltip": "The model code to be called. Models with text 'flash' should be free!",
                    },
                ),
                "max_tokens": (
                    "INT",
                    {
                        "default": 1024,
                        "tooltip": "The maximum number of tokens for model output, maximum output is 4095, default value is 1024.",
                    },
                ),
                "temperature": (
                    "FLOAT",
                    {
                        "default": 0.8,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.01,
                        "tooltip": "Sampling temperature, controls the randomness of the output, must be a positive number within the range: [0.0, 1.0], default value is 0.95.",
                    },
                ),
                "top_p": (
                    "FLOAT",
                    {
                        "default": 0.6,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.01,
                        "tooltip": "Another method of temperature sampling, value range is: [0.0, 1.0], default value is 0.7.",
                    },
                ),
                "instruct": (
                    "STRING",
                    {
                        "multiline": True,
                        "placeholder": "Input instruct text",
                        "default": "What is shown in the picture?",
                        "tooltip": "Enter the instruction for the neural network",
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "chatglm_instruct_media"

    CATEGORY = "AlekPet Nodes/Instruct"

    def chatglm_instruct_media(
        self, model, max_tokens, temperature, top_p, instruct, image=None, video=""
    ):

        if instruct is None or instruct.strip() == "":
            raise ValueError("Instruct text is empty!")

        # video = video.strip()

        # if image is None and (video is None and video == ""):
        #     raise ValueError("Image or Video path is empty!")

        if image is not None:
            if video != "":
                raise ValueError("You cannot use both an image and a video at the same time!")           

        answer = ""
        payload = {}
        if image is not None:
            img = 255.0 * image.cpu().numpy()
            img = np.squeeze(img)
            img = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
            img = toBase64ImgUrl(img)

            # Create body request for image
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": img}},
                            {"type": "text", "text": instruct},
                        ],
                    }
                ],
                "max_tokens": round(max_tokens, 2),
                "temperature": round(temperature, 2),
                "top_p": round(top_p, 2),
            }

        # if video:
        #     # Create body request for video
        #     address = PromptServer.instance.address
        #     port = PromptServer.instance.port
        #     url_video = f"http://{address}:{port}/view?filename={video}&type=input&subfolder="

        #     payload = {
        #         "model": model,
        #         "messages": [
        #             {
        #                 "role": "user",
        #                 "content": [
        #                     {"type": "video_url", "video_url": {"url": url_video}},
        #                     {"type": "text", "text": instruct},
        #                 ],
        #             }
        #         ],
        #         "max_tokens": round(max_tokens, 2),
        #         "temperature": round(temperature, 2),
        #         "top_p": round(top_p, 2),
        #     }

        answer = createRequest(payload)

        return (answer,)

# Generate Image & Video nodes
IMAGE_SUPPORTS_RESOLUTIONS = ["720x1440", "768x1344", "864x1152", "960x1728", "1024x1024", "1056x1568", "1088x1472", "1152x864", "1280x1280", "1344x768", "1440x720", "1472x1088", "1568x1056", "1728x960"]
VIDEO_SUPPORTS_RESOLUTIONS = ["720x1280", "1024x1024", "1080x1920", "1280x720", "1920x1080", "2048x1080", "3840x2160"]


# List sizes to str
def getStrListSizes(list_values, indexVal):
    return ", ".join(map(str, sorted(int(w.split("x")[indexVal]) for w in list_values)))


# Function set correct size value
def setCorrectSize(value, minMax, nodeName):
    if type(value) == str:
        value = int(value)
        
    if value < minMax[0]:
        value = minMax[0]
        print(f"[{nodeName}] The value is less than {minMax[0]}, we set it to the correct value {minMax[0]}.")
    elif value > minMax[1]:
        value = minMax[1]
        print(f"[{nodeName}] The value is greater than {minMax[1]}, we set it to the correct value {minMax[1]}.")

    return value


# -------- Image generate -------- 
class ChatGLMImageGenerateNode:
    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "model": (
                    LIST_IMAGE_GENERATION_MODELS,
                    {
                        "default": CONFIG.get("default_image_generate_model", "cogview-3-flash"),
                        "tooltip": "The model code to be called. Models with text 'flash' should be free!",
                    },
                ),
                "prompt": (
                    "STRING",
                    {
                        "multiline": True,
                        "placeholder": "Input prompt text",
                        "default": "",
                        "tooltip": "Enter the prompt for generated image",
                    },
                ),
            },
            "optional": {
                "quality": (
                    ["standard", "hd"],
                    {
                        "default": "standard",
                        "tooltip": "Image generation quality, default is 'standard'. This parameter is only supported by cogview-4-250304 and 'glm-image' model supports only HD",
                    },
                ),
                "width": ("INT", {"default": 1024, "tooltip":f"Image width, default value 1024. Recommended width values: {getStrListSizes(IMAGE_SUPPORTS_RESOLUTIONS, 0)}."}),
                "height": ("INT", {"default": 1024, "tooltip":f"Image height, default value 1024. Recommended height values: {getStrListSizes(IMAGE_SUPPORTS_RESOLUTIONS, 1)}."}),
                "watermark_enabled": ("BOOLEAN", {"default": True, "tooltip": "Add watermark, default: True. Watermark off allow only customers who have signed a disclaimer to use the service. Signature path: Personal Center>Security Management>Remove Watermark Management"},),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "image_generate"
    DESCRIPTION = (
        "This is a node that generates an image based on a text prompt."
    )
    CATEGORY = "AlekPet Nodes/image"

    def image_generate(self, model, prompt, quality="standard", width=1024, height=1024, watermark_enabled=True):
        if prompt is None and not prompt.strip():
            raise ValueError("Prompt value is empty!")

        width = setCorrectSize(width, [512, 2048], "ChatGMLImageGenerateNode")
        height = setCorrectSize(height, [512, 2048], "ChatGMLImageGenerateNode")    

        size = f"{width}x{height}"

        if model == "glm-image" and quality != "hd":
            quality = "hd"

        # Create body request
        payload = {
            "model": model,
            "prompt": prompt,
            "quality": quality,
            "size": size,
            "watermark_enabled": watermark_enabled,
        }

        image_url = createRequest(payload, "image")
        response = requests.get(image_url)
        img = node_helpers.pillow(Image.open, BytesIO(response.content))

        output_images = []
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
            output_images.append(image)

        if len(output_images) > 1 and img.format not in excluded_formats:
            output_image = torch.cat(output_images, dim=0)
        else:
            output_image = output_images[0]

        return (output_image,)


# -------- Video generate -------- 
async def execute_gen_video(model, prompt, image, quality, with_audio, watermark, width, height, fps, duration):

    width = setCorrectSize(width, [480, 3840], "ChatGMLVideoGenerateNode")
    height = setCorrectSize(height, [480, 3840], "ChatGMLVideoGenerateNode")    

    size = f"{width}x{height}"

    # Create body request
    payload = {
        "model": model,
        "prompt": prompt,
        "quality": quality,
        "watermark_enabled": watermark,
        "with_audio": with_audio,
        "size": size,
        "fps": int(fps),
        "duration": int(duration),
    }

    if image is not None:
        img = 255.0 * image.cpu().numpy()
        img = np.squeeze(img)
        img = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
        img = toBase64ImgUrl(img)
        # Add to payload
        payload.update({"image_url": img})


    video_task = createRequest(payload, "video")

    # Data task generate video
    idTask = video_task.get("id")

    if not idTask or not idTask.strip():
        raise ValueError("Video get result task fail! Video generate task ID is not valid!")

    video_generated = None
    for _ in range(400):
        check_video_task = createRequest(payload, "video-check", "GET", {"id": idTask})
        task_status = check_video_task.get("task_status")

        if task_status == "SUCCESS":
            video_generated = check_video_task.get("video_result")
            break

        elif task_status == "FAIL":
            raise ValueError("The video generation task failed!")

        time.sleep(0.3)
        
    if video_generated is None or not len(video_generated):
        raise ValueError("Genereated video is not valid!")

    return await download_url_to_video_output(str(video_generated[0]["url"]))

class ChatGLMVideoGenerateNode:
    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "model": (
                    LIST_VIDEO_GENERATION_MODELS,
                    {
                        "default": CONFIG.get("default_video_generate_model", "cogvideox-3"),
                        "tooltip": "The model code to be called. Models with text 'flash' should be free!",
                    },
                ),
                "prompt": (
                    "STRING",
                    {
                        "multiline": True,
                        "placeholder": "Input prompt text",
                        "default": "",
                        "tooltip": "Enter the prompt for generated image",
                    },
                ),
            },
            "optional": {
                "image": ("IMAGE",),
                "quality": (
                    ["speed", "quality"],
                    {
                        "default": "speed",
                        "tooltip": "Output mode, defaults to speed. quality: Quality priority, generates higher quality output. speed: Speed ​​priority, generates faster output, but with slightly lower quality.",
                    },
                ),
                "with_audio": ("BOOLEAN", {"default": False, "tooltip": "Whether to generate AI sound effects. Default: False (do not generate sound effects)."},),
                "watermark": ("BOOLEAN", {"default": True, "tooltip": "Add watermark, default: True. Watermark off allow only customers who have signed a disclaimer to use the service. Signature path: Personal Center>Security Management>Remove Watermark Management"},),
                "width": ("INT", {"default": 1920, "tooltip":f"Video width, default value 1920. Recommended width values: {getStrListSizes(VIDEO_SUPPORTS_RESOLUTIONS, 0)}"}),
                "height": ("INT", {"default": 1080, "tooltip":f"Video height, default value 1080. Recommended height values: {getStrListSizes(VIDEO_SUPPORTS_RESOLUTIONS, 1)}"}),
                "fps": ([30, 60], {"default": 30, "tooltip":"Video frame rate (FPS), default value is 30 frame rate"}),
                "duration": ([5, 10], {"default": 5, "tooltip":"Video duration, default is 5 seconds"}),
            }
        }

    RETURN_TYPES = ("VIDEO",)
    FUNCTION = "video_generate"
    DESCRIPTION = (
        "This is a node that generates an video based on a text prompt or image."
    )
    CATEGORY = "AlekPet Nodes/video"

    async def video_generate(self, model, prompt, image=None, quality="speed", with_audio=False, watermark=True, width=1920, height=1080, fps=30, duration=5):
        if prompt is None and not prompt.strip():
            raise ValueError("Prompt value is empty!")

        return (await execute_gen_video(model, prompt, image, quality, with_audio, watermark, width, height, fps, duration),)