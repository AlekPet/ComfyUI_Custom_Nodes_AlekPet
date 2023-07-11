import re
from googletrans import Translator, LANGUAGES
import folder_paths

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
    FUNCTION = "translate_text"

    CATEGORY = "AlekPet Nodes/text"

    def translate_text(self, from_translate, to_translate, text):
        text_tranlsated = translate(text, from_translate, to_translate)
        return (text_tranlsated,)

# class PreviewTextNode:

#     def __init__(self):
#         self.output_dir = folder_paths.get_temp_directory()
    
#     @classmethod
#     def INPUT_TYPES(s):

#         return {
#             "required": {        
#                 "text": ("STRING", {"forceInput": True}),     
#                 }
#             }
#     OUTPUT_NODE = True
#     RETURN_TYPES = ()
#     FUNCTION = "preview_text"

#     CATEGORY = "AlekPet Nodes/text"

#     def preview_text(self, text):
#         print(text)
#         return { "ui": { "string": text } }

