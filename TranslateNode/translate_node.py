import re
from googletrans import Translator, LANGUAGES

translator = Translator()
empty_str = re.compile('^\s*$', re.I | re.M)
key_val_reg = re.compile('^[\w-]+=([^=][\w-]+)$', re.I)
debug = False

def translate(prompt, srcTrans=None, toTrans=None):
    if not srcTrans:
        srcTrans = 'auto'
        
    if not toTrans:
        toTrans = 'en'

    translate_text_prompt = ''
    if prompt and not empty_str.match(prompt):
        translate_text_prompt = vars(translator.translate(prompt, src=srcTrans, dest=toTrans))
    
    return translate_text_prompt.get('text', '') if 'text' in translate_text_prompt else ''


class TranslateCLIPTextEncodeNode:

    def __init__(self):
        pass    
    
    @classmethod
    def INPUT_TYPES(s):

        return {
            "required": {
                "from_translate": (['auto']+list(LANGUAGES.keys()), {"default": "auto"}),
                "to_translate": (list(LANGUAGES.keys()), {"default": "en"} ),               
                "text": ("STRING", {"multiline": True}),
                "clip": ("CLIP", )
                }
            }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "translate_text"

    CATEGORY = "AlekPet Nodes/conditioning"

    def translate_text(self, from_translate, to_translate, text, clip):
        text = translate(text, from_translate, to_translate)
        tokens = clip.tokenize(text)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], )


class TranslateTextNode:

    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):

        return {
            "required": {
                "from_translate": (['auto']+list(LANGUAGES.keys()), {"default": "auto"}),
                "to_translate": (list(LANGUAGES.keys()), {"default": "en"} ),               
                "text": ("STRING", {"multiline": True}),
                }
            }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def translate_text(self, from_translate, to_translate, text):
        text_tranlsated = translate(text, from_translate, to_translate)
        return (text_tranlsated,)
    
### ===== Deep Translator Node  ===== ###
from server import PromptServer
from aiohttp import web
import requests
import deep_translator
from deep_translator import (BaiduTranslator,
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
                             batch_detection)


'''
>> INFORMATION <<
auto support
--------------
"GoogleTranslator"
"ChatGptTranslator"
"MyMemoryTranslator" - reference auto yes, no detect work
"YandexTranslator"
"MicrosoftTranslator"
"LibreTranslator"

no support
------------------
"DeeplTranslator"
"QcriTranslator"
"LingueeTranslator"
"PonsTranslator"
"PapagoTranslator"
"BaiduTranslator"
'''

API_KEYS_SERVICES_DEEP_TRANSLATOR = {
    "QcriTranslator": "c8af063b6c350215bc74340e16eebf51",
    "DetectLanguage": "26838885af95f01110f154dac9d6a235",
}

default_langs_support = GoogleTranslator().get_supported_languages(as_dict=True)
detect_langs_support = requests.get('https://ws.detectlanguage.com/0.2/languages').json()

def log(*text):
    if debug:
        print(*text, sep=", ")

@PromptServer.instance.routes.get("/alekpet/tranlsate_langs_support/{service}")
async def langs_support(request):
    global default_langs_support
    service = request.match_info["service"]
    if service:
        class_translate = getattr(deep_translator, service)
        langs_support = {}
        auto_support= True

        if service in ("GoogleTranslator", "ChatGptTranslator", "YandexTranslator"):
            langs_support = GoogleTranslator().get_supported_languages(as_dict=True)        
 
        if service in ("MicrosoftTranslator", "LibreTranslator", "DeeplTranslator", "PonsTranslator"):
            langs_support = class_translate(api_key="api_key", source="en").get_supported_languages(as_dict=True)

        if service == "QcriTranslator":
            langs_support = class_translate(api_key=API_KEYS_SERVICES_DEEP_TRANSLATOR["QcriTranslator"]).get_supported_languages(as_dict=True)

        if service in ("MyMemoryTranslator", "LingueeTranslator"):
            langs_support = MyMemoryTranslator(api_key="api_key", source="english", target="english").get_supported_languages(as_dict=True)

        if service  == "BaiduTranslator":
            langs_support = BaiduTranslator(appid="appid", appkey="appkey").get_supported_languages(as_dict=True)
            
        if service == "PapagoTranslator":
            langs_support = PapagoTranslator(client_id="client_id", secret_key="secret_key").get_supported_languages(as_dict=True)

        if service in ("DeeplTranslator", "PonsTranslator", "QcriTranslator", "LingueeTranslator","PapagoTranslator", "BaiduTranslator"): # "MyMemoryTranslator" ???
            auto_support = False
        
        default_langs_support = langs_support       
        return web.json_response({"langs_service": langs_support, "auto_support": auto_support})
    
    return web.json_response({"langs_service": {}, "auto_support": True})


### Services
def Services(service, text, from_translate="auto", to_translate="en", prop_data={}):
        translated = "No tranlsate..."
        
        proxyes = prop_data.get("proxyes", {})
        proxyes = proxyes if bool(proxyes) and len(proxyes)>0  else {}
        
        auth_data = prop_data.get("auth_data", {})
        api_key = auth_data.get("api_key", "your_api_key")
        log(f"Translate from={from_translate}, to={to_translate}")
        try:
            # --- Free ---
            # Google
            if service == "GoogleTranslator":
                translated = GoogleTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate(text)
                
            # MyMemoryTranslator
            elif service == "MyMemoryTranslator":
                translated = MyMemoryTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate(text)
                      
            # LingueeTranslator and PonsTranslator
            elif service == "LingueeTranslator" or service == "PonsTranslator":
                words = list(filter(bool, re.split("[,.!;\s\t]", text)))
                log(f"List words: {', '.join(words)}")
                if service == "LingueeTranslator":                    
                    translated = LingueeTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate_words(words) 
                else:
                    translated = PonsTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate_words(words)
            
            # LibreTranslator    
            elif service == "LibreTranslator":
                translated = LibreTranslator(source=from_translate, target=to_translate, base_url='"https://libretranslate.com/translate', api_key=api_key, proxies=proxyes).translate(text=text)
                
            # --- Need API KEY AND OTHER DATA ---
            # DeeplTranslator    
            elif service == "DeeplTranslator":
                translated = DeeplTranslator(api_key=api_key, source=from_translate, target=to_translate, use_free_api=True, proxies=proxyes).translate(text)
                
            # QcriTranslator
            elif service == "QcriTranslator":
                domain = auth_data.get("domain", "general")
                api_key = api_key if api_key and api_key != "your_api_key" else API_KEYS_SERVICES_DEEP_TRANSLATOR["QcriTranslator"]
                translated = QcriTranslator(api_key=api_key, source=from_translate, target=to_translate).translate(domain=domain, text=text, proxies=proxyes)
   
               # BaiduTranslator    
            elif service == "BaiduTranslator":
                appid = auth_data.get("appid", "your-appid")
                appkey = auth_data.get("appkey", "your-appkey")
                translated = BaiduTranslator(appid=appid, appkey=appkey, source=from_translate, target=to_translate, proxies=proxyes).translate(text)
                
            # ChatGptTranslator    
            elif service == "ChatGptTranslator":                
                translated = ChatGptTranslator(api_key=api_key, target=to_translate, proxies=proxyes).translate(text=text)

            # MicrosoftTranslator    
            elif service == "MicrosoftTranslator":
                translated = MicrosoftTranslator(api_key=api_key, target=to_translate, proxies=proxyes).translate(text=text)
                                         
            # PapagoTranslator    
            elif service == "PapagoTranslator":
                client_id = auth_data.get("client_id", "your_client_id")
                secret_key = auth_data.get("secret_key", "your_secret_key")
                translated = PapagoTranslator(client_id=client_id, secret_key=secret_key, source=from_translate, target=to_translate, proxies=proxyes).translate(text=text)
                
            # YandexTranslator    
            elif service == "YandexTranslator":
                translated = YandexTranslator(api_key=api_key).translate(source=from_translate, target=to_translate, text=text, proxies=proxyes)
                                                
        except Exception as e:
            print(f"Error: {e}")
        finally:
            return translated

### Proxyes
def makeDictText(name_prop, text=""):
    data = {
        name_prop: {}
    }
    try:
        split_text = text.splitlines()
        if len(split_text)>0:
            split_text = [line for line in split_text if line and not empty_str.match(str(line)) and key_val_reg.match(line)]
            
            split_text = list(map(lambda p: p.split('='), split_text))
            for text_data in split_text:
                if len(text_data) == 2:
                    key, val = text_data
                    data[name_prop][key.strip()] = val.strip()
                    
        log(f'Value {name_prop}: {data[name_prop]}')
    except Exception as e:
        print(f'Error {name_prop} exception: ', e)  
    finally:
        return data
    
### Function deep translator for all deep_translator nodes
def deep_translator_function(from_translate, to_translate, add_proxies, proxies, auth_data, service, text):
        global default_langs_support
        global detect_langs_support
        text_tranlsated = ""
        prop_data = {}      
        
        try:
            if text:
                service = re.sub("\s*\[.*\]", "", service)
                # Proxy prop        
                if add_proxies == "enable" and not empty_str.match(proxies):
                    prop_data = makeDictText("proxies", proxies)
                else:
                    print("Proxy disabled or input field is empty!")

                # Auth prop
                if auth_data and not empty_str.match(auth_data):
                    prop_data.update(makeDictText("auth_data", auth_data))
                else:
                    print("Authorization input field is empty!")
                
                log(f"Service: <{service}>")
                if from_translate == "auto" and service in ("DeeplTranslator", "QcriTranslator", "LingueeTranslator", "PonsTranslator", "PapagoTranslator", "BaiduTranslator", "MyMemoryTranslator"):
                    detect_lang_short = single_detection(text, api_key=API_KEYS_SERVICES_DEEP_TRANSLATOR["DetectLanguage"])
                    detect = list(filter(lambda d: d['code'] == detect_lang_short, detect_langs_support))[0]
                    log(f"Detect short: {detect_lang_short}, detect: {detect}")
                    if detect_lang_short and detect and "name" in detect:
                        detect_lang_full = detect["name"].lower()
                        detect_in_base = list(filter(lambda lang: lang.lower() == detect_lang_full or lang.capitalize() == detect_lang_full.capitalize(), default_langs_support.keys()))
                        
                        if service in ("QcriTranslator",):
                            detect_lang_full = detect_lang_full.capitalize()
                        
                        from_translate = detect_lang_full
                        log(f"Detect in base: {list(detect_in_base)}")
                        
                
                service_correct = re.sub("\[.*\]", "", service).strip()
                log(f"[{service_correct}] => Data: {prop_data}")
                
                text_tranlsated = Services(service_correct, text, from_translate, to_translate, prop_data)
                        
                if not text_tranlsated or text_tranlsated is None:
                    text_tranlsated = ""
                
        except Exception as e:
            print(e)
        finally:
            return text_tranlsated
        
     
###  Deep Translator output TEXT      
class DeepTranslatorTextNode:    
    @classmethod
    def INPUT_TYPES(self):
        global default_langs_support
        langs_support = list(default_langs_support.keys())
        return {
            "required": {
                "from_translate": (['auto']+langs_support, {"default": "auto"}),
                "to_translate": (langs_support, {"default": "english"} ),
                "add_proxies": (["enable", "disable"], {"default": "disable"} ),
                "proxies": ("STRING", {"multiline": True, "placeholder": "Proxies list (http=proxy), example:\nhttps=34.195.196.27:8080\nhttp=34.195.196.27:8080"}),
                "auth_data": ("STRING", {"multiline": True, "placeholder": "Authorization data...\napi_key=your_api_key\nclient_id=your_client_id\nsecret_key=your_secret_key\nappid=your-appid\nappkey=your-appkey"}),
                "service": (["BaiduTranslator [api-key]",
                             "ChatGptTranslator [api-key]",
                             "DeeplTranslator [api-key]",
                             "GoogleTranslator",
                             "LibreTranslator",
                             "LingueeTranslator [word(s) only]",
                             "MyMemoryTranslator",
                             "MicrosoftTranslator [api-key]",
                             "PapagoTranslator [client_id, secret_key]",
                             "PonsTranslator [word(s) only]",
                             "QcriTranslator [api-key]",
                             "YandexTranslator [api-key]"], {"default": "GoogleTranslator"} ),                
                "text": ("STRING", {"multiline": True, "placeholder": "Input text"}),
                }
            }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "deep_translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def deep_translate_text(self, from_translate, to_translate, add_proxies, proxies, auth_data, service, text):
        text_tranlsated = deep_translator_function(from_translate, to_translate, add_proxies, proxies, auth_data, service, text)           
        return (text_tranlsated,)
    
###  Deep Translator output CONDITIONING      
class DeepTranslatorCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        global default_langs_support
        langs_support = list(default_langs_support.keys())  
        return {
            "required": {
                "from_translate": (['auto']+langs_support, {"default": "auto"}),
                "to_translate": (langs_support, {"default": "english"} ),
                "add_proxies": (["enable", "disable"], {"default": "disable"} ),
                "proxies": ("STRING", {"multiline": True, "placeholder": "Proxies list (http=proxy), example:\nhttps=34.195.196.27:8080\nhttp=34.195.196.27:8080"}),
                "auth_data": ("STRING", {"multiline": True, "placeholder": "Authorization data...\napi_key=your_api_key\nclient_id=your_client_id\nsecret_key=your_secret_key\nappid=your-appid\nappkey=your-appkey"}),
                "service": (["BaiduTranslator [api-key]",
                             "ChatGptTranslator [api-key]",
                             "DeeplTranslator [api-key]",
                             "GoogleTranslator",
                             "LibreTranslator",
                             "LingueeTranslator [word(s) only]",
                             "MyMemoryTranslator",
                             "MicrosoftTranslator [api-key]",
                             "PapagoTranslator [client_id, secret_key]",
                             "PonsTranslator [word(s) only]",
                             "QcriTranslator [api-key and free]",
                             "YandexTranslator [api-key]"], {"default": "GoogleTranslator"} ),                
                "text": ("STRING", {"multiline": True, "placeholder": "Input text"}),
                "clip": ("CLIP", )
                }
            }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "deep_translate_text"

    CATEGORY = "AlekPet Nodes/conditioning"

    def deep_translate_text(self, from_translate, to_translate, add_proxies, proxies, auth_data, service, text, clip):
        text_tranlsated = deep_translator_function(from_translate, to_translate, add_proxies, proxies, auth_data, service, text)
        tokens = clip.tokenize(text_tranlsated)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], )