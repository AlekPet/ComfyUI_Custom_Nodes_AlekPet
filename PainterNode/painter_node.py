import hashlib
import os
import json
from server import PromptServer
from aiohttp import web
from PIL import Image, ImageOps
import torch
import numpy as np
import folder_paths

# Directory node save settings
CHUNK_SIZE = 1024
dir_painter_node = os.path.dirname(__file__)
extension_path = os.path.join(os.path.abspath(dir_painter_node))
file_settings_path = os.path.join(extension_path,"settings_nodes.json")

# Function create file json file
def create_settings_json(filename="settings_nodes.json"):
    json_file = os.path.join(extension_path, filename)
    if not os.path.exists(json_file):
        print("File settings_nodes.json is not found! Create file!")
        with open(json_file, "w") as f:
            json.dump({}, f)
 
def get_settings_json(filename="settings_nodes.json", notExistCreate=True):
    json_file = os.path.join(extension_path, filename)
    if os.path.isfile(json_file):
        f = open(json_file, "rb")
        try:
            load_data = json.load(f)
            return load_data
        except Exception as e:
            print("Error load json file: ",e)
            if notExistCreate:
                f.close()
                os.remove(json_file)
                create_settings_json()
        finally:
            f.close()
            
    return {}    

# Load json file       
@PromptServer.instance.routes.get("/alekpet/loading_node_settings")
async def loadingSettings(request):
    load_data = get_settings_json()                           
    return web.json_response({"settings_nodes": load_data})

# Save data to json file 
@PromptServer.instance.routes.post("/alekpet/save_node_settings")
async def saveSettings(request):
    try:
        with open(file_settings_path, "wb") as f:
            while True:
                chunk = await request.content.read(CHUNK_SIZE)
                if not chunk:
                    break
                f.write(chunk)        
        
        return web.json_response({"message": "Painter data saved successfully"}, status=200)

    except Exception as e:
        print("Error save json file: ", e)
        
# create file json 
create_settings_json()

class PainterNode(object):
    @classmethod
    def INPUT_TYPES(self):
        work_dir = folder_paths.get_input_directory()
        images = [img for img in os.listdir(work_dir) if os.path.isfile(os.path.join(work_dir, img))]
        return {"required":
                    {"image": (sorted(images), )},
                }


    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "painter_execute"

    CATEGORY = "AlekPet Nodes/image"

    def painter_execute(self, image):
        image_path = folder_paths.get_annotated_filepath(image)

        i = Image.open(image_path)
        i = ImageOps.exif_transpose(i)
        image = i.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]
        if 'A' in i.getbands():
            mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
            mask = 1. - torch.from_numpy(mask)
        else:
            mask = torch.zeros((64,64), dtype=torch.float32, device="cpu")
        return (image, mask.unsqueeze(0))

    @classmethod
    def IS_CHANGED(self, image):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(self, image):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True
