from pathlib import Path
import types
from server import PromptServer
from aiohttp import web
import time
import json
import re
from functools import wraps

# Directory node
DIR_IDENODE = Path(__file__)

# Directory with codes
DIR_IDENODE_CODES = DIR_IDENODE.parents[1] / "web_alekpet_nodes" / "lib" / "idenode" / "codes"

# Valid code save extensions
VALID_FILE_CODE_EXTENSIONS = (".json")

remove_type_name = re.compile(r"(\{.*\})", re.I | re.M)

# Hack: string type that is always equal in not equal comparisons, thanks pythongosssss
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False


PY_CODE = AnyType("*")
IDEs_DICT = {}


def isFileName(filename):
    if (
        not filename
        or filename is None
        or (type(filename) == str and filename.strip() == "")
    ):
        print("Filename is incorrect")
        return False
    return True


def getFilesInDir(folder, ext="*.json"):
    if not folder.exists():
        raise ValueError(f"[IDENode] Not found directory '{folder}'!")

    list_files = [item.name for item in folder.rglob(ext) if not item.is_dir()]
    return list_files     


# Check javascript complete
@PromptServer.instance.routes.post("/alekpet/ide_node_check_js_complete")
async def check_js_complete(request):
    json_data = await request.json()
    unique_id = json_data.get("unique_id", None)
    result_code = json_data.get("result_code", None)

    if (
        unique_id is not None
        and unique_id in IDEs_DICT
        and result_code
        and result_code is not None
    ):
        IDEs_DICT[unique_id].js_result = result_code
        IDEs_DICT[unique_id].js_complete = True
        return web.json_response({"status": "Ok", "message": "The JavaScript code is completed!"},
        status=200)

    return web.json_response({"status": "Error", "message": "The JavaScript code will be executed..."},
        status=200)


# ------------ START -> CODE MANAGER ------------
def validate_ide_params(func):
    @wraps(func)
    async def wrapper(request, *args, **kwargs):
        try:
            language = request.match_info.get("language")
            filename = request.match_info.get("filename")

            if request.method == "POST" and request.has_body:
                data = await request.json()
                language = language or data.get("language")
                filename = filename or data.get("filename")

            if not isFileName(filename):
                return web.json_response(
                    {"status": "error", "message": "Filename code is incorrect!"}, status=400
                )
            
            if not language or not language.strip():
                return web.json_response(
                    {"status": "error", "message": "The programming language is incorrect!"}, status=400
                )

            return await func(request)

        except Exception as e:
            return web.json_response(
                {"status": "error", "message": f"Error: {str(e)}"}, status=500
            )
    return wrapper


# Load codes
@PromptServer.instance.routes.get("/alekpet/ide_node_load_codes/{language}")
async def load_codes(request):
    language = request.match_info.get("language", "python")
    list_codes = getFilesInDir(DIR_IDENODE_CODES / language)

    return web.json_response({"status": "Ok", "codes": list_codes, "language": language}, status=200)


# Check file exists in directory
@PromptServer.instance.routes.get("/alekpet/ide_node_check_exists/{language}/{filename}")
@validate_ide_params
async def check_exists(request):
    try:
        language = request.match_info.get("lang")
        filename = request.match_info.get("filename")
        
        is_file_exists = filename.strip() in getFilesInDir(DIR_IDENODE_CODES / language.strip())
        return web.json_response(
            {
                "status": "Ok",
                "exists": is_file_exists,
                "message": f"Filename '{filename}' is {'exists' if is_file_exists else 'not exists'}!",
            },
            status=200
            )

    except Exception as e:
        return web.json_response({"status": "error", "message": f"Error: {e}"}, status=500)


# Save code in file
@PromptServer.instance.routes.post("/alekpet/ide_node_save_code")
@validate_ide_params
async def save_code(request):
    try:
        json_data = await request.json()
        inputs = json_data.get("inputs", [])
        outputs = json_data.get("outputs", [])
        code = json_data.get("code", "")
        language = json_data.get("language", "python")
        filename = json_data.get("filename")
           
        json_data = {
             "language": language,
             "inputs": inputs,
             "outputs": outputs,
             "code": code,
        }

        save_path = DIR_IDENODE_CODES / language / filename

        # Check valid extension
        if not save_path.suffix.strip():
             save_path = save_path.with_suffix('.json')

        if not save_path.suffix.lower().strip() in VALID_FILE_CODE_EXTENSIONS:
            return web.json_response(
                {
                    "status": "error",
                    "message": f"Invalid file '{save_path.suffix.strip()}' extension! (valid extensions {','.join(VALID_FILE_CODE_EXTENSIONS)})",
                },
                status=200)


        with open(save_path, "w+", encoding="utf-8", errors="replace") as file:
            json.dump(json_data, file, ensure_ascii=False, indent=2)

            list_codes = getFilesInDir(DIR_IDENODE_CODES / language)
            return web.json_response(
                {
                    "status": "Ok",
                    "codes": list_codes,
                    "language": language,
                    "message": f"Code from '{language}' save to '{save_path.name}' successfully!",
                },
                status=200,
            )

    except OSError as e:
        return web.json_response(
        {
            "status": "error",                
            "message": "Error: %s - %s." % (e.filename, e.strerror)
        }, status=500
    )
    except Exception as e:
        return web.json_response({
            "status": "error",
            "message": e
        }, status=500
    )


# Remove file code
@PromptServer.instance.routes.post("/alekpet/ide_node_remove_code")
@validate_ide_params
async def remove_code(request):
    try:
        json_data = await request.json()
        language = json_data.get("language", "python")
        filename = json_data.get("filename")

        pathFileName = DIR_IDENODE_CODES / language.strip() / filename

        if Path.exists(pathFileName):
            pathFileName.unlink(missing_ok=True)

            list_codes = getFilesInDir(DIR_IDENODE_CODES / language)
            return web.json_response(
                {
                    "status": "Ok",
                    "codes": list_codes,
                    "message": f"Filename '{filename}' deleted successfully!",
                },
                status=200,
            )
        else:
            return web.json_response(
                {
                    "status": "error",
                    "message": f"Filename '{filename}' not exists!",
                },
                status=400,
            )             

    except Exception as e:
        return web.json_response(
            {
                "status": "error",
                "message": f"Error: {e}"
            }, status=500
    )


# Rename file code
@PromptServer.instance.routes.post("/alekpet/ide_node_rename_code")
@validate_ide_params
async def rename_code(request):
    try:
        json_data = await request.json()
        language = json_data.get("language")
        old_filename = json_data.get("old_filename")
        filename = json_data.get("filename")

        if not old_filename or not old_filename.strip():
            return web.json_response(
                {"status": "error", "message": "Old filename is incorrect!"}, status=400
            )

        pathOldFileName = DIR_IDENODE_CODES / language.strip() / old_filename
        pathFileName = DIR_IDENODE_CODES / language.strip() / filename

        # Check valid extension
        if not pathFileName.suffix.strip():
             pathFileName = pathFileName.with_suffix('.json')

        if not pathFileName.suffix.lower().strip() in VALID_FILE_CODE_EXTENSIONS:
            return web.json_response(
                {
                    "status": "error",
                    "message": f"Invalid file '{pathFileName.suffix.strip()}' extension! (valid extensions {','.join(VALID_FILE_CODE_EXTENSIONS)})",
                },
                status=200)


        if Path.exists(pathOldFileName):
            pathOldFileName.rename(pathFileName)

            list_codes = getFilesInDir(DIR_IDENODE_CODES / language)
            return web.json_response(
                {
                    "status": "Ok",
                    "codes": list_codes,
                    "message": f"Filename '{old_filename}' has renamed to '{filename}' successfully!",
                },
                status=200,
            )
        else:
            return web.json_response(
                {
                    "status": "error",
                    "message": f"Filename '{pathOldFileName}' not exists!",
                },
                status=400,
            )             

    except Exception as e:
        return web.json_response(
            {
                "status": "error",
                "message": f"Error: {e}"
            }, status=500
    )


# ------------ END -> CODE MANAGER ------------


def wait_js_complete(unique_id, time_out=40, poll_interval=0.2):
    start_time = time.time()
    while time.time() - start_time < time_out:
        node = IDEs_DICT.get(unique_id)
        if node and getattr(node, "js_complete", False) and node.js_complete == True and node.js_result is not None:
            node.js_complete = False
            return True

        if node is None and unique_id in IDEs_DICT:
            del IDEs_DICT[unique_id]
            return False

        time.sleep(poll_interval)

    IDEs_DICT.pop(unique_id, None)
    return False


# - Thank you very much for the class -> Trung0246 -
# - https://github.com/Trung0246/ComfyUI-0246/blob/main/utils.py#L51
class TautologyStr(str):
	def __ne__(self, other):
		return False


class ByPassTypeTuple(tuple):
	def __getitem__(self, index):
		if index > 0:
			index = 0
		item = super().__getitem__(index)
		if isinstance(item, str):
			return TautologyStr(item)
		return item
# ---------------------------


class IDENode:
    def __init__(self):
        self.js_complete = False
        self.js_result = None

    @classmethod
    def INPUT_TYPES(s):

        return {
            "optional": {},
            "required": {
                "language": (
                    (["python", "javascript"]),
                    {"default": "python"},
                ),
                "pycode": (
                    "PYCODE",
                    {
                        "default": """# !!! Attention, do not insert unverified code !!!
# ---- Example code ----
# Globals inputs variables: var1, var2, var3, user variables ...
from time import strftime
def runCode():
    nowDataTime = strftime("%Y-%m-%d %H:%M:%S")
    return f"Hello ComfyUI with us today {nowDataTime}!"
result = runCode()"""
                    },
                ),
            },
            "hidden": {"unique_id": "UNIQUE_ID", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ByPassTypeTuple((PY_CODE,))
    RETURN_NAMES =  ("result",)
    FUNCTION = "exec_py"
    DESCRIPTION = "IDE Node is an node that allows you to run code written in Python or Javascript directly in the node."
    CATEGORY = "AlekPet Nodes/experiments"

    def exec_py(self, pycode, language, unique_id, extra_pnginfo, **kwargs):
        if unique_id not in IDEs_DICT:
            IDEs_DICT[unique_id] = self


        outputs = {}
        if extra_pnginfo and 'workflow' in extra_pnginfo and extra_pnginfo['workflow']:
            for node in extra_pnginfo['workflow']['nodes']:
                if str(node['id']) == str(unique_id):
                    outputs_valid = [ouput for ouput in node.get('outputs', []) if ouput.get('name','') != '' and ouput.get('type','') != '']
                    outputs = {ouput['name']: None for ouput in outputs_valid}
                    self.RETURN_TYPES = ByPassTypeTuple(out["type"] for out in outputs_valid)
                    self.RETURN_NAMES = tuple(name for name in outputs.keys())

        my_namespace = types.SimpleNamespace()
        my_namespace.__dict__.update(outputs)            
        my_namespace.__dict__.update({prop: kwargs[prop] for prop in kwargs})
        my_namespace.__dict__.setdefault("result", "The result variable is not assigned")

        if language == "python":
            try:
                exec(pycode, my_namespace.__dict__)
            except Exception as e:
                my_namespace.result = f"Error in python code: {e}"

            new_dict = {key: my_namespace.__dict__[key] for key in my_namespace.__dict__ if key not in ['__builtins__', *kwargs.keys()] and not callable(my_namespace.__dict__[key])}

            return (*new_dict.values(),)

        else:
            IDEs_DICT[unique_id].js_complete = False
            IDEs_DICT[unique_id].js_result = None

            new_dict = {key: my_namespace.__dict__[key] for key in my_namespace.__dict__ if key not in ['__builtins__'] and not callable(my_namespace.__dict__[key])}
            
            PromptServer.instance.send_sync(
                "alekpet_js_result",
                {"unique_id": unique_id, "vars": json.dumps(new_dict)},
            )
            if not wait_js_complete(unique_id):
                print(f"IDENode_{unique_id}: Failed to get data!")
            else:
                print(f"IDENode_{unique_id}: Data received successful!")

            return tuple(IDEs_DICT[unique_id].js_result)
