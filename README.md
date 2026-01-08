# ComfyUI Custom Nodes

Custom nodes that extend the capabilities of [ComfyUI](https://github.com/comfyanonymous/ComfyUI)

## Supporting me 💖

If you enjoy my work, consider **[supporting me](https://alekpet.github.io/support)**. Your help means a lot and allows me to keep creating new and exciting projects. Thank you!

# List Nodes:

| Name                                                                                                                             |                                                     Description                                                      |     ComfyUI category      |
| :------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------: | :-----------------------: |
| [**PoseNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/PoseNode)                                     |                                             The node set pose ControlNet                                             |    AlekPet Node/image     |
| [**PainterNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/PainterNode)                               |                            The node set sketch, scrumble image ControlNet and other nodes                            |    AlekPet Node/image     |
| [**GoogleTranslateTextNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/GoogleTranslateNode)           |       The node translate promt uses module **googletrans** from other languages into english and return string       | AlekPet Node/conditioning |
| [**GoogleTranslateCLIPTextEncodeNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/GoogleTranslateNode) |   The node translate promt uses module **googletrans** from other languages into english, and return conditioning    |     AlekPet Node/text     |
| [**DeepTranslatorTextNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/DeepTranslatorNode)             |     The node translate promt uses module **Deep Translator** from other languages into english and return string     |     AlekPet Node/text     |
| [**DeepTranslatorCLIPTextEncodeNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/DeepTranslatorNode)   | The node translate promt uses module **Deep Translator** from other languages into english, and return conditioning  | AlekPet Node/conditioning |
| [**ArgosTranslateTextNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ArgosTranslateNode)             |    The node translate promt uses module **Argos Translator** from other languages into english and return string     |     AlekPet Node/text     |
| [**ArgosTranslateCLIPTextEncodeNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ArgosTranslateNode)   | The node translate promt uses module **Argos Translator** from other languages into english, and return conditioning | AlekPet Node/conditioning |
| [**ChatGLM4TranslateTextNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ChatGLMNode)                 |               This translator node uses artificial intelligence to translate prompts and return string               |     AlekPet Node/text     |
| [**ChatGLM4TranslateCLIPTextEncodeNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ChatGLMNode)       |            This translator node uses artificial intelligence to translate prompts and return conditioning            | AlekPet Node/conditioning |
| [**ChatGLM4InstructNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ChatGLMNode)                      |                              This node uses artificial intelligence to generate prompt                               |   AlekPet Node/Instruct   |
| [**ChatGLM4InstructMediaNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ChatGLMNode)                 |                    This node uses artificial intelligence to describe what is shown in the media                     |   AlekPet Node/Instruct   |
| [**CogViewImageGenerateNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ChatGLMNode)                  |                            This is a node that generates an image based on a text prompt                             |    AlekPet Node/image     |
| [**CogVideoXGenerateNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ChatGLMNode)                     |                       This is a node that generates an video based on a text prompt or image.                        |    AlekPet Node/video     |
| [**PreviewTextNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode)                            |                                           The node displays the input text                                           |    AlekPet Node/extras    |
| [**ColorsCorrectNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode)                          |                                         The node for correcting image colors                                         |    AlekPet Node/extras    |
| [**HexToHueNode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode)                               |                          The node convert HEX color to HUE (degrees and normal [-0.5, 0.5])                          |    AlekPet Node/extras    |
| [**IDENode**](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/IDENode)                                       |          The node that allows you to run code written in **Python** or **Javascript** directly in the node           | AlekPet Node/experiments  |

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
