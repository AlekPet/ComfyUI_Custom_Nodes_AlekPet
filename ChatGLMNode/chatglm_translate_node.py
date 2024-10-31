import os
import json
import requests

ALL_CODES_LANGS = ['af', 'sq', 'am', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'be', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lg', 'lb', 'mk', 'mai', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mni-Mtei', 'lus', 'mn', 'my', 'ne', 'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro', 'ru', 'sm', 'sa', 'gd', 'nso', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu']

ZHIPUAI_API_KEY = None
ENDPOINT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"


# Directory translate node and config file
dir_translate_node = os.path.dirname(__file__)
config_path = os.path.join(os.path.abspath(dir_translate_node), "config.json")

# Load config.js file
if not os.path.exists(config_path):
    print("File config.js file not found! Reinstall extensions!")
else:
    with open(config_path, "r") as f:
        CONFIG = json.load(f)

        # GET ZHIPUAI_API_KEY from json
        ZHIPUAI_API_KEY = CONFIG.get("ZHIPUAI_API_KEY")
# =====


def translate(prompt, srcTrans, toTrans, model, max_tokens, temperature, top_p):
    if prompt and prompt.strip() != "":

        # Create body request
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": f"Translate from {srcTrans} to {toTrans}: {prompt}",
                },
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
        }

        # Header
        headers = {
            "Authorization": f"Bearer {ZHIPUAI_API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(ENDPOINT_URL, headers=headers, json=payload)
            response.raise_for_status()

            if response.status_code == 200:
                json_data = response.json()
                translate_text_prompt = json_data.get("choices")[0]["message"][
                    "content"
                ].strip()

                return (
                    translate_text_prompt if translate_text_prompt and not None else ""
                )

        except requests.HTTPError as e:
            print(
                f"Error translate text ChatGLM: {response.status_code}, {response.text}"
            )
            raise e
        except Exception as e:
            print(f"Error translate text ChatGLM: {e}")
            raise e


class ChatGLM4TranslateCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "from_translate": (ALL_CODES_LANGS, {"default": "ru", "tooltip": "Translation from"}),
                "to_translate": (ALL_CODES_LANGS, {"default": "en", "tooltip": "Translation to"}),
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
                    {"default": "glm-4-flash", "tooltip": "The model code to be called. Model 'glm-4-flash' is free!"},
                ),
                "max_tokens": ("INT", {"default": 1024, "tooltip": "The maximum number of tokens for model output, maximum output is 4095, default value is 1024."}),
                "temperature": (
                    "FLOAT",
                    {"default": 0.95, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "Sampling temperature, controls the randomness of the output, must be a positive number within the range: [0.0, 1.0], default value is 0.95."},
                ),
                "top_p": (
                    "FLOAT",
                    {"default": 0.7, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "Another method of temperature sampling, value range is: [0.0, 1.0], default value is 0.7."},
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
        if ZHIPUAI_API_KEY is None or ZHIPUAI_API_KEY.strip() == "" or ZHIPUAI_API_KEY == "your_api_key":
            raise ValueError("ZHIPUAI_API_KEY value is empty or missing")

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
        if ZHIPUAI_API_KEY is None or ZHIPUAI_API_KEY.strip() == "" or ZHIPUAI_API_KEY == "your_api_key":
            raise ValueError("ZHIPUAI_API_KEY value is empty or missing")

        text = translate(
            text, from_translate, to_translate, model, max_tokens, temperature, top_p
        )

        return (text,)
