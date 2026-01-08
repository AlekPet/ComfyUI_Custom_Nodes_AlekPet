# ChatGLM nodes for ComfyUI

Translation is carried out with the help of artificial intelligence using GLM models.

<details>
<summary><strong>Language Codes List</strong></summary>

- af – Afrikaans
- sq – Albanian
- am – Amharic
- ar – Arabic
- hy – Armenian
- as – Assamese
- ay – Aymara
- az – Azerbaijani
- bm – Bambara
- eu – Basque
- be – Belarusian
- bn – Bengali
- bho – Bhojpuri
- bs – Bosnian
- bg – Bulgarian
- ca – Catalan
- ceb – Cebuano
- ny – Chichewa
- zh-CN – Chinese (Simplified)
- zh-TW – Chinese (Traditional)
- co – Corsican
- hr – Croatian
- cs – Czech
- da – Danish
- dv – Divehi
- doi – Dogri
- nl – Dutch
- en – English
- eo – Esperanto
- et – Estonian
- ee – Ewe
- tl – Filipino
- fi – Finnish
- fr – French
- fy – Frisian
- gl – Galician
- ka – Georgian
- de – German
- el – Greek
- gn – Guarani
- gu – Gujarati
- ht – Haitian Creole
- ha – Hausa
- haw – Hawaiian
- iw – Hebrew
- hi – Hindi
- hmn – Hmong
- hu – Hungarian
- is – Icelandic
- ig – Igbo
- ilo – Ilocano
- id – Indonesian
- ga – Irish
- it – Italian
- ja – Japanese
- jw – Javanese
- kn – Kannada
- kk – Kazakh
- km – Khmer
- rw – Kinyarwanda
- gom – Konkani
- ko – Korean
- kri – Krio
- ku – Kurdish (Kurmanji)
- ckb – Kurdish (Sorani)
- ky – Kyrgyz
- lo – Lao
- la – Latin
- lv – Latvian
- ln – Lingala
- lt – Lithuanian
- lg – Luganda
- lb – Luxembourgish
- mk – Macedonian
- mai – Maithili
- mg – Malagasy
- ms – Malay
- ml – Malayalam
- mt – Maltese
- mi – Maori
- mr – Marathi
- mni-Mtei – Meiteilon (Manipuri)
- lus – Mizo
- mn – Mongolian
- my – Myanmar (Burmese)
- ne – Nepali
- no – Norwegian
- or – Odia (Oriya)
- om – Oromo
- ps – Pashto
- fa – Persian
- pl – Polish
- pt – Portuguese
- pa – Punjabi
- qu – Quechua
- ro – Romanian
- ru – Russian
- sm – Samoan
- sa – Sanskrit
- gd – Scots Gaelic
- nso – Sepedi
- sr – Serbian
- st – Sesotho
- sn – Shona
- sd – Sindhi
- si – Sinhala
- sk – Slovak
- sl – Slovenian
- so – Somali
- es – Spanish
- su – Sundanese
- sw – Swahili
- sv – Swedish
- tg – Tajik
- ta – Tamil
- tt – Tatar
- te – Telugu
- th – Thai
- ti – Tigrinya
- ts – Tsonga
- tr – Turkish
- tk – Turkmen
- ak – Twi
- uk – Ukrainian
- ur – Urdu
- ug – Uyghur
- uz – Uzbek
- vi – Vietnamese
- cy – Welsh
- xh – Xhosa
- yi – Yiddish
- yo – Yoruba
- zu – Zulu

</details>

### Install and use:

1. Install my custom nodes in ComfyUI, used [HERE](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet#installing)
2. To use ChatGMLNode, you need to register on the site [bigmodel.cn](https://bigmodel.cn/) and get an API key. Free model is the `'glm-4-flash'`!
3. Inside folder **ChatGMLNode** find file `config.json.example` rename to config.json and add API key geting in point 2 in property `"ZHIPUAI_API_KEY": "your_api_key"` on your API Key.
4. Run comfyui and add node `ChatGLM4TranslateCLIPTextEncodeNode` or `ChatGLM4TranslateTextNode`.

Optional: You can also set initial language values ​​when creating nodes in the file `config.json` and default models.

```json
{
  "__comment": "Register on the site https://bigmodel.cn and get a key and add it to the field ZHIPUAI_API_KEY. Change default translate languages ​​'from' and 'to' you use",
  "from_translate": "ru",
  "to_translate": "en",
  "default_language_model": "glm-4.5-flash",
  "default_multimodal_model": "glm-4.6v-flash",
  "default_image_generate_model": "cogview-3-flash",
  "default_video_generate_model": "cogvideox-flash",
  "ZHIPUAI_API_KEY": "your_api_key"
}
```

> Includes:

> **ChatGLM4TranslateCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **ChatGLM4TranslateTextNode** - translate text and return text (STRING)
>
> **ChatGLM4InstructNode** - Generate prompt from instruct
>
> **ChatGLM4InstructMediaNode** - Generate prompt from instruct to describe what is shown in the media
>
> **CogViewImageGenerateNode** - Generates an image based on a text prompt.
>
> **CogVideoXGenerateNode** - Generates an video based on a text prompt or image.

## Image:

![ChatGLMTranslateNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/ChatGLMNode/image_ChatGLM_translate_node.jpg)

**Used** **Zhipu AI**: https://bigmodel.cn/
