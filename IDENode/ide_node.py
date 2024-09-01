import types
from server import PromptServer
from aiohttp import web
from asyncio import sleep, run
import json
import re

remove_type_name = re.compile(r"(\{.*\})", re.I | re.M)

# Hack: string type that is always equal in not equal comparisons, thanks pythongosssss
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False


PY_CODE = AnyType("*")
IDEs_DICT = {}


@PromptServer.instance.routes.post("/alekpet/check_js_complete")
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


async def wait_js_complete(unique_id, time_out=40):
    for _ in range(time_out):
        if (
            hasattr(IDEs_DICT[unique_id], "js_complete")
            and IDEs_DICT[unique_id].js_complete == True
            and IDEs_DICT[unique_id].js_result is not None
        ):
            IDEs_DICT[unique_id].js_complete = False
            return True

        await sleep(0.1)

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
    RETURN_NAMES =  ("result{ANY}",)
    FUNCTION = "exec_py"
    DESCRIPTION = "IDE Node is an node that allows you to run code written in Python or Javascript directly in the node."
    CATEGORY = "AlekPet Nodes/experiments"

    def exec_py(self, pycode, language, unique_id, extra_pnginfo, **kwargs):
        if unique_id not in IDEs_DICT:
            IDEs_DICT[unique_id] = self


        outputs = {}

        for node in extra_pnginfo['workflow']['nodes']:
            if node['id'] == int(unique_id):
                outputs_valid = [ouput for ouput in node.get('outputs', []) if ouput.get('name','') != '' and ouput.get('type','') != '']
                outputs = {re.sub(remove_type_name, "", ouput['name']): None for ouput in outputs_valid}
                self.RETURN_TYPES = ByPassTypeTuple(out["type"] for out in outputs_valid)
                self.RETURN_NAMES = tuple(name for name in outputs.keys())

        my_namespace = types.SimpleNamespace()
        my_namespace.__dict__.update(outputs)            
        my_namespace.__dict__.update({re.sub(remove_type_name, "", prop): kwargs[prop] for prop in kwargs})
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

            new_dict = {key: my_namespace.__dict__[key] for key in my_namespace.__dict__ if key not in ['__builtins__', *kwargs.keys()] and not callable(my_namespace.__dict__[key])}
            
            PromptServer.instance.send_sync(
                "alekpet_js_result",
                {"unique_id": unique_id, "vars": json.dumps(new_dict)},
            )
            if not run(wait_js_complete(unique_id)):
                print(f"IDENode_{unique_id}: Failed to get data!")
            else:
                print(f"IDENode_{unique_id}: Data received successful!")

            return (*IDEs_DICT[unique_id].js_result,)
