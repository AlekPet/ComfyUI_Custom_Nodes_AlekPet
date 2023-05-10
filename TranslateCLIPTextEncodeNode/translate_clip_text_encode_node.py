import re
from googletrans import Translator, LANGUAGES

translator = Translator()
empty_str = re.compile('^\s*$', re.I | re.M)

class TranslateCLIPTextEncodeNode:

    def __init__(self):
        pass

    def translate(self, prompt, srcTrans=None, toTrans=None):
        if not srcTrans:
            srcTrans = 'auto'
            
        if not toTrans:
            toTrans = 'en'

        translate_text_prompt = ''
        if prompt and not empty_str.match(prompt):
            translate_text_prompt = vars(translator.translate(prompt, src=srcTrans, dest=toTrans))
        
        return translate_text_prompt.get('text', '') if 'text' in translate_text_prompt else ''
     
    
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

    CATEGORY = "conditioning"

    def translate_text(self, from_translate, to_translate, text, clip):
        text = self.translate(text, from_translate, to_translate)
        return ([[clip.encode(text), {}]],)

