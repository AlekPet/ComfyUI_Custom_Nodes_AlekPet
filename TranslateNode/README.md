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

## TranslateTextNode and TranslateCLIPTextEncodeNode

Used module **googletrans**: https://pypi.org/project/googletrans/

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
