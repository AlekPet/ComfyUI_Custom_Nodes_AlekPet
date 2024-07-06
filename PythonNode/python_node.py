import types

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

PY_CODE = AnyType("*")

class PythonNode:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):

        return {
            "optional":{
                "var1": (PY_CODE, {"default": ""}),
                "var2": (PY_CODE, {"default": ""}),
                "var3": (PY_CODE, {"default": ""}),
                "var4": (PY_CODE, {"default": ""}), 
                "var5": (PY_CODE, {"default": ""}),                                               
            },
            "required": {               
                "pycode": ("PYCODE", {"default": """# !!! Attention, do not insert unverified code !!!
# ---- Example code ----
# Example code
# Globals inputs variables: var1, var2, var3
from time import strftime
def runCode():
    nowDataTime = strftime("%Y-%m-%d %H:%M:%S")
    return f"Hello ComfyUI with us today {nowDataTime}!"
result = runCode()"""},),                
                
            },
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "exec_py"

    CATEGORY = "AlekPet Nodes/experiments"

    def typesCheck(self, v):
        result = None

        if isinstance(v, str):
            result = f"\"{v}\""
        elif isinstance(v, (float, int, complex, bool, list, dict, tuple, range, set, frozenset)):
            result = v
        elif v is None:
            result = f"\"\""
            
        return result

    def exec_py(self, var1=None, var2=None, var3=None, var4=None, var5=None, pycode=""):
        my_namespace = types.SimpleNamespace()

        # Set variable correct type
        var1 = self.typesCheck(var1)
        var2 = self.typesCheck(var2)
        var3 = self.typesCheck(var3)
        var4 = self.typesCheck(var4)
        var5 = self.typesCheck(var5)                
        
        pycode = f"""

var1 = {var1}
var2 = {var2}
var3 = {var3}
var4 = {var4}
var5 = {var5}
{pycode}
"""

        exec(pycode, my_namespace.__dict__)

        return (my_namespace.result,)
