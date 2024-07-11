import types
from server import PromptServer
from aiohttp import web
from asyncio import sleep, run
import json

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


class IDENode:
    def __init__(self):
        self.js_complete = False
        self.js_result = None

    @classmethod
    def INPUT_TYPES(s):

        return {
            "optional": {
            },
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
            "hidden": {"unique_id": "UNIQUE_ID"},
        }

    RETURN_TYPES = (PY_CODE,)
    RETURN_NAMES = ("any",)
    FUNCTION = "exec_py"

    CATEGORY = "AlekPet Nodes/experiments"

    def typesCheck(self, v):
        result = None

        if isinstance(v, str):
            result = f'"{v}"'
        elif isinstance(
            v, (float, int, complex, bool, list, dict, tuple, range, set, frozenset)
        ):
            result = v
        elif v is None:
            result = f'""'

        return result

    def exec_py(self, pycode, language, unique_id, **kwargs):
        if unique_id not in IDEs_DICT:
            IDEs_DICT[unique_id] = self

        if language == "python":
            # Set variable correct type
            pycode_ = ""
            for perem in kwargs:
                kwargs[perem] = self.typesCheck(kwargs[perem])
                pycode_ += f"{perem} = {kwargs[perem]}\n"

            pycode_ += pycode

            my_namespace = types.SimpleNamespace()
            try:
                exec(pycode_, my_namespace.__dict__)
            except Exception as e:
                my_namespace.result = f"Error in python code: {e}"

            return (my_namespace.result,)

        else:
            IDEs_DICT[unique_id].js_complete = False
            IDEs_DICT[unique_id].js_result = None

            PromptServer.instance.send_sync(
                "alekpet_js_result",
                {"unique_id": unique_id, "vars": json.dumps(kwargs)},
            )
            if not run(wait_js_complete(unique_id)):
                print(f"IDENode_{unique_id}: Failed to get data!")
            else:
                print(f"IDENode_{unique_id}: Data received successful!")

            print(IDEs_DICT[unique_id].js_result)
            return (IDEs_DICT[unique_id].js_result,)
