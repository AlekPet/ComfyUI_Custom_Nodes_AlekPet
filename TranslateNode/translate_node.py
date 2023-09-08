import re
from googletrans import Translator, LANGUAGES

translator = Translator()
empty_str = re.compile('^\s*$', re.I | re.M)

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
"MyMemoryTranslator" - source yes, no detect
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

### Services
def Services(service, text, from_translate="auto", to_translate="en", proxy_data={}):
        translated = "No tranlsate..."
        
        proxy_valid = proxy_data.get("proxy_valid", False)
        proxyes = proxy_data.get("proxyes", {})
        proxyes = proxyes if proxy_valid and bool(proxyes) else {}
        
        try:
            # --- Free ---
            # Google
            if service == "GoogleTranslator":
                translated = GoogleTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate(text)
            # MyMemoryTranslator
            elif service == "MyMemoryTranslator":
                translated = MyMemoryTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate(text)
                
            # DeeplTranslator    
            elif service == "DeeplTranslator":
                translated = DeeplTranslator(api_key="your_api_key", source=from_translate, target=to_translate, use_free_api=True, proxies=proxyes).translate(text)
                
            # LingueeTranslator and PonsTranslator
            elif service == "LingueeTranslator" or service == "PonsTranslator":
                words = list(filter(bool, re.split("[,.!;\s\t]", text)))
                print(f"List words: {' '.join(words)}")
                if service == "LingueeTranslator":                    
                    translated = LingueeTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate_words(words) 
                else:
                    translated = PonsTranslator(source=from_translate, target=to_translate, proxies=proxyes).translate_words(words)
            
            # --- Need API KEY AND OTHER DATA ---
            # QcriTranslator
            elif service == "QcriTranslator":
                # "domains":["dialectal","dialectal-fast","general","general-fast","general-neural","general-neural-large","medical","neural-beta","neural-opus-dev","pb-debug"]
                api_key = self.auth_data.get("api_key", API_KEYS_SERVICES_DEEP_TRANSLATOR["QcriTranslator"])
                print("Api_key: ", api_key)
                print("language pairs: ", QcriTranslator(api_key).languages)
                translated = QcriTranslator(api_key).translate(source=from_translate, target=to_translate, domain="general", text=text, proxies=proxyes)
   
               # BaiduTranslator    
            elif service == "BaiduTranslator":
                translated = BaiduTranslator(appid="your-appid", appkey="your-appkey", source=from_translate, target=to_translate, proxies=proxyes).translate(text)
                
            # ChatGptTranslator    
            elif service == "ChatGptTranslator":
                translated = ChatGptTranslator(api_key='your_key', target=to_translate, proxies=proxyes).translate(text=text)

            # LibreTranslator    
            elif service == "LibreTranslator":
                translated = LibreTranslator(source=from_translate, target=to_translate.capitalize(), base_url='"https://libretranslate.com/translate', api_key='your_api_key', proxies=proxyes).translate(text=text)
                #translated = LibreTranslator(source=from_translate, target=to_translate).translate(text=text)

            # MicrosoftTranslator    
            elif service == "MicrosoftTranslator":
                translated = MicrosoftTranslator(api_key='some-key', target=to_translate, proxies=proxyes).translate(text=text)
                                         
            # PapagoTranslator    
            elif service == "PapagoTranslator":
                translated = PapagoTranslator(client_id='your_client_id', secret_key='your_secret_key', source=from_translate, target=to_translate, proxies=proxyes).translate(text=text)
                
            # YandexTranslator    
            elif service == "YandexTranslator":
                translated = YandexTranslator('your_api_key').translate(source=from_translate, target=to_translate, text=text, proxies=proxyes)
                                                
        except Exception as e:
            print("Error: ", e)
        finally:
            return translated

### Proxyes
def makeDictProxies(proxies):
    proxies_data = {
        "proxy_valid": False,
        "proxyes": {}
    }    
    try:
        split_proxies = proxies.splitlines()
        if len(split_proxies)>0:
            split_proxies = list(map(lambda p: p.split('='), split_proxies))
            for proxy_data in split_proxies:
                if len(proxy_data) == 2:
                    protocol, id_port = proxy_data
                    proxies_data["proxyes"][protocol.strip()] = id_port.strip()
                    
            if len(proxies_data["proxyes"]):
                proxies_data["proxy_valid"] = True
        
        print(f'Proxy valid: {"Ok" if proxies_data["proxy_valid"] else "No"}, Value proxies: {proxies_data["proxyes"]}')
    except Exception as e:
        print('Error proxy exception: ', e)  
    finally:
        return proxies_data
    
### Function deep translator for all deep_translator nodes
def deep_translator_function(from_translate, to_translate, add_proxies, proxies, auth_data, service, text):
        text_tranlsated = ""
        proxies_data = {
        "proxy_valid": False,
        "proxyes": {}
        }      
        
        if text and not empty_str.match(text):
        
            if add_proxies == "enable":
                proxies_data = makeDictProxies(proxies)
       
            if from_translate == "auto" and service in ("DeeplTranslator","QcriTranslator","LingueeTranslator","PonsTranslator","PapagoTranslator","BaiduTranslator", "MyMemoryTranslator"):
                lang_detect_short = single_detection(text, api_key=API_KEYS_SERVICES_DEEP_TRANSLATOR["DetectLanguage"])
                from_translate = self.langs_support[lang_detect_short]
                print(f"Language detected: {from_translate}")
            
            service_correct = re.sub("\[.*\]", "", service).strip()
            print(f"[{service_correct}]")
            text_tranlsated = Services(service_correct, text, from_translate, to_translate, proxies_data)
                       
            if not text_tranlsated or text_tranlsated is None:
                text_tranlsated = ""
            
        return text_tranlsated     
     
###  Deep Translator output TEXT      
class DeepTranslatorTextNode:    
    @classmethod
    def INPUT_TYPES(self):
        self.auth_data = {} # dev....
    
        self.langs_support = {short:full for full, short in GoogleTranslator().get_supported_languages(as_dict=True).items()}
        
        lang_support_values = list(self.langs_support.values())
        return {
            "required": {
                "from_translate": (['auto']+lang_support_values, {"default": "auto"}),
                "to_translate": (lang_support_values, {"default": "english"} ),
                "add_proxies": (["enable", "disable"], {"default": "disable"} ),
                "proxies": ("STRING", {"multiline": True, "placeholder": "Proxies list (http=proxy), example:\nhttps=34.195.196.27:8080\nhttp=34.195.196.27:8080"}),
                "auth_data": ("STRING", {"multiline": True, "placeholder": "Auth data..."}),
                "service": (["BaiduTranslator [api-key]",
                             "ChatGptTranslator [api-key]",
                             "DeeplTranslator",
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
        self.auth_data = {} # dev....
    
        self.langs_support = {short:full for full, short in GoogleTranslator().get_supported_languages(as_dict=True).items()}
        
        lang_support_values = list(self.langs_support.values())
        return {
            "required": {
                "from_translate": (['auto']+lang_support_values, {"default": "auto"}),
                "to_translate": (lang_support_values, {"default": "english"} ),
                "add_proxies": (["enable", "disable"], {"default": "disable"} ),
                "proxies": ("STRING", {"multiline": True, "placeholder": "Proxies list (http=proxy), example:\nhttps=34.195.196.27:8080\nhttp=34.195.196.27:8080"}),
                "auth_data": ("STRING", {"multiline": True, "placeholder": "Auth data..."}),
                "service": (["BaiduTranslator [api-key]",
                             "ChatGptTranslator [api-key]",
                             "DeeplTranslator",
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