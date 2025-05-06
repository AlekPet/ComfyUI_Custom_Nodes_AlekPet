# Title: DeepLX Translate promts nodes
# Author: AlekPet (https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet)
# Github DeepLX: https://github.com/OwO-Network/DeepLX

import os
import json
import subprocess
import requests
import time
from . import install_deeplx


LANGUAGES_CODES = {
    "source": {
        "Arabic": "AR",
        "Bulgarian": "BG",
        "Czech": "CS",
        "Danish": "DA",
        "German": "DE",
        "Greek": "EL",
        "English": "EN",
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
        "Romanian": "RO",
        "Russian": "RU",
        "Slovak": "SK",
        "Slovenian": "SL",
        "Swedish": "SV",
        "Turkish": "TR",
        "Ukrainian": "UK",
        "Chinese": "ZH",
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
        "Chinese (simplified)": "ZH-HANS",
        "Chinese (traditional)": "ZH-HANT",
    },
}


# Colors
class ColPrint:
    RED = "\033[1;31;40m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    MAGNETA = "\033[95m"
    BLUE = "\033[94m"
    CLEAR = "\033[0m"


# Node directory
NODE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS = {}

# Directory node and config file
config_path = os.path.join(NODE_DIR, "config.json")

# Load config.js file
if not os.path.exists(config_path):
    print(
        f"{ColPrint.YELLOW}[DeepLXTranslateNode] {ColPrint.MAGNETA}File config.js file not found! Create default!{ColPrint.CLEAR}"
    )

    with open(config_path, "w", encoding="utf-8") as f:
        defaultJSON = {
            "settings": {
                "__commnet": "Please check the list of available languages ​​before specifying, especially target_lang! See README file",
                "source_lang": "Russian",
                "target_lang": "English",
            }
        }
        json.dump(defaultJSON, f, ensure_ascii=False, indent=4)

else:
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
        SETTINGS = config.get("settings", {})

        if SETTINGS.keys():
            reset_lang = False
            source_lang = SETTINGS.get("source_lang")
            target_lang = SETTINGS.get("target_lang")

            if source_lang not in LANGUAGES_CODES["source"]:
                SETTINGS.update({"source_lang": "Russian"})
                reset_lang = True

            if target_lang not in LANGUAGES_CODES["target"]:
                SETTINGS.update({"target_lang": "English"})
                reset_lang = True

            if reset_lang:
                print(
                    f"{ColPrint.YELLOW}[DeepLXTranslateNode]{ColPrint.MAGNETA} Source or target language not found in list of available languages, check config.js!{ColPrint.CLEAR}"
                )


# DeepLX and go constants
DEEPLX_SERVER_RUNNING = False
DEEPLX_SERVER_URL = "http://127.0.0.1:1188/"
DEEPLX_SERVER_URL_TRANSLATE = "http://127.0.0.1:1188/translate"
RETRY_CHECK_SERVER = 10

PATH_TO_DEEPLX_SERVER = os.path.join(NODE_DIR, "DeepLX")
PATH_TO_GO = os.path.join(NODE_DIR, "go", "bin")

### Automatical install Golang (Go) and DeepLX ###
try:
    # Checking exists path to Go and install Golang (Go)
    if not os.path.exists(PATH_TO_GO):
        print(f"{ColPrint.YELLOW}[DeepLXTranslateNode]{ColPrint.MAGNETA} Path to 'Golang (Go)' not exists, try install...{ColPrint.CLEAR}")
        
        # Get platform
        platform = install_deeplx.getPlatform()

        if platform is not None:       
            print(f"{ColPrint.YELLOW}[DeepLXTranslateNode]{ColPrint.GREEN} Your platform is: {'macOS (Darwin)' if platform == 'darwin' else platform.capitalize()}{ColPrint.CLEAR}")
            # Get link
            go_url = install_deeplx.GO_URLS[platform]

            # Download file
            file_name, path_to_file = install_deeplx.download(go_url, NODE_DIR)

            # Extract file
            install_deeplx.extractArchive(path_to_file)
        else:
            print(f"{ColPrint.RED}[DeepLXTranslateNode] Unable to determine identifying the underlying platform! Use manual installation!{ColPrint.CLEAR} ")


    # # Checking exists path to Go and install DeepLX
    if not os.path.exists(PATH_TO_DEEPLX_SERVER):
        print(
            f"{ColPrint.YELLOW}[DeepLXTranslateNode]{ColPrint.MAGNETA} Path to DeepLX server folder not exists, try install...{ColPrint.CLEAR}")
            
        # Get link
        deeplx_url = install_deeplx.FILES_DOWNLOAD["DeepLX"].get("url")
    
        # Download file
        file_name, path_to_file = install_deeplx.download(deeplx_url, NODE_DIR)

        # Extract file
        install_deeplx.extractArchive(path_to_file)

        # Rename DeepLX-master to DeepLX
        install_deeplx.otherOperations("DeepLX", NODE_DIR)          

except Exception as e:
    raise e



### end - Automatical install Golang (Go) and DeepLX ###

# Checking pathes variables
if not os.path.exists(PATH_TO_GO):
    raise FileNotFoundError(f"Error path to 'Golang (Go)' not exists: {PATH_TO_GO}")    


if not os.path.exists(PATH_TO_DEEPLX_SERVER):
    raise FileNotFoundError(f"Error path to DeepLX server folder not exists: {PATH_TO_DEEPLX_SERVER}")


# Detect platform
go_executable = os.path.join(PATH_TO_GO, "go")
if os.name == "nt":
    go_executable += ".exe"

# Try run DeepLX server
try:
    print(f"{ColPrint.YELLOW}[DeepLXTranslateNode] {ColPrint.BLUE}Running server DeepLX...{ColPrint.CLEAR}")
    proc_deeplx = subprocess.Popen([go_executable, "run", "main.go"], cwd=PATH_TO_DEEPLX_SERVER)
    DEEPLX_SERVER_RUNNING = True
    time.sleep(2)

except Exception as e:
    DEEPLX_SERVER_RUNNING = False
    raise Exception(
        f"{ColPrint.RED}[DeepLXTranslateNode] Error running server DeepLX: {ColPrint.MAGNETA}{e}{ColPrint.CLEAR}"
    )

if DEEPLX_SERVER_RUNNING:
    for retry in range(RETRY_CHECK_SERVER, 0, -1):
        print(
            f"{ColPrint.YELLOW}[DeepLXTranslateNode] {ColPrint.BLUE}Checking DeepLX server. Attempt {retry}...{ColPrint.CLEAR}"
        )

        try:
            response = requests.get(DEEPLX_SERVER_URL)
            response.raise_for_status()

            print(
                f"{ColPrint.YELLOW}[DeepLXTranslateNode]{ColPrint.GREEN} Server responded successfully: {ColPrint.CLEAR}",
                response.text,
            )
            DEEPLX_SERVER_RUNNING = True
            break

        except requests.HTTPError as e:
            print(
                f"{ColPrint.RED}[DeepLXTranslateNode] HTTP error while connecting to DeepLX: {ColPrint.MAGNETA}{e}{ColPrint.CLEAR}"
            )
            if retry == 1:
                DEEPLX_SERVER_RUNNING = False
                raise

        except Exception as e:
            if retry == 1:
                DEEPLX_SERVER_RUNNING = False
                raise Exception(
                    f"{ColPrint.RED}[DeepLXTranslateNode] Unexpected error while checking DeepLX server: {ColPrint.MAGNETA}{e}{ColPrint.CLEAR}"
                )

        time.sleep(2)

    else:
        DEEPLX_SERVER_RUNNING = False
        print(
            f"{ColPrint.RED}[DeepLXTranslateNode] All attempts to reach the DeepLX server have failed.{ColPrint.CLEAR}"
        )


def createRequest(payload):
    """Request function"""
    try:
        response = requests.post(DEEPLX_SERVER_URL_TRANSLATE, json=payload)
        response.raise_for_status()

        if response.status_code == 200:
            json_data = response.json()
            response_text = json_data.get("data").strip()

            return response_text

    except requests.HTTPError as e:
        print(
            f"DeepLX server is not running! Please check Go and DeepLX repository installation or information in the ComfyUI terminal!: {response.status_code}, {response.text}"
        )
        raise e
    except Exception as e:
        print(f"Error DeepLX: {e}")
        raise e


def translate(prompt, source, target):
    """Translate function"""
    # Check prompt exist
    if prompt is None or prompt.strip() == "":
        return ""

    # Create body request
    payload = {"source_lang": source, "target_lang": target, "text": prompt}

    response_translate_text = createRequest(payload)

    return response_translate_text


class DeepLXTranslateCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        source_langs = list(LANGUAGES_CODES.get("source").keys())
        target_langs = list(LANGUAGES_CODES.get("target").keys())

        return {
            "required": {
                "source_translate": (
                    source_langs,
                    {"default": SETTINGS.get("source_lang", "Russian"), "tooltip": "Translation source languge"},
                ),
                "target_translate": (
                    target_langs,
                    {"default": SETTINGS.get("target_lang", "English"), "tooltip": "Translation target languge"},
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
    DESCRIPTION = "This is a node that translates the prompt into another language using DeepLX."
    CATEGORY = "AlekPet Nodes/conditioning"

    def deeplx_translate_text(self, source_translate, target_translate, prompt, clip):
        if not DEEPLX_SERVER_RUNNING:
            raise ValueError(
                "DeepLX server is not running! Please check Go and DeepLX repository installation or information in the ComfyUI terminal!"
            )

        # Get short value source and target code languages
        source_translate_code = LANGUAGES_CODES["source"][source_translate]
        target_translate_code = LANGUAGES_CODES["target"][target_translate]

        prompt = translate(prompt, source_translate_code, target_translate_code)

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
        if not DEEPLX_SERVER_RUNNING:
            raise ValueError(
                "DeepLX server is not running! Please check Go and DeepLX repository installation or information in the ComfyUI terminal!"
            )

        # Get short value source and target code languages
        source_translate_code = LANGUAGES_CODES["source"][source_translate]
        target_translate_code = LANGUAGES_CODES["target"][target_translate]

        prompt = translate(prompt, source_translate_code, target_translate_code)

        return (prompt,)
