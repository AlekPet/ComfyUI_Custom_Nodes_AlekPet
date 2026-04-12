from pathlib import Path
import types
from server import PromptServer
from aiohttp import web
import time
import json
import re

# Directory node
DIR_IDENODE = Path(__file__)

# Directory with codes
DIR_IDENODE_CODES = DIR_IDENODE.parents[1] / "web_alekpet_nodes" / "lib" / "idenode" / "codes"

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
        and filename is not None
        and (type(filename) == str and filename.strip() == "")
    ):
        print("Filename is incorrect")
        return False
    return True


def getFilesInDir(folder, ext="*.json"):
    if not folder.exists():
        raise ValueError(f"[IDENode] Not found directory '{folder}'!")

    list_files = [item.name for item in folder.rglob(ext) if not item.is_dir()]
    return list_files     


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
        return web.json_response({"status": "Ok"})

    return web.json_response({"status": "Error"})


@PromptServer.instance.routes.get("/alekpet/ide_node_load_codes/{lang}")
async def load_codes(request):
    lang = request.match_info["lang"]
    list_codes = getFilesInDir(DIR_IDENODE_CODES / lang)

    return web.json_response(
        {"codes": list_codes, "language": lang}
    )

@PromptServer.instance.routes.post("/alekpet/ide_node_save_code")
async def save_code(request):
    try:
        json_data = await request.json()
        inputs = json_data.get("inputs", [])
        outputs = json_data.get("outputs", [])
        language = json_data.get("language", "python")
        code = json_data.get("code", "")
        filename = json_data.get("filename")

        if not isFileName(filename):
            return web.json_response(
                {"message": "Filename file code is incorrect!"}, status=400
            )

        if not language.strip():
             return web.json_response(
                {"message": "The programming language is incorrect!"}, status=400
            )            

        json_data = {
             "language": language,
             "inputs": inputs,
             "outputs": outputs,
             "code": code,
        }

        save_path = DIR_IDENODE_CODES / language / filename

        if not save_path.suffix.strip():
             save_path = save_path.with_suffix('.json')

        with open(save_path, "w+", encoding="utf-8", errors="replace") as file:
            json.dump(json_data, file, ensure_ascii=False, indent=2)

            list_codes = getFilesInDir(DIR_IDENODE_CODES / language)
            return web.json_response(
                {
                    "codes": list_codes,
                    "language": language,
                    "message": f"Code from '{language}' save to '{save_path.name}' successfully!",
                },
                status=200,
            )

    except OSError as e:
        return web.json_response(
            {"error": "Error: %s - %s." % (e.filename, e.strerror)}, status=500
        )


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
