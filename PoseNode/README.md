# Set Poses in ComflyUI for ControlNet

## Changelog:

> 2024.02.15 - Add set background image (thanks **[techtruth](https://github.com/techtruth)**)

## Info

The ComfyUI server does not support overwriting files (it is easy fix), so the node has to create new images in the temp folder,
this folder itself is cleared when ComfyUI is restarted :)

## Description

I rewrite the main.js file as a class for use in ComfyUI, from **fkunn1326** openpose-editor (https://github.com/fkunn1326/openpose-editor/blob/master/javascript/main.js)

## Image use

Image shows how to use **PoseNode**, image also use my other node **TranslateCLIPTextEncodeNode** to translate russian text to english.
**Download** [workflow.json](https://raw.githubusercontent.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/master/PoseNode/workflow.json)
![Screenshot PoseNode connecting to ControlNet](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/PoseNode/pose_example.jpg)
