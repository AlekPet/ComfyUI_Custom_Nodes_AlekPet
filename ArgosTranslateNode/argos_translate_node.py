from server import PromptServer
from aiohttp import web

import argostranslate.package
import argostranslate.translate
import re

# Find packages https://www.argosopentech.com/argospm/index/

### =====  Argos Translate Node  ===== ###
ALL_CODES = {
    "english": {
        "code": "en",
        "targets": [
            "albanian",
            "arabic",
            "azerbaijani",
            "bengali",
            "bulgarian",
            "catalan",
            "chinese",
            "chinese (traditional)",
            "czech",
            "danish",
            "dutch",
            "esperanto",
            "estonian",
            "finnish",
            "french",
            "german",
            "greek",
            "hebrew",
            "hindi",
            "hungarian",
            "indonesian",
            "irish",
            "italian",
            "japanese",
            "korean",
            "latvian",
            "lithuanian",
            "malay",
            "norwegian",
            "persian",
            "polish",
            "portuguese",
            "romanian",
            "russian",
            "slovak",
            "slovenian",
            "spanish",
            "swedish",
            "tagalog",
            "thai",
            "turkish",
            "ukrainian",
            "urdu",
        ],
    },
    "albanian": {"code": "sq", "targets": ["english"]},
    "arabic": {"code": "ar", "targets": ["english"]},
    "azerbaijani": {"code": "az", "targets": ["english"]},
    "bengali": {"code": "bn", "targets": ["english"]},
    "bulgarian": {"code": "bg", "targets": ["english"]},
    "catalan": {"code": "ca", "targets": ["english"]},
    "chinese": {"code": "zh", "targets": ["english"]},
    "chinese (traditional)": {"code": "zt", "targets": ["english"]},
    "czech": {"code": "cs", "targets": ["english"]},
    "danish": {"code": "da", "targets": ["english"]},
    "dutch": {"code": "nl", "targets": ["english"]},
    "esperanto": {"code": "eo", "targets": ["english"]},
    "estonian": {"code": "et", "targets": ["english"]},
    "finnish": {"code": "fi", "targets": ["english"]},
    "french": {"code": "fr", "targets": ["english"]},
    "german": {"code": "de", "targets": ["english"]},
    "greek": {"code": "el", "targets": ["english"]},
    "hebrew": {"code": "he", "targets": ["english"]},
    "hindi": {"code": "hi", "targets": ["english"]},
    "hungarian": {"code": "hu", "targets": ["english"]},
    "indonesian": {"code": "id", "targets": ["english"]},
    "irish": {"code": "ga", "targets": ["english"]},
    "italian": {"code": "it", "targets": ["english"]},
    "japanese": {"code": "ja", "targets": ["english"]},
    "korean": {"code": "ko", "targets": ["english"]},
    "latvian": {"code": "lv", "targets": ["english"]},
    "lithuanian": {"code": "lt", "targets": ["english"]},
    "malay": {"code": "ms", "targets": ["english"]},
    "norwegian": {"code": "nb", "targets": ["english"]},
    "persian": {"code": "fa", "targets": ["english"]},
    "polish": {"code": "pl", "targets": ["english"]},
    "portuguese": {"code": "pt", "targets": ["english", "spanish"]},
    "romanian": {"code": "ro", "targets": ["english"]},
    "russian": {"code": "ru", "targets": ["english"]},
    "slovak": {"code": "sk", "targets": ["english"]},
    "slovenian": {"code": "sl", "targets": ["english"]},
    "spanish": {"code": "es", "targets": ["english", "portuguese"]},
    "swedish": {"code": "sv", "targets": ["english"]},
    "tagalog": {"code": "tl", "targets": ["english"]},
    "thai": {"code": "th", "targets": ["english"]},
    "turkish": {"code": "tr", "targets": ["english"]},
    "ukrainian": {"code": "uk", "targets": ["english"]},
    "urdu": {"code": "ur", "targets": ["english"]},
}


@PromptServer.instance.routes.get("/alekpet/argo_langs_support/{lang}")
async def argo_langs_support(request):
    lang = request.match_info["lang"]

    if lang:
        langs_support = ALL_CODES[lang]
        return web.json_response(
            {
                "langs_support": langs_support["targets"],
                "lang_code": langs_support["code"],
            }
        )

    return web.json_response({"langs_support": [], "lang_code": "en"})


def textNoTranslateConvert(text, tagName):
    if text.strip() == "" or tagName.strip() == "":
        return text, []

    tagNameEscape = re.escape(tagName)
    reFindTags = rf"({tagNameEscape}.*?{tagNameEscape})"

    originalText = text
    findTags = re.findall(reFindTags, originalText)

    for key, tag in enumerate(findTags):
        originalText = originalText.replace(tag, f"{tagName}{key}{tagName}")

    findTags = list(map(lambda x: x.replace(tagName, ""), findTags))

    return originalText, findTags


def textNoTranslateRestore(text, tagsOriginal, tagName):
    if text.strip() == "" or tagName.strip() == "" or len(tagsOriginal) == 0:
        return text

    tagNameEscape = re.escape(tagName)
    reFindTags = rf"({tagNameEscape}\d+{tagNameEscape})"

    originalText = text
    findTags = re.findall(reFindTags, originalText)

    for key, tag in enumerate(findTags):
        originalText = originalText.replace(tag, tagsOriginal[key])

    return originalText


def installPackages(srcTrans, toTrans="en"):
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    package_to_install = next(
        filter(
            lambda x: x.from_code == srcTrans and x.to_code == toTrans,
            available_packages,
        )
    )
    argostranslate.package.install_from_path(package_to_install.download())


def preTranslate(prompt, srcTrans, toTrans):
    if prompt and prompt.strip() != "":
        installed_languages = argostranslate.translate.get_installed_languages()

        from_lang = list(filter(lambda x: x.code == srcTrans, installed_languages))[0]
        to_lang = list(filter(lambda x: x.code == toTrans, installed_languages))[0]

        translation = from_lang.get_translation(to_lang)
        translate_text_prompt = translation.translate(prompt)

    return translate_text_prompt if translate_text_prompt and not None else ""


def translate(prompt, srcTrans=None, toTrans="english", tagName="@"):
    translate_text_prompt = ""
    try:
        srcTransCode = ALL_CODES[srcTrans]["code"] if srcTrans is not None else None
        toTransCode = ALL_CODES[toTrans]["code"]
        installPackages(srcTransCode, toTransCode)

        translate_text_prompt, notranslateText = textNoTranslateConvert(prompt, tagName)

        translate_text_prompt = preTranslate(
            translate_text_prompt, srcTransCode, toTransCode
        )

        translate_text_prompt = textNoTranslateRestore(
            translate_text_prompt, notranslateText, tagName
        )

    except Exception as e:
        print(e)
        return "[Error] No translate text!"

    return translate_text_prompt


class STRINGFIX:
    def __init__(self):
        pass


class ArgosTranslateCLIPTextEncodeNode:
    @classmethod
    def INPUT_TYPES(self):
        self.langs_support = ALL_CODES["russian"]["targets"]
        return {
            "required": {
                "from_translate": (list(ALL_CODES.keys()), {"default": "russian"}),
                "to_translate": (self.langs_support, {"default": "english"}),
                "text": ("STRING", {"multiline": True, "placeholder": "Input text"}),
                "clip": ("CLIP",),
            },
            "optional": {"tag_no_trans": ("STRING", {"default": "@"})},
        }

    RETURN_TYPES = (
        "CONDITIONING",
        "STRING",
    )
    FUNCTION = "argos_translate_text"
    CATEGORY = "AlekPet Nodes/conditioning"

    def argos_translate_text(
        self, from_translate, to_translate, text, clip, tag_no_trans="@"
    ):
        self.langs_support = ALL_CODES[from_translate]["targets"]
        text_tranlsated = translate(text, from_translate, to_translate, tag_no_trans)

        tokens = clip.tokenize(text_tranlsated)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], text_tranlsated)

    @classmethod
    def VALIDATE_INPUTS(
        cls, from_translate, to_translate, text, clip, tag_no_trans
    ):
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

    def argos_translate_text(
        self, from_translate, to_translate, text, tag_no_trans="@"
    ):
        self.langs_support = ALL_CODES[from_translate]["targets"]
        text_tranlsated = translate(text, from_translate, to_translate, tag_no_trans)

        return (text_tranlsated,)

    @classmethod
    def VALIDATE_INPUTS(cls, from_translate, to_translate, text, tag_no_trans):
        return True


### =====  Argos Translate Node  ===== ###
