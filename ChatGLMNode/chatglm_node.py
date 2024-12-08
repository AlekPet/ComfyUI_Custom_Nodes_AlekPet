import os
import json
import requests

import base64
from io import BytesIO
import numpy as np
from server import PromptServer
from PIL import Image

ALL_CODES_LANGS = ['af', 'sq', 'am', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'be', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lg', 'lb', 'mk', 'mai', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mni-Mtei', 'lus', 'mn', 'my', 'ne', 'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro', 'ru', 'sm', 'sa', 'gd', 'nso', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu']


ENDPOINT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

ZHIPUAI_API_KEY = None

# Directory node and config file
dir_node = os.path.dirname(__file__)
config_path = os.path.join(os.path.abspath(dir_node), "config.json")

# Load config.js file
if not os.path.exists(config_path):
    print("File config.js file not found! Reinstall extensions!")
else:
    with open(config_path, "r") as f:
        CONFIG = json.load(f)

        # GET ZHIPUAI_API_KEY from json
        ZHIPUAI_API_KEY = CONFIG.get("ZHIPUAI_API_KEY")
    # =====


def createRequest(payload):
    global ZHIPUAI_API_KEY

    if (
        ZHIPUAI_API_KEY is None
        or ZHIPUAI_API_KEY.strip() == ""
        or ZHIPUAI_API_KEY == "your_api_key"
    ):
        raise ValueError("ZHIPUAI_API_KEY value is empty or missing")

    # Headers
    headers = {
        "Authorization": f"Bearer {ZHIPUAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(ENDPOINT_URL, headers=headers, json=payload)
        response.raise_for_status()

        if response.status_code == 200:
            json_data = response.json()
            response_text = json_data.get("choices")[0]["message"]["content"].strip()

            return response_text

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
                "content": f"Translate from {srcTrans} to {toTrans}: {prompt}",
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
        return {
            "required": {
                "from_translate": (
                    ALL_CODES_LANGS,
                    {"default": "ru", "tooltip": "Translation from"},
                ),
                "to_translate": (
                    ALL_CODES_LANGS,
                    {"default": "en", "tooltip": "Translation to"},
                ),
                "model": (
                    [
                        "glm-4-plus",
                        "glm-4-0520",
                        "glm-4",
                        "glm-4-air",
                        "glm-4-airx",
                        "glm-4-long",
                        "glm-4-flash",
                    ],
                    {
                        "default": "glm-4-flash",
                        "tooltip": "The model code to be called. Model 'glm-4-flash' is free!",
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
                    [
                        "glm-4-plus",
                        "glm-4-0520",
                        "glm-4",
                        "glm-4-air",
                        "glm-4-airx",
                        "glm-4-long",
                        "glm-4-flash",
                    ],
                    {
                        "default": "glm-4-flash",
                        "tooltip": "The model code to be called. Model 'glm-4-flash' is free!",
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
                    [
                        "glm-4v-flash",
                        "glm-4v",
                        "glm-4v-plus",
                    ],
                    {
                        "default": "glm-4v-flash",
                        "tooltip": "The model code to be called. Model 'glm-4v-flash' is free!",
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
        # self, model, max_tokens, temperature, top_p, instruct, image=None, video=""
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
                            {"type": "text", "text": "What is shown in the picture?"},
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
        #                     {"type": "text", "text": "Describe this video"},
        #                 ],
        #             }
        #         ],
        #         "max_tokens": round(max_tokens, 2),
        #         "temperature": round(temperature, 2),
        #         "top_p": round(top_p, 2),
        #     }

        answer = createRequest(payload)

        return (answer,)
