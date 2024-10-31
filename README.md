# ComfyUI Custom Nodes

Custom nodes that extend the capabilities of [ComfyUI](https://github.com/comfyanonymous/ComfyUI)

# List Nodes:

| Name                                  |                                                     Description                                                      |     ComfyUI category      |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------: | :-----------------------: |
| _PoseNode_                            |                                             The node set pose ControlNet                                             |    AlekPet Node/image     |
| _PainterNode_                         |                            The node set sketch, scrumble image ControlNet and other nodes                            |    AlekPet Node/image     |
| _GoogleTranslateTextNode_             |       The node translate promt uses module **googletrans** from other languages into english and return string       | AlekPet Node/conditioning |
| _GoogleTranslateCLIPTextEncodeNode_   |   The node translate promt uses module **googletrans** from other languages into english, and return conditioning    |     AlekPet Node/text     |
| _DeepTranslatorTextNode_              |     The node translate promt uses module **Deep Translator** from other languages into english and return string     |     AlekPet Node/text     |
| _DeepTranslatorCLIPTextEncodeNode_    | The node translate promt uses module **Deep Translator** from other languages into english, and return conditioning  | AlekPet Node/conditioning |
| _ArgosTranslateTextNode_              |    The node translate promt uses module **Argos Translator** from other languages into english and return string     |     AlekPet Node/text     |
| _ArgosTranslateCLIPTextEncodeNode_    | The node translate promt uses module **Argos Translator** from other languages into english, and return conditioning | AlekPet Node/conditioning |
| _ChatGLM4TranslateTextNode_           |               This translator node uses artificial intelligence to translate prompts and return string               |     AlekPet Node/text     |
| _ChatGLM4TranslateCLIPTextEncodeNode_ |            This translator node uses artificial intelligence to translate prompts and return conditioning            | AlekPet Node/conditioning |
| _PreviewTextNode_                     |                                           The node displays the input text                                           |    AlekPet Node/extras    |
| _ColorsCorrectNode_                   |                                         The node for correcting image colors                                         |    AlekPet Node/extras    |
| _HexToHueNode_                        |                          The node convert HEX color to HUE (degrees and normal [-0.5, 0.5])                          |    AlekPet Node/extras    |
| _IDENode_                             |          The node that allows you to run code written in **Python** or **Javascript** directly in the node           | AlekPet Node/experiments  |

# Installing

1. Download from github repositorie ComfyUI_Custom_Nodes_AlekPet, extract folder ComfyUI_Custom_Nodes_AlekPet, and put in custom_nodes

**Folder stucture:**

```
custom_nodes
   |-- ComfyUI_Custom_Nodes_AlekPet
       |---- folders nodes
       |---- __init__.py
       |---- LICENSE
       |---- README.md
```

2. Run Comflyui and nodes will be installed automatically....

# Installing use git

1. Install [Git](https://git-scm.com/)
2. Go to folder ..\ComfyUI\custom_nodes
3. Run cmd.exe
   > **Windows**:
   >
   > > **Variant 1:** In folder click panel current path and input **cmd** and press **Enter** on keyboard
   > >
   > > **Variant 2:** Press on keyboard Windows+R, and enter cmd.exe open window cmd, enter **cd /d your_path_to_custom_nodes**, **Enter** on keyboard
4. Enter `git clone https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet.git`
5. After this command be created folder ComfyUI_Custom_Nodes_AlekPet
6. Run Comflyui....
