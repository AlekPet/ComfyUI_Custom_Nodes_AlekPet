# DeepLX nodes for ComfyUI, for translating prompts into other languages.

Powerful Free DeepL API, No Token Required. Used module [DeepLX](https://github.com/OwO-Network/DeepLX) .

### Languages supported:

[List languages supported](https://developers.deepl.com/docs/getting-started/supported-languages)

<details>
  <summary><strong>Source Languages</strong></summary>

- Arabic: AR
- Bulgarian: BG
- Czech: CS
- Danish: DA
- German: DE
- Greek: EL
- English: EN
- Spanish: ES
- Estonian: ET
- Finnish: FI
- French: FR
- Hungarian: HU
- Indonesian: ID
- Italian: IT
- Japanese: JA
- Korean: KO
- Lithuanian: LT
- Latvian: LV
- Norwegian Bokmål: NB
- Dutch: NL
- Polish: PL
- Portuguese: PT
- Romanian: RO
- Russian: RU
- Slovak: SK
- Slovenian: SL
- Swedish: SV
- Turkish: TR
- Ukrainian: UK
- Chinese: ZH

</details>

<details>
  <summary><strong>Target Languages</strong></summary>

- Arabic: AR
- Bulgarian: BG
- Czech: CS
- Danish: DA
- German: DE
- Greek: EL
- English: EN
- English (British): EN-GB
- English (American): EN-US
- Spanish: ES
- Estonian: ET
- Finnish: FI
- French: FR
- Hungarian: HU
- Indonesian: ID
- Italian: IT
- Japanese: JA
- Korean: KO
- Lithuanian: LT
- Latvian: LV
- Norwegian Bokmål: NB
- Dutch: NL
- Polish: PL
- Portuguese: PT
- Portuguese (Brazilian): PT-BR
- Portuguese (all Portuguese variants excluding Brazilian Portuguese): PT-PT
- Romanian: RO
- Russian: RU
- Slovak: SK
- Slovenian: SL
- Swedish: SV
- Turkish: TR
- Ukrainian: UK
- Chinese: ZH
- Chinese (simplified): ZH-HANS
- Chinese (traditional): ZH-HANT

</details>

### Install and use:

1. Install my custom nodes in ComfyUI, used [HERE](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet#installing)
2. Download zip archive Golang (programming language) from your system (Widnows, Linux ...) [Download Golang](https://go.dev/dl/)
3. Extract archive (inside archive folder `go`) in the folder `\ComfyUI\custom_nodes\ComfyUI_Custom_Nodes_AlekPet\DeepLXTranslateNode`
4. Open shell and run command `git clone https://github.com/OwO-Network/DeepLX` (you need install Git if not exists [Git](https://git-scm.com/downloads)) in the folder `\ComfyUI\custom_nodes\ComfyUI_Custom_Nodes_AlekPet\DeepLXTranslateNode`
   **Structure folders:**

   ```ComfyUI_portables\
        ComfyUI\
           custom_nodes\
               ComfyUI_Custom_Nodes_AlekPet\
                   DeepLXTranslateNode\
                       go\
                       DeepLX\
   ```

5. Run comfyui and add node `DeepLXTranslateCLIPTextEncodeNode` or `DeepLXTranslateTextNode` context menu in the category `CONDITIONING`.

> Includes:

> **DeepLXTranslateCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **DeepLXTranslateTextNode** - translate text and return text (STRING)

## Image:

![DeepLXTranslateNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/DeepLXTranslateNode/image_deeplx_translate_node.jpg)
