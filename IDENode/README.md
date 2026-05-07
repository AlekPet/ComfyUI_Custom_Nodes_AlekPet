# IDE Node

![Screenshot IDE Node](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/IDENode/ide_node_image.png)

**IDE Node** is an experimental node that allows you to run code written in **Python** or **Javascript** directly in the node, it is also possible to receive input data, which is stored in variables, process and output the result.

# Changelog:

- 2026.04.19: Implemented save, load, rename, remove your code and change visual design

- 2024.08.28: Implemented add output variables and types

# Features:

- Selecting a syntax highlighting theme
- Choosing a programming language
- Load, save, rename, remove your written code
- Feature add inputs and outputs
- Feature remove inputs and outputs

# Note:

The `result` variable is used for output
The F1 key in the editor brings up additional settings ([Default-Keyboard-Shortcuts](https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts))

# IDE Node workflows

## Translate code

**The OPUS-MT model is used (https://github.com/Helsinki-NLP/Opus-MT), but others can be used if you adjust the code.**

To use, you need to select the required model for your language, here https://huggingface.co/Helsinki-NLP?sort_models=downloads#models (I use "Helsinki-NLP/opus-mt-ru-en", you can change the abbreviations at the end to your own)

**Simple example:**
![Screenshot IDE Node Translate OPUS-MT Simple](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/IDENode/image_idenode_translate_ai_simple.jpg)

**Workflow example:**
![Screenshot IDE Node Translate OPUS-MT Workflow](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/IDENode/image_idenode_translate_ai.jpg)

**Drag image to ComfyUI open workflow:**
![Screenshot Drag image to ComfyUI open workflow](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/IDENode/AI_Translate_OPUS-MT_IDENode_workflow.png)

Workflow link: [Workflow ai_translate_opus-mt_idenode_workflow.json](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/example_workflows/ai_translate_opus-mt_idenode_workflow.json)

**Updated version IDENode load code**
![Screenshot IDE Node Load Code](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/IDENode/IDENode_load_code.png)

**Note:** There are two folders `python` and `javascipt` along the path `..\custom_nodes\ComfyUI_Custom_Nodes_AlekPet\web_alekpet_nodes\lib\idenode\codes` where the json files with the codes are saved. There are also test files `add.json.example` (remove `.example` for them to work).

**Format JSON codes:**

```json
{
  "language": "python",
  "inputs": [
    { "name": "a", "type": "*" },
    { "name": "b", "type": "*" }
  ],
  "outputs": [{ "name": "result", "type": "*" }],
  "code": "result = a + b"
}
```

**Properties:**
_language_ - python or javascript
_inputs_ - inputs (name and type)
_outputs_ - outputs (name and type)
_code_ - the code itself
