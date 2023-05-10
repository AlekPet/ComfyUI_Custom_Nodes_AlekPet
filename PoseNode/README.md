# Set Poses in ComflyUI for ControlNet

## Info
The ComfyUI server does not support overwriting files (it is easy fix), so the node has to create new images in the temp folder,
this folder itself is cleared when ComfyUI is restarted :)

## Description
I rewrite the main.js file as a class for use in ComfyUI, from **fkunn1326** openpose-editor (https://github.com/fkunn1326/openpose-editor/blob/master/javascript/main.js)

## Image use
Image shows how to use __PoseNode__, image also use my other node __TranslateCLIPTextEncodeNode__ to translate russian text to english.
__Download__ [workflow.json](https://raw.githubusercontent.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/master/PoseNode/workflow.json) 
![Screenshot PoseNode connecting to ControlNet](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/PoseNode/pose_example.jpg)
