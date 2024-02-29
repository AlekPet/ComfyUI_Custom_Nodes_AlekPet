import os
import re
import json
from server import PromptServer
from aiohttp import web

import argostranslate.package
import argostranslate.translate

# Find packages https://www.argosopentech.com/argospm/index/

### =====  Argos Translate Node  ===== ###
ALL_CODES = [{"code":"en","name":"English","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"sq","name":"Albanian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ar","name":"Arabic","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"az","name":"Azerbaijani","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"bn","name":"Bengali","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"bg","name":"Bulgarian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ca","name":"Catalan","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"zh","name":"Chinese","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"zt","name":"Chinese (traditional)","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"cs","name":"Czech","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"da","name":"Danish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"nl","name":"Dutch","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"eo","name":"Esperanto","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"et","name":"Estonian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"fi","name":"Finnish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"fr","name":"French","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"de","name":"German","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"el","name":"Greek","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"he","name":"Hebrew","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"hi","name":"Hindi","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"hu","name":"Hungarian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"id","name":"Indonesian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ga","name":"Irish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"it","name":"Italian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ja","name":"Japanese","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ko","name":"Korean","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"lv","name":"Latvian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"lt","name":"Lithuanian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ms","name":"Malay","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"nb","name":"Norwegian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"fa","name":"Persian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"pl","name":"Polish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"pt","name":"Portuguese","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ro","name":"Romanian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ru","name":"Russian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"sr","name":"Serbian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"sk","name":"Slovak","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"sl","name":"Slovenian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"es","name":"Spanish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"sv","name":"Swedish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"tl","name":"Tagalog","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"th","name":"Thai","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"tr","name":"Turkish","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"uk","name":"Ukrainian","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"ur","name":"Urdu","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]},{"code":"vi","name":"Vietnamese","targets":["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","fa","fi","fr","ga","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sr","sv","th","tl","tr","uk","ur","vi","zh","zt"]}]

LANGUAGES = list(map(lambda x:x["code"], ALL_CODES))


def get_support_langs(lang):
    return next(filter(lambda x: x["code"] == lang, ALL_CODES))


@PromptServer.instance.routes.get("/alekpet/argo_langs_support/{langcode}")
async def argo_langs_support(request):
    lang_code = request.match_info["langcode"]
    
    if lang_code:
        langs_support = get_support_langs(lang_code)
  
        return web.json_response({"langs_support": langs_support["targets"], "lang_code": langs_support["code"]}) 
       
    return web.json_response({"langs_support": [], "lang_code": "en"})


def installPackages(srcTrans, toTrans="en"):     
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    package_to_install = next(filter(lambda x: x.from_code == srcTrans and x.to_code == toTrans, available_packages))
    argostranslate.package.install_from_path(package_to_install.download())


def preTranslate(prompt, srcTrans, toTrans):   
    if prompt and prompt.strip() != "":
        installed_languages = argostranslate.translate.get_installed_languages()

        from_lang = list(filter(
            lambda x: x.code == srcTrans,
            installed_languages))[0]
        to_lang = list(filter(
            lambda x: x.code == toTrans,
            installed_languages))[0]

        translation = from_lang.get_translation(to_lang)
        translate_text_prompt = translation.translate(prompt)
        
    return translate_text_prompt if translate_text_prompt and not None else ""    

def translate(prompt, srcTrans=None, toTrans="en"):   
    translate_text_prompt = ""
    try:
        installPackages(srcTrans, toTrans)
        translate_text_prompt = preTranslate(prompt, srcTrans, toTrans)

    except Exception as e:
        print(e)
        return '[Error] No translate text!'
    
    return translate_text_prompt


class ArgosTranslateCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        self.langs_support = get_support_langs("ru")["targets"]  
     
        return {
            "required": {
                "from_translate": (LANGUAGES, {"default": "ru"}),
                "to_translate": (self.langs_support, {"default": "en"}),
                "text": ("STRING", {"multiline": True, "placeholder": "Input text"}),
                "clip": ("CLIP", )
            }
        }

    RETURN_TYPES = ("CONDITIONING", "STRING",)
    FUNCTION = "argos_translate_text"
    CATEGORY = "AlekPet Nodes/conditioning"

    def argos_translate_text(self, from_translate, to_translate, text, clip):
        self.langs_support =  get_support_langs(from_translate)["targets"]
                
        text = translate(text, from_translate, to_translate)
        tokens = clip.tokenize(text)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], text)
    
    @classmethod
    def VALIDATE_INPUTS(cls, from_translate, to_translate, text, clip):
        return True


class ArgosTranslateTextNode(ArgosTranslateCLIPTextEncodeNode):
    @classmethod
    def INPUT_TYPES(self):
        return_types = super().INPUT_TYPES()
        del return_types["required"]["clip"]
        return return_types

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "argos_translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def argos_translate_text(self, from_translate, to_translate, text):
        self.langs_support =  get_support_langs(from_translate)["targets"]
        
        text_tranlsated = translate(text, from_translate, to_translate)
        return (text_tranlsated,)

    @classmethod
    def VALIDATE_INPUTS(cls, from_translate, to_translate, text):
        return True
    
    
### =====  Argos Translate Node  ===== ###
