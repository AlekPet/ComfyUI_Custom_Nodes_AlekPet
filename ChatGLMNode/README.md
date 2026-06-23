# ChatGLM nodes for ComfyUI

Translation is carried out with the help of artificial intelligence using GLM models.

## Use any OpenAI-compatible backend (e.g. Atlas Cloud)

<p align="center">
  <a href="https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=ComfyUI_Custom_Nodes_AlekPet">
    <img src="./atlas-cloud-logo.png" alt="Atlas Cloud" width="200">
  </a>
</p>

> 🎁 **[Atlas Cloud](https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=ComfyUI_Custom_Nodes_AlekPet)** is a full-modal, OpenAI-compatible AI inference platform. Since the text/instruct nodes here call a standard `/chat/completions` endpoint, you can point them at Atlas Cloud to use DeepSeek, Qwen, GLM, Kimi, MiniMax and more through a single API — no code changes, just config. Budget-friendly: [coding plan](https://www.atlascloud.ai/console/coding-plan).

The text/instruct nodes (`ChatGLM4TranslateTextNode`, `ChatGLM4TranslateCLIPTextEncodeNode`, `ChatGLM4InstructNode`, `ChatGLM4InstructMediaNode`) talk to an OpenAI-compatible Chat Completions API. In `config.json` set the optional `base_url` to switch backend; leave it empty to keep the default **Zhipu AI** behaviour:

```json
{
  "base_url": "https://api.atlascloud.ai/v1",
  "default_language_model": "deepseek-ai/deepseek-v4-pro",
  "ZHIPUAI_API_KEY": "<your-atlascloud-api-key>"
}
```

- `base_url` empty/missing → uses Zhipu AI (`https://open.bigmodel.cn/api/paas/v4`), unchanged.
- `ZHIPUAI_API_KEY` carries the bearer token for whichever backend you choose.
- `deepseek-ai/deepseek-v4-pro` is a reasoning model — give it enough `max_tokens` (>= 512).
- Only the text/instruct (chat) nodes use `base_url`; the GLM image/video nodes still use Zhipu AI.

<details>
<summary>All Atlas Cloud chat models (59)</summary>

- Anthropic (Claude): `anthropic/claude-haiku-4.5-20251001`, `anthropic/claude-opus-4.8`, `anthropic/claude-sonnet-4.6`
- OpenAI (GPT): `openai/gpt-5.4`, `openai/gpt-5.5`
- Google (Gemini): `google/gemini-3.1-flash-lite`, `google/gemini-3.1-pro-preview`, `google/gemini-3.5-flash`
- Alibaba Qwen: `qwen/qwen2.5-7b-instruct`, `Qwen/Qwen3-235B-A22B-Instruct-2507`, `qwen/qwen3-235b-a22b-thinking-2507`, `qwen/qwen3-30b-a3b`, `Qwen/Qwen3-30B-A3B-Instruct-2507`, `qwen/qwen3-30b-a3b-thinking-2507`, `qwen/qwen3-32b`, `qwen/qwen3-8b`, `Qwen/Qwen3-Coder`, `qwen/qwen3-coder-next`, `qwen/qwen3-max-2026-01-23`, `Qwen/Qwen3-Next-80B-A3B-Instruct`, `Qwen/Qwen3-Next-80B-A3B-Thinking`, `Qwen/Qwen3-VL-235B-A22B-Instruct`, `qwen/qwen3-vl-235b-a22b-thinking`, `qwen/qwen3-vl-30b-a3b-instruct`, `qwen/qwen3-vl-30b-a3b-thinking`, `qwen/qwen3-vl-8b-instruct`, `qwen/qwen3.5-122b-a10b`, `qwen/qwen3.5-27b`, `qwen/qwen3.5-35b-a3b`, `qwen/qwen3.5-397b-a17b`, `qwen/qwen3.6-35b-a3b`, `qwen/qwen3.6-plus`
- DeepSeek: `deepseek-ai/deepseek-ocr`, `deepseek-ai/deepseek-r1-0528`, `deepseek-ai/DeepSeek-V3-0324`, `deepseek-ai/DeepSeek-V3.1`, `deepseek-ai/DeepSeek-V3.1-Terminus`, `deepseek-ai/deepseek-v3.2`, `deepseek-ai/DeepSeek-V3.2-Exp`, `deepseek-ai/deepseek-v4-flash`, `deepseek-ai/deepseek-v4-pro`
- Moonshot (Kimi): `moonshotai/Kimi-K2-Instruct`, `moonshotai/Kimi-K2-Instruct-0905`, `moonshotai/Kimi-K2-Thinking`, `moonshotai/kimi-k2.5`, `moonshotai/kimi-k2.6`
- Zhipu GLM: `zai-org/GLM-4.6`, `zai-org/glm-4.7`, `zai-org/glm-5`, `zai-org/glm-5-turbo`, `zai-org/glm-5.1`, `zai-org/glm-5v-turbo`
- MiniMax: `MiniMaxAI/MiniMax-M2`, `minimaxai/minimax-m2.1`, `minimaxai/minimax-m2.5`, `minimaxai/minimax-m2.7`
- xAI: `xai/grok-4.3`
- Kuaishou KAT: `kwaipilot/kat-coder-pro-v2`
- Other: `owl`

</details>

---


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

Optional: You can also set initial language values when creating nodes in the file `config.json` and default models.

```json
{
  "__comment": "Register on the site https://bigmodel.cn and get a key and add it to the field ZHIPUAI_API_KEY. Change default translate languages 'from' and 'to' you use",
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
> **ChatGLMImageGenerateNode** - Generates an image based on a text prompt.
>
> **ChatGLMVideoGenerateNode** - Generates an video based on a text prompt or image.

## Image:

![ChatGLMTranslateNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/ChatGLMNode/image_ChatGLM_translate_node.jpg)

**Used** **Zhipu AI**: https://bigmodel.cn/
