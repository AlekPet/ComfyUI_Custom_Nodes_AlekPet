import types


class PythonNode:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):

        return {
            "required": {"pycode": (
                    "PYCODE",
                    {"default": """def hello():
    return 'Hello World!'
result = hello()"""},
                ),}
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "exec_py"

    CATEGORY = "AlekPet Nodes/extras"

    def exec_py(self, pycode):
        my_namespace = types.SimpleNamespace()

        exec(pycode, my_namespace.__dict__)

        return (my_namespace.result,)
