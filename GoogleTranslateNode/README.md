# Google Translate nodes for ComfyUI

Custom nodes for ComfyUI, translate promt from other languages into english

> Includes:
> **GoogleTranslateCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **GoogleTranslateTextNode** - translte text and return text (STRING)

## Changelog:

> 2024.01.20 - Added support used official key api for googletranslate (add to the enviroment key: **GOOGLE_TRANSLATION_API_KEY** and your key value)
>
> 2023.12.14 - Added button **"Manual translate"** for the translate manualy it is need when words not need translate, example **LoRa words**

## GoogleTranslateTextNode and GoogleTranslateCLIPTextEncodeNode

Used module **googletrans**: https://pypi.org/project/googletrans/

> Use your key if you have it to bypass the number of queries in Google, enter for your system enviroment key **GOOGLE_TRANSLATION_API_KEY** and value key.

## Image:

![TranslateCLIPTextEncodeNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/GoogleTranslateNode/image_Google_Translate_Node.jpg)
