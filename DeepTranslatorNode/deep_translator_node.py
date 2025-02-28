import os
import re
import json
from server import PromptServer
from aiohttp import web
import requests
import deep_translator
from deep_translator import (
    BaiduTranslator,
    ChatGptTranslator,
    DeeplTranslator,
    GoogleTranslator,
    LibreTranslator,
    LingueeTranslator,
    MyMemoryTranslator,
    MicrosoftTranslator,
    PapagoTranslator,
    PonsTranslator,
    QcriTranslator,
    YandexTranslator,
    single_detection,
    batch_detection,
)

# RegExp
empty_str = re.compile(r"^\s*$", re.I | re.M)
remove_brackets_reg = re.compile(r"[\[\]]*")
key_val_reg = re.compile(r"^[\w-]+=[^=][.\w-]*$", re.I)
key_val_proxy_reg = re.compile(r"^https?=\d{1,3}(?:\.\d{1,3}){3}:\d{1,5}$", re.I)
service_correct_reg = re.compile(r"\s*\[.*\]")
check_proxy_reg = re.compile(r"\d{1,3}\.\d{1,3}\.\d{1,3}\:\d+")

# Debug mode
DEBUG = False

### =====  Deep Translator Nodes  ===== ###


def log(*text, desc="[Deep Translator => "):
    if DEBUG:
        print(desc)
        print(*text, sep=", ")


# Default API Keys variables
DEFAULT_API_KEYS_SERVICES = {
    "QcriTranslator": "c8af063b6c350215bc74340e16eebf51",
    "DetectLanguage": "26838885af95f01110f154dac9d6a235",
}

# Global variables
CONFIG = {}
CONFIG_SERVICES = {}
CONFIG_PROXYES = {}
CONFIG_SETTINGS = {}

# Global variable detect languages support
DETECT_LANGS_SUPPORT = {}

# Directory translate node and config file
dir_translate_node = os.path.dirname(__file__)
config_path = os.path.join(os.path.abspath(dir_translate_node), "config.json")
detect_languages_list = os.path.join(
    os.path.abspath(dir_translate_node), "detect_languages_list.json"
)


# Check service view and api_key
def check_service_view(services_prop={}, service=""):
    if not service and not services_prop:
        return False

    if (
        services_prop.get("show_service", False)
        and CONFIG_SETTINGS
        and CONFIG_SETTINGS.get("show_services_no_check_api", False)
    ):
        return True
    else:
        # Not free_api and check api_key if incorrect
        free_api = services_prop.get("free_api", None)
        if not free_api is None and free_api == False:
            if (
                service == "BaiduTranslator"
                and services_prop.get("appid", "your_appid") not in ("your_appid", "")
                and services_prop.get("appkey", "your_appkey")
                not in ("your_appkey", "")
            ):
                return True

            if (
                service == "PapagoTranslator"
                and services_prop.get("client_id", "your_client_id")
                not in ("your_client_id", "")
                and services_prop.get("secret_key", "your_secret_key")
                not in ("your_secret_key", "")
            ):
                return True

            if (
                service == "DeeplTranslator"
                and services_prop.get("use_free_api", True)
                and services_prop.get("api_key", "your_api_key")
                not in ("your_api_key", "")
            ):
                return True

            if services_prop.get("api_key", "your_api_key") not in ("your_api_key", ""):
                return True
        else:
            return True

    log(f"Service: {service} is not showing...")
    return False


# Load config.js file
if not os.path.exists(config_path):
    print("File config.js file not found! Reinstall extensions! Used default settings!")
else:
    with open(config_path, "r") as f:
        CONFIG = json.load(f)

        # JSON data
        for prop in CONFIG.get("deep_translator_node", {}):
            deep_config = CONFIG["deep_translator_node"].get(prop, {})
            if prop == "services":
                services_prop = deep_config
                CONFIG_SERVICES = deep_config
            if prop == "proxies":
                CONFIG_PROXYES = deep_config
            if prop == "settings":
                CONFIG_SETTINGS = deep_config

        CONFIG_SERVICES = {
            s: services_prop[s]
            for s in CONFIG_SERVICES
            if check_service_view(services_prop[s], s)
        }
# =====

# Support languages - detectlanguage
try:
    if not os.path.exists(detect_languages_list):
        log("File detect_languages_list.json file not found! Get List from site!")
        DETECT_LANGS_SUPPORT = requests.get(
            "https://ws.detectlanguage.com/0.2/languages"
        ).json()
        with open(detect_languages_list, "w") as f:
            json.dump(DETECT_LANGS_SUPPORT, f)
            log("Loading detect languages list support from site complete and save!")
    else:
        with open(detect_languages_list, "r") as f:
            DETECT_LANGS_SUPPORT = json.load(f)
            log("Loading detect languages list support from json file!")

except Exception as e:
    log(f"Error loading of the dictionary to determine the language: {e}")


def selectService(service):
    if service:
        class_translate = (
            getattr(deep_translator, service)
            if service in dir(deep_translator)
            else getattr(deep_translator, "GoogleTranslator")
        )
        langs_support = {}
        auto_support = True
        service_data = CONFIG_SERVICES.get(service, {})

        if service in ("GoogleTranslator", "ChatGptTranslator", "YandexTranslator"):
            langs_support = GoogleTranslator().get_supported_languages(as_dict=True)

        if service in (
            "MicrosoftTranslator",
            "LibreTranslator",
            "DeeplTranslator",
            "PonsTranslator",
        ):
            langs_support = class_translate(
                api_key="api_key", source="en"
            ).get_supported_languages(as_dict=True)

        if service == "QcriTranslator":
            api_key = service_data.get("api_key", None)
            api_key = (
                api_key
                if not api_key is None
                else DEFAULT_API_KEYS_SERVICES["QcriTranslator"]
            )
            langs_support = class_translate(api_key=api_key).get_supported_languages(
                as_dict=True
            )

        if service in ("MyMemoryTranslator", "LingueeTranslator"):
            langs_support = class_translate(
                api_key="api_key", source="english", target="english"
            ).get_supported_languages(as_dict=True)

        if service == "BaiduTranslator":
            langs_support = BaiduTranslator(
                appid="appid", appkey="appkey"
            ).get_supported_languages(as_dict=True)

        if service == "PapagoTranslator":
            langs_support = PapagoTranslator(
                client_id="client_id", secret_key="secret_key"
            ).get_supported_languages(as_dict=True)

        if service in (
            "DeeplTranslator",
            "PonsTranslator",
            "QcriTranslator",
            "LingueeTranslator",
            "PapagoTranslator",
            "BaiduTranslator",
        ):  # "MyMemoryTranslator" ???
            auto_support = False

        return langs_support


@PromptServer.instance.routes.get("/alekpet/tranlsate_langs_support/{service}")
async def langs_support(request):
    service = request.match_info["service"]

    settings = {
        "auth_input_in_node": CONFIG_SETTINGS.get("auth_input_in_node", False),
        "proxyes_input_in_node": CONFIG_SETTINGS.get("proxyes_input_in_node", False),
    }

    proxies = {
        k.lower(): p
        for k, p in CONFIG_PROXYES.items()
        if k.lower() in ("http", "https") and check_proxy_reg.search(p)
    }

    if service:
        proxies = {}
        auth_data = {}
        langs_support = selectService(service)

        if service in CONFIG_SERVICES.keys():
            auth_data = {
                keyS: servP
                for keyS, servP in CONFIG_SERVICES.get(service, {}).items()
                if keyS
                in (
                    "api_key",
                    "domain",
                    "use_free_api",
                    "appid",
                    "appkey",
                    "client_id",
                    "secret_key",
                )
            }

        return web.json_response(
            {
                "langs_service": langs_support,
                "auth_data": auth_data,
                "proxies": proxies,
                "settings": settings,
            }
        )

    return web.json_response(
        {"langs_service": {}, "auth_data": {}, "proxies": proxies, "settings": settings}
    )


### Service translate function
def service_translate(
    service, text, from_translate="auto", to_translate="en", prop_data={}
):
    translated = "No tranlsate, see ComfyUI console..."

    proxyes = prop_data.get("proxies", {})
    auth_data = prop_data.get("auth_data", {})
    api_key = auth_data.get("api_key", "your_api_key")

    log(
        f"Translate from={from_translate}, to={to_translate}, prop_data={prop_data}, proxy = {proxyes}"
    )
    # --- Free ---
    # Google
    if service == "GoogleTranslator":
        translated = GoogleTranslator(
            source=from_translate, target=to_translate, proxies=proxyes
        ).translate(text)

    # MyMemoryTranslator
    elif service == "MyMemoryTranslator":
        translated = MyMemoryTranslator(
            source=from_translate, target=to_translate, proxies=proxyes
        ).translate(text)

    # LingueeTranslator and PonsTranslator
    elif service == "LingueeTranslator" or service == "PonsTranslator":
        words = list(filter(bool, re.split(r"[,.!;\s\t]", text)))

        log(f"List words: {', '.join(words)}")
        if service == "LingueeTranslator":
            translated = LingueeTranslator(
                source=from_translate, target=to_translate, proxies=proxyes
            ).translate_words(words)
        else:
            try:
                translated = PonsTranslator(
                    source=from_translate, target=to_translate, proxies=proxyes
                ).translate_words(words)
            except Exception as err:
                print(
                    f'[Deep Translator] Service "{service}", it gives an error if words from other languages that do not correspond to the source are used : {err}'
                )

    # LibreTranslator
    elif service == "LibreTranslator":
        use_free_api = auth_data.get("use_free_api", True)
        translated = LibreTranslator(
            source=from_translate,
            target=to_translate,
            base_url='"https://libretranslate.com/translate',
            api_key=api_key,
            proxies=proxyes,
        ).translate(text=text)

    # --- Need API KEY AND OTHER DATA ---

    # DeeplTranslator
    elif service == "DeeplTranslator":
        use_free_api = auth_data.get("use_free_api", True)
        translated = DeeplTranslator(
            api_key=api_key,
            source=from_translate,
            target=to_translate,
            use_free_api=use_free_api,
            proxies=proxyes,
        ).translate(text)

    # QcriTranslator
    elif service == "QcriTranslator":
        domain = auth_data.get("domain", "general")
        translated = QcriTranslator(
            api_key=api_key, source=from_translate, target=to_translate
        ).translate(domain=domain, text=text, proxies=proxyes)

        # BaiduTranslator
    elif service == "BaiduTranslator":
        appid = auth_data.get("appid", "your-appid")
        appkey = auth_data.get("appkey", "your-appkey")
        translated = BaiduTranslator(
            appid=appid,
            appkey=appkey,
            source=from_translate,
            target=to_translate,
            proxies=proxyes,
        ).translate(text)

    # ChatGptTranslator
    elif service == "ChatGptTranslator":
        translated = ChatGptTranslator(
            api_key=api_key, target=to_translate, proxies=proxyes
        ).translate(text=text)

    # MicrosoftTranslator
    elif service == "MicrosoftTranslator":
        translated = MicrosoftTranslator(
            api_key=api_key, target=to_translate, proxies=proxyes
        ).translate(text=text)

    # PapagoTranslator
    elif service == "PapagoTranslator":
        client_id = auth_data.get("client_id", "your_client_id")
        secret_key = auth_data.get("secret_key", "your_secret_key")
        translated = PapagoTranslator(
            client_id=client_id,
            secret_key=secret_key,
            source=from_translate,
            target=to_translate,
            proxies=proxyes,
        ).translate(text=text)

    # YandexTranslator
    elif service == "YandexTranslator":
        translated = YandexTranslator(api_key=api_key).translate(
            source=from_translate, target=to_translate, text=text, proxies=proxyes
        )

    return translated


### Function get dictinary from text, from auth_data and proxies
def makeDictText(name_prop, text="", regexp=key_val_reg):
    data = {name_prop: {}}
    try:
        split_text = text.splitlines()
        if len(split_text) > 0:
            split_text = [
                line
                for line in split_text
                if line and line.strip() != "" and regexp.search(line)
            ]
            split_text = list(map(lambda p: p.split("="), split_text))
            for text_data in split_text:
                if len(text_data) == 2:
                    key, val = text_data
                    data[name_prop][key.strip()] = val.strip()

        log(f"Value {name_prop}: {data[name_prop]}")
    except Exception as e:
        print(f"[Deep Translator] Error {name_prop} exception: ", e)
    finally:
        return data


# Detect languages in input
def isset_languages(text, service, from_translate, langs_support={}, auth_data={}):
    is_support = False
    detect_lang_short = ""
    detect = []

    try:
        # Get api from input auth_data if empty from service
        detect_lang_api_key = auth_data.get("detect_lang_api_key", "")
        if detect_lang_api_key.strip() == "":
            detectServiceData = CONFIG_SERVICES.get("DetectLanguage", {})
            detect_lang_api_key = detectServiceData.get("api_key", None)
            detect_lang_api_key = (
                detect_lang_api_key
                if not detect_lang_api_key is None
                else DEFAULT_API_KEYS_SERVICES["DetectLanguage"]
            )

        # Function detect source language
        detect_lang_short = single_detection(text, api_key=detect_lang_api_key)
        detect = list(
            filter(lambda d: d["code"] == detect_lang_short, DETECT_LANGS_SUPPORT)
        )[0]

        log(
            f"[{service}] Detect short: {detect_lang_short}, detect: {detect}, lang support: {len(langs_support.keys())}"
        )

        if (
            detect_lang_short
            and len(detect) > 0
            and detect.get("name", "")
            and langs_support
        ):
            detect_lang_full = detect["name"].lower()
            langs_support_keys = langs_support.keys()
            detect_in_base = list(
                filter(
                    lambda lang: lang.lower() == detect_lang_full
                    or lang.capitalize() == detect_lang_full.capitalize()
                    or lang.lower() == detect_lang_short,
                    langs_support_keys,
                )
            )

            if detect_in_base:
                if service in ("QcriTranslator",):
                    detect_lang_full = detect_lang_full.capitalize()

                if service in ("PonsTranslator",):
                    detect_lang_full = detect_lang_short

                from_translate = detect_lang_full
                is_support = True
                log(f"[Deep Translator> Detect in base: {detect_lang_full}")
            else:
                log(f"[Deep Translator>No detect in base: {detect_lang_full}")

    except Exception as e:
        print(f"[Deep Translator] Error detect language: {e}")

    return (from_translate, is_support, detect)


### Function deep translator for all deep_translator nodes
def deep_translator_function(
    from_translate,
    to_translate,
    add_proxies,
    proxies,
    auth_data,
    service,
    text,
    lang_support={},
):
    text_tranlsated = ""
    prop_data = {"proxies": {}, "auth_data": {}}
    try:
        if text:
            print(f'[Deep Translator] Service: "{service}"')
            # Proxy prop
            if add_proxies:
                if isinstance(proxies, (str,)) and proxies.strip() != "":
                    prop_data.update(
                        makeDictText("proxies", proxies, key_val_proxy_reg)
                    )

                elif proxies is None:
                    prop_data.update(
                        {
                            "proxies": {
                                k.lower(): p
                                for k, p in CONFIG_PROXYES.items()
                                if k.lower() in ("http", "https")
                                and check_proxy_reg.search(p)
                            }
                        }
                    )
                proxies_info = ", ".join([f"{prop}={val}" for prop, val in prop_data["proxies"].items()])
                print(f"[Deep Translator] Proxy is enabled. Proxies: {proxies_info}")
            else:
                print("[Deep Translator] Proxy disabled or input field is empty!")

            # Auth prop
            if auth_data is None:
                prop_data.update(
                    {
                        "auth_data": {
                            keyS: servP
                            for keyS, servP in CONFIG_SERVICES.get(service, {}).items()
                            if keyS
                            in (
                                "api_key",
                                "domain",
                                "use_free_api",
                                "appid",
                                "appkey",
                                "client_id",
                                "secret_key",
                            )
                        }
                    }
                )

            elif isinstance(auth_data, (str,)) and auth_data.strip() != "":
                prop_data.update(makeDictText("auth_data", auth_data))

            else:
                print("[Deep Translator] Authorization input field is empty!")

            # Detect language
            tServices = (
                "DeeplTranslator",
                "QcriTranslator",
                "LingueeTranslator",
                "PonsTranslator",
                "PapagoTranslator",
                "BaiduTranslator",
                "MyMemoryTranslator",
            )

            if from_translate == "auto" and service in tServices:
                from_translate, is_support, detect = isset_languages(
                    text, service, from_translate, lang_support, prop_data
                )
                log(f"Detect turple: {(from_translate, is_support, detect)}")
            else:
                print(
                    f"Deep Translator] Service detect language disabled! Services support: {', '.join(tServices)}.\nThe selected service has its own way of detecting the language.\nProperty \"detect_lang_api_key\" in Authorization data is empty or incorrect!"
                )

            log(f"[{service}] => Data: {prop_data}")

            text_tranlsated = service_translate(
                service, text, from_translate, to_translate, prop_data
            )

            if not text_tranlsated or text_tranlsated is None:
                text_tranlsated = ""
            elif isinstance(text_tranlsated, (tuple, list)):
                text_tranlsated = " ".join(text_tranlsated)

    except Exception as e:
        print(f"[Deep Translator] Error: {e}")
    finally:
        return text_tranlsated, from_translate


def makeRequiredFields(langs_support=[]):
    params = {
        "from_translate": (["auto"] + langs_support, {"default": "auto"}),
        "to_translate": (langs_support, {"default": "english"}),
        "add_proxies": ("BOOLEAN", {"default": False}),
        "proxies": (
            "STRING",
            {
                "multiline": True,
                "placeholder": "Proxies list (http=proxy), example:\nhttps=34.195.196.27:8080\nhttp=34.195.196.27:8080",
                "default": (
                    ""
                    if len(CONFIG_PROXYES.values()) == 0
                    else "\n".join(
                        [
                            f"{k.lower()}={p}"
                            for k, p in CONFIG_PROXYES.items()
                            if k.lower() in ("http", "https")
                            and check_proxy_reg.search(p)
                        ]
                    )
                ),
            },
        ),
        "auth_data": (
            "STRING",
            {
                "multiline": True,
                "placeholder": "Authorization data...\nExample:\napi_key=your_api_key\ndetect_lang_api_key=your_api_key\nclient_id=your_client_id\nsecret_key=your_secret_key\nappid=your-appid\nappkey=your-appkey",
            },
        ),
        "service": (),
        "text": ("STRING", {"multiline": True, "placeholder": "Input text"}),
        "clip": ("CLIP",),
    }

    if CONFIG_SERVICES and isinstance(CONFIG_SERVICES, (dict,)):
        if CONFIG_SETTINGS and CONFIG_SETTINGS.get("help_text_services"):
            services_combo = []
            for service_key, service_prop in CONFIG_SERVICES.items():
                if service_prop.get("show_service", False):
                    service_help = service_prop.get("help", "")
                    service_help = remove_brackets_reg.sub("", service_help)
                    service_val = (
                        f"{service_key} [{service_help}]"
                        if service_help.strip() != ""
                        else service_key
                    )
                    services_combo.append(service_val)

            params["service"] = (services_combo, {"default": "GoogleTranslator"})
        else:
            params["service"] = (
                list(
                    filter(
                        lambda s: CONFIG_SERVICES[s].get("show_service", False),
                        CONFIG_SERVICES.keys(),
                    )
                ),
                {"default": "GoogleTranslator"},
            )
    else:
        params["service"] = (
            [
                "GoogleTranslator [free]",
                "MyMemoryTranslator [free]",
                "LibreTranslator [free or api_key]",
                "LingueeTranslator [free - word(s) only]",
                "PonsTranslator [free - word(s) only]",
                "DeeplTranslator [api-key]",
                "ChatGptTranslator [api-key]",
                "BaiduTranslator [appid and appkey]",
                "MicrosoftTranslator [api-key]",
                "PapagoTranslator [client_id, secret_key]",
                "QcriTranslator [api-key]",
                "YandexTranslator [api-key]",
            ],
            {"default": "GoogleTranslator"},
        )

    return params


###  Deep Translator output -> CONDITIONING
class DeepTranslatorCLIPTextEncodeNode:

    @classmethod
    def INPUT_TYPES(self):
        self.current_service = ""
        self.proxies = ""
        self.auth_data = ""

        self.langs_support = selectService("GoogleTranslator")
        langs_support = list(self.langs_support.keys())

        return {
            "required": makeRequiredFields(langs_support),
        }

    RETURN_TYPES = (
        "CONDITIONING",
        "STRING",
    )
    OUTPUT_NODE = True
    DESCRIPTION = "This is a node that translates the hint text into another language using various services included in Deep Translator."
    FUNCTION = "deep_translate_text"

    CATEGORY = "AlekPet Nodes/conditioning"

    def deep_translate_text(
        self,
        from_translate,
        to_translate,
        add_proxies,
        proxies,
        auth_data,
        service,
        text,
        clip,
    ):
        # Select service
        service = service_correct_reg.sub("", service)
        if self.current_service != service:
            self.langs_support = selectService(service)
            self.current_service = service

        # Translate
        text_tranlsated, detected_lang = deep_translator_function(
            from_translate,
            to_translate,
            add_proxies,
            proxies,
            auth_data,
            service,
            text,
            self.langs_support,
        )

        tokens = clip.tokenize(text_tranlsated)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return {
            "ui": {"detected_lang": (detected_lang,)},
            "result": (
                [[cond, {"pooled_output": pooled}]],
                text_tranlsated,
            ),
        }

    @classmethod
    def VALIDATE_INPUTS(
        cls,
        from_translate,
        to_translate,
        add_proxies,
        proxies,
        auth_data,
        service,
        text,
        clip,
    ):
        # lang, is_support, detect = isset_languages(text, service, from_translate, self.langs_support)
        # if not is_support:
        #     return f"[Deep Translator] Service \"{service}\", no support for the provided language: {detect}!"
        return True


###  Deep Translator output -> TEXT
class DeepTranslatorTextNode(DeepTranslatorCLIPTextEncodeNode):
    @classmethod
    def INPUT_TYPES(self):
        types = super().INPUT_TYPES()
        del types["required"]["clip"]
        return types

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    OUTPUT_NODE = True
    FUNCTION = "deep_translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def deep_translate_text(
        self,
        from_translate,
        to_translate,
        add_proxies,
        proxies,
        auth_data,
        service,
        text,
    ):
        # Select service
        service = service_correct_reg.sub("", service)
        if self.current_service != service:
            self.langs_support = selectService(service)
            self.current_service = service

        # Translate
        text_tranlsated, detected_lang = deep_translator_function(
            from_translate,
            to_translate,
            add_proxies,
            proxies,
            auth_data,
            service,
            text,
            self.langs_support,
        )
        return {
            "ui": {"detected_lang": (detected_lang,)},
            "result": (text_tranlsated,),
        }

    @classmethod
    def VALIDATE_INPUTS(
        cls,
        from_translate,
        to_translate,
        add_proxies,
        proxies,
        auth_data,
        service,
        text,
    ):
        # lang, is_support, detect = isset_languages(text, service, from_translate, self.langs_support)
        # if not is_support:
        #     return f"[Deep Translator] Service \"{service}\", no support for the provided language: {detect}!"
        return True


### =====  Deep Translator Node  -> end ===== ###
