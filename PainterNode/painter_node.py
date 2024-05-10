import hashlib
import os
import json
from server import PromptServer
from aiohttp import web
import base64
from io import BytesIO
import asyncio
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

# Piping image
PAINTER_DICT = {} # Painter nodes dict instances

def toBase64ImgUrl(img):
    bytesIO = BytesIO()
    img.save(bytesIO, format="PNG")
    img_types = bytesIO.getvalue()
    img_base64 = base64.b64encode(img_types)
    return f"data:image/png;base64,{img_base64.decode('utf-8')}"

@PromptServer.instance.routes.post("/alekpet/check_canvas_changed")
async def check_canvas_changed(request):
    json_data = await request.json()
    painter_id = json_data.get("painter_id", None)
    is_ok = json_data.get("is_ok", False)
    if "painter_id" in json_data and painter_id is not None and painter_id in PAINTER_DICT and "is_ok" in json_data and is_ok == True:
        PAINTER_DICT[painter_id].canvas_set = True
        return web.json_response({"status": "Ok"})
    
    return web.json_response({"status": "Error"})

@PromptServer.instance.routes.get("/alekpet/get_input_image/id={painter_id}&time={time}")
async def get_image(request):
    painter_id = request.match_info["painter_id"]
    if(painter_id is not None and painter_id in PAINTER_DICT):
        return web.json_response({"get_input_image": PAINTER_DICT[painter_id].input_images,})
    
    return web.json_response({"get_input_image": [],})    


async def wait_canvas_change(unique_id, time_out = 40):
    for _ in range(time_out):
        if hasattr(PAINTER_DICT[unique_id], 'canvas_set') and PAINTER_DICT[unique_id].canvas_set == True:
            PAINTER_DICT[unique_id].canvas_set = False
            return True
        
        await asyncio.sleep(0.1)
        
    return False
# end - Piping image


class PainterNode(object):

    @classmethod
    def INPUT_TYPES(self):
        self.input_images = list()
        self.canvas_set = False

        work_dir = folder_paths.get_input_directory()
        imgs = [img for img in os.listdir(work_dir) if os.path.isfile(os.path.join(work_dir, img))]

        return {
            "required": { "image": (sorted(imgs), )},
            "hidden": { "unique_id":"UNIQUE_ID", },
            "optional": { "images": ("IMAGE",) }
            }


    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "painter_execute"

    CATEGORY = "AlekPet Nodes/image"

    def painter_execute(self, image, unique_id, images=None):
        # Piping image input
        if unique_id not in PAINTER_DICT:
            PAINTER_DICT[unique_id] = self
            
        if images is not None:

            PAINTER_DICT[unique_id].input_images = None
            input_images = []

            for imgs in images:
                i = 255. * imgs.cpu().numpy()
                i = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)) 
                input_images.append(toBase64ImgUrl(i))        


            PAINTER_DICT[unique_id].input_images = input_images
            PAINTER_DICT[unique_id].canvas_set = False     
            
            if not asyncio.run(wait_canvas_change(unique_id)):
                print(f"Painter_{unique_id}: Failed to get image!")
            else:
                print(f"Painter_{unique_id}: Image received, canvas changed!")
        # end - Piping image input                
      
        
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
    def IS_CHANGED(self, image, unique_id, images=None):
        if images is not None:  
            PAINTER_DICT[unique_id].input_images = None
        
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
            
        return float("nan")


    @classmethod
    def VALIDATE_INPUTS(self, image, unique_id, images=None):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True
