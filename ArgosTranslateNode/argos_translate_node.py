import argostranslate.package
import argostranslate.translate

### =====  Argos Translate Node  ===== ###
LANGUAGES = {
    "English": "en",
    "Albanian": "sq",
    "Arabic": "ar",
    "Azerbaijani": "az",
    "Bengali": "bn",
    "Bulgarian": "bg",
    "Catalan": "ca",
    "Chinese": "zh",
    "Chinese (traditional)": "zt",
    "Czech": "cs",
    "Danish": "da",
    "Dutch": "nl",
    "Esperanto": "eo",
    "Estonian": "et",
    "Finnish": "fi",
    "French": "fr",
    "German": "de",
    "Greek": "el",
    "Hebrew": "he",
    "Hindi": "hi",
    "Hungarian": "hu",
    "Indonesian": "id",
    "Irish": "ga",
    "Italian": "it",
    "Japanese": "ja",
    "Korean": "ko",
    "Latvian": "lv",
    "Lithuanian": "lt",
    "Malay": "ms",
    "Norwegian": "nb",
    "Persian": "fa",
    "Polish": "pl",
    "Portuguese": "pt",
    "Romanian": "ro",
    "Russian": "ru",
    "Serbian": "sr",
    "Slovak": "sk",
    "Slovenian": "sl",
    "Spanish": "es",
    "Swedish": "sv",
    "Tagalog": "tl",
    "Thai": "th",
    "Turkish": "tr",
    "Ukrainian": "uk",
    "Urdu": "ur",
    "Vietnamese": "vi"
}


def installPackages(srcTrans, toTrans="en"):
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    filter_languages = filter(
        lambda lang: lang.from_code == srcTrans and lang.to_code == toTrans, available_packages
    )
    if len(filter_languages) > 0:
        available_package = list(filter_languages)[0]
        download_path = available_package.download()
        argostranslate.package.install_from_path(download_path)


def translate(prompt, srcTrans=None, toTrans=None):

    srcTrans = LANGUAGES.get(srcTrans, "en")
    toTrans = LANGUAGES.get(toTrans, "en")

    if not srcTrans:
        srcTrans = 'auto'

    if not toTrans:
        toTrans = 'en'

    # Install lang packages
    installPackages(srcTrans, toTrans)

    translate_text_prompt = ""
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


class ArgosTranslateCLIPTextEncodeNode:

    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "from_translate": (['auto']+list(LANGUAGES.keys()), {"default": "auto"}),
                "to_translate": (list(LANGUAGES.keys()), {"default": "English"}),
                "text": ("STRING", {"multiline": True}),
                "clip": ("CLIP", )
            }
        }

    RETURN_TYPES = ("CONDITIONING", "STRING",)
    FUNCTION = "argos_translate_text"
    CATEGORY = "AlekPet Nodes/conditioning"

    def translate_text(self, from_translate, to_translate, text, clip):
        text = translate(text, from_translate, to_translate)
        tokens = clip.tokenize(text)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], text)


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

    def translate_text(self, from_translate, to_translate, text):
        text_tranlsated = translate(text, from_translate, to_translate)
        return (text_tranlsated,)

### =====  Argos Translate Node  ===== ###
