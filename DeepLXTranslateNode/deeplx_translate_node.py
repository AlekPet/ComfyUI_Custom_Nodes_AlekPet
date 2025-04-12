import os
import json
import requests
from server import PromptServer


LANGUAGES_CODES = {
    "source": {
        "Arabic": "AR",
        "Bulgarian": "BG",
        "Czech": "CS",
        "Danish": "DA",
        "German": "DE",
        "Greek": "EL",
        "English (all English variants)": "EN",
        "Spanish": "ES",
        "Estonian": "ET",
        "Finnish": "FI",
        "French": "FR",
        "Hungarian": "HU",
        "Indonesian": "ID",
        "Italian": "IT",
        "Japanese": "JA",
        "Korean": "KO",
        "Lithuanian": "LT",
        "Latvian": "LV",
        "Norwegian Bokmål": "NB",
        "Dutch": "NL",
        "Polish": "PL",
        "Portuguese (all Portuguese variants)": "PT",
        "Romanian": "RO",
        "Russian": "RU",
        "Slovak": "SK",
        "Slovenian": "SL",
        "Swedish": "SV",
        "Turkish": "TR",
        "Ukrainian": "UK",
        "Chinese (all Chinese variants)": "ZH",
    },
    "target": {
        "Arabic": "AR",
        "Bulgarian": "BG",
        "Czech": "CS",
        "Danish": "DA",
        "German": "DE",
        "Greek": "EL",
        "English": "EN",
        "English (British)": "EN-GB",
        "English (American)": "EN-US",
        "Spanish": "ES",
        "Estonian": "ET",
        "Finnish": "FI",
        "French": "FR",
        "Hungarian": "HU",
        "Indonesian": "ID",
        "Italian": "IT",
        "Japanese": "JA",
        "Korean": "KO",
        "Lithuanian": "LT",
        "Latvian": "LV",
        "Norwegian Bokmål": "NB",
        "Dutch": "NL",
        "Polish": "PL",
        "Portuguese": "PT",
        "Portuguese (Brazilian)": "PT-BR",
        "Portuguese (all Portuguese variants excluding Brazilian Portuguese)": "PT-PT",
        "Romanian": "RO",
        "Russian": "RU",
        "Slovak": "SK",
        "Slovenian": "SL",
        "Swedish": "SV",
        "Turkish": "TR",
        "Ukrainian": "UK",
        "Chinese": "ZH",
        "Chinese (simplified)": "ZH-HANS",
        "Chinese (traditional)": "ZH-HANT",
    },
}

DEEPLX_SERVICE_URL = "http://127.0.0.1:1188/translate"

# Directory node and config file
# dir_node = os.path.dirname(__file__)
# config_path = os.path.join(os.path.abspath(dir_node), "config.json")

# # Load config.js file
# if not os.path.exists(config_path):
#     print("File config.js file not found! Reinstall extensions!")
# else:
#     with open(config_path, "r") as f:
#         CONFIG = json.load(f)

#         # Get data from json
#     # =====


def createRequest(payload):
    try:
        response = requests.post(DEEPLX_SERVICE_URL, json=payload)
        response.raise_for_status()

        if response.status_code == 200:
            json_data = response.json()
            response_text = json_data.get("data").strip()

            return response_text

    except requests.HTTPError as e:
        print(f"Error request to DeepLX: {response.status_code}, {response.text}")
        raise e
    except Exception as e:
        print(f"Error DeepLX: {e}")
        raise e


def translate(prompt, srcTrans, toTrans):
    # Check prompt exist
    if prompt is None or prompt.strip() == "":
        return ""

    # Create body request
    payload = {"source_lang": srcTrans, "target_lang": toTrans, "text": prompt}

    response_translate_text = createRequest(payload)

    return response_translate_text


class DeepLXTranslateCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "source_translate": (
                    LANGUAGES_CODES.get("source").keys(),
                    {"default": "Russian", "tooltip": "Translation source"},
                ),
                "target_translate": (
                    LANGUAGES_CODES.get("target").keys(),
                    {
                        "default": "English (all English variants)",
                        "tooltip": "Translation target",
                    },
                ),
                "prompt": (
                    "STRING",
                    {"multiline": True, "placeholder": "Input prompt text"},
                ),
                "clip": ("CLIP",),
            }
        }

    RETURN_TYPES = (
        "CONDITIONING",
        "STRING",
    )
    FUNCTION = "deeplx_translate_text"
    DESCRIPTION = (
        "This is a node that translates the prompt into another language using DeepLX."
    )
    CATEGORY = "AlekPet Nodes/conditioning"

    def deeplx_translate_text(
        self,
        source_translate,
        target_translate,
        prompt,
        clip,
    ):

        prompt = translate(
            prompt,
            source_translate,
            target_translate,
        )

        tokens = clip.tokenize(prompt)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], prompt)


class DeepLXTranslateTextNode(DeepLXTranslateCLIPTextEncodeNode):
    @classmethod
    def INPUT_TYPES(self):
        return_types = super().INPUT_TYPES()
        del return_types["required"]["clip"]
        return return_types

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "deeplx_translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def deeplx_translate_text(self, source_translate, target_translate, prompt):

        prompt = translate(prompt, source_translate, target_translate)

        return (prompt,)
