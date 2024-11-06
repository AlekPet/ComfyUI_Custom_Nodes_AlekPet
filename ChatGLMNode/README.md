# ChatGLM nodes for ComfyUI

Translation is carried out with the help of artificial intelligence using GLM models.

### Install and use:

1. Install my custom nodes in ComfyUI, used [HERE](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet#installing)
2. To use ChatGMLNode, you need to register on the site [bigmodel.cn](https://bigmodel.cn/) and get an API key. Free model is the `'glm-4-flash'`!
3. Inside folder **ChatGMLNode** find file `config.json` and add API key geting in point 2, and change `"ZHIPUAI_API_KEY": "your_api_key"` on your API Key.
4. Run comfyui and add node `ChatGLM4TranslateCLIPTextEncodeNode` or `ChatGLM4TranslateTextNode`.

> Includes:

> **ChatGLM4TranslateCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **ChatGLM4TranslateTextNode** - translate text and return text (STRING)

## Image:

![ChatGLMTranslateNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/ChatGLMNode/image_ChatGLM_translate_node.jpg)

**Used** **Zhipu AI**: https://bigmodel.cn/
