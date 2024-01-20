# Translate nodes for ComfyUI

Custom nodes for ComfyUI, translate promt from other languages into english

> Includes:
> **TranslateCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **TranslateTextNode** - translte text and return text (STRING)
>
> **DeepTranslatorCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **DeepTranslatorTextNode** - translte text and return text (STRING)

## Changelog:

> 2024.01.20 - Added support used official key api for googletranslate (add to the enviroment key: **GOOGLE_TRANSLATION_API_KEY** and your key value)
> 
> 2023.12.14 - Added button **"Manual translate"** for the translate manualy it is need when words not need translate, example **LoRa words**

## TranslateTextNode and TranslateCLIPTextEncodeNode

Used module **googletrans**: https://pypi.org/project/googletrans/

> Use your key if you have it to bypass the number of queries in Google, enter for your system enviroment key **GOOGLE_TRANSLATION_API_KEY** and value key.

## Image:

![TranslateCLIPTextEncodeNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/TranslateNode/image_Translate_Node.jpg)

## DeepTranslatorTextNode and DeepTranslatorCLIPTextEncodeNode

Used module **deep_translator**: https://pypi.org/project/deep-translator/

**Info nodes:**

> **The settings nodes are in the config.json file**

> You can select a service for text translation in the service field. In the description of the service there is a note asking whether **api_key** is required, if required, enter the appropriate values in the authorization field.

**Example:**

```
api_key=your_api_key
```

**Proxyes:**

> You can also specify a proxy for both http and https

**Example:**

```
https=34.195.196.27:8080
http=34.195.196.27:8080
```

## Image:

![DeepTranslatorCLIPTextEncodeNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/TranslateNode/image_DeepTranslator_Node.jpg)
