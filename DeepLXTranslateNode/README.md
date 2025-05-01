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
- Chinese (simplified): ZH-HANS
- Chinese (traditional): ZH-HANT

</details>

### Autoinstaller

**Golang (Go)** and **DeepLX** installation occurs automatically if the **Go** or **DeepLX** directory is missing.

You can also call the automatic installer by running shell `run_install_deeplx_windows.cmd` or `run_install_deeplx_linux.sh` for your platform.

**_Note: If you encounter any problems, you can use manual installation._**

### Manual install and use:

1. Install my custom nodes in ComfyUI, used [HERE](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet#installing)
2. Download zip archive Golang (programming language) from your system (Widnows, Linux ...) [Download Golang](https://go.dev/dl/)
3. Extract archive (inside archive folder `go`) in the folder `\ComfyUI\custom_nodes\ComfyUI_Custom_Nodes_AlekPet\DeepLXTranslateNode`
4. Open shell in the folder `\ComfyUI\custom_nodes\ComfyUI_Custom_Nodes_AlekPet\DeepLXTranslateNode` and run command `git clone https://github.com/OwO-Network/DeepLX` (you need install Git if not exists [Git](https://git-scm.com/downloads))

**Structure folders:**

![DeepLXTranslateNode structures folders](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/DeepLXTranslateNode/image_deeplx_structures_folders.png)

5. Run comfyui (**see note after**) and add node `DeepLXTranslateCLIPTextEncodeNode` or `DeepLXTranslateTextNode` context menu in the category `CONDITIONING`.
6. [Optional] If you are in **CH**, you need in the `\ComfyUI\custom_nodes\ComfyUI_Custom_Nodes_AlekPet\DeepLXTranslateNode\go`, edit file **go.env**, modify this line `GOPROXY=https://proxy.golang.org,direct` to `GOPROXY=https://goproxy.cn,direct` [Thanks tongpeng1988](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/issues/136#issuecomment-2804126821) .

**_Note: The first launch may fail, Golang is installing packages for DeepLX, just restart ComfyUI!_**

### Note

On first launch, a `config.json` file will be created where you can specify the initial values ​​from which language to translate and to which language.
**Default config.json values:**

```json
{
  "settings": {
    "__commnet": "Please check the list of available languages ​​before specifying, especially target_lang! See README file",
    "source_lang": "Russian",
    "target_lang": "English"
  }
}
```

> Includes:

> **DeepLXTranslateCLIPTextEncodeNode** - translate text, and return CONDITIONING
>
> **DeepLXTranslateTextNode** - translate text and return text (STRING)

## Image:

![DeepLXTranslateNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/DeepLXTranslateNode/image_deeplx_translate_node.jpg)
