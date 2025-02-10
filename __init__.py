# Title: ComfyUI Install Customs Nodes and javascript files
# Author: AlekPet
# Version: 2024.11.02
import os
import importlib.util
import subprocess
import sys
import shutil
import __main__
import json

# import pkgutil
import re
import threading
import ast
from concurrent.futures import ThreadPoolExecutor

python = sys.executable

# User extension files in custom_nodes
extension_folder = os.path.dirname(os.path.realpath(__file__))

# ComfyUI folders web
folder_web = os.path.join(os.path.dirname(os.path.realpath(__main__.__file__)), "web")
folder_comfyui_web_extensions = os.path.join(folder_web, "extensions")

folder__web_lib = os.path.join(folder_web, "lib")
extension_dirs = [
    "web_alekpet_nodes",
]

# Debug mode
DEBUG = False

NODE_CLASS_MAPPINGS = dict()  # dynamic class nodes append in mappings
NODE_DISPLAY_NAME_MAPPINGS = dict()  # dynamic display names nodes append mappings names

wordsExludeSpace = "|".join(["ChatGLM"])
humanReadableTextReg = re.compile(
    rf"({wordsExludeSpace}-?\d*)|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])"
)

module_name_cut_version = re.compile("[>=<]")
renameTextUnderline = re.compile("(?<=[a-z])([A-Z])")

installed_modules = {}
# installed_modules = {m[1] for m in pkgutil.iter_modules()}

# -- Config settings --
CONFIG = {}
NODES_SETTINGS = {}
GLOBAL_SETTINGS = {}

DYNAMIC_NODES_ADD = True
is_check_enabled_nodes = True


# -- All nodes
def get_classes(code):
    tree = ast.parse(code)
    return [
        n.name
        for n in ast.walk(tree)
        if isinstance(n, ast.ClassDef) and "Node" in n.name
    ]


def getNamesNodesInsidePyFile(nodeElement):
    node_folder = os.path.join(extension_folder, nodeElement)
    cls_names = []
    py_files = []
    for f in os.listdir(node_folder):
        ext = os.path.splitext(f)
        if (
            os.path.isfile(os.path.join(node_folder, f))
            and not f.startswith("__")
            and ext[1] == ".py"
        ):
            py_files.append(f)
            with open(os.path.join(node_folder, f), "r") as pyf:
                cls_names.extend(get_classes(pyf.read()))
    return cls_names, py_files


# List nodes dirs
ALL_NODES_DIRS = {
    dir.name: dict(zip(["nodes", "py_files"], getNamesNodesInsidePyFile(dir.name)))
    for dir in os.scandir(extension_folder)
    if dir.is_dir()
    and not dir.name.startswith(".")
    and not dir.name.startswith("_")
    and dir.name != extension_dirs[0]
}

def addChangesToJson(json_data):
    isChanged = False

    _json_data = json.loads(json.dumps(json_data))
    nodes_data = _json_data.get("nodes_settings")
    if not nodes_data and len(ALL_NODES_DIRS.keys()) == 0:
        isChanged = False

    for node_check_folder in ALL_NODES_DIRS:
        # If folder not found, create folder key and nodes children keys
        if node_check_folder not in nodes_data:
            DEBUG and print(f"  -> Folder node {node_check_folder} not exists!")
            nodes_data.update(
                {
                    node_check_folder: {
                        "active": True,
                        "nodes": {
                            node: True
                            for node in ALL_NODES_DIRS[node_check_folder]["nodes"]
                        },
                    }
                }
            )
            isChanged = True

        else:
            # Else check children nodes
            all_childen_nodes_in_folder = ALL_NODES_DIRS[node_check_folder]["nodes"]
            json_data_nodes_in_folder = nodes_data[node_check_folder]["nodes"]

            for child_node in all_childen_nodes_in_folder:
                if child_node not in json_data_nodes_in_folder:
                    DEBUG and print(
                        f"  -> Folder node {node_check_folder} children node {child_node} not exists!"
                    )
                    json_data_nodes_in_folder.update({child_node: True})
                    isChanged = True

    return _json_data, isChanged


# end -- All nodes

# Directory config file
config_path = os.path.join(extension_folder, "config.json")

# Load config.js file
if not os.path.exists(config_path):
    DEBUG and print("  -> File config.js file not found! Created new config!")

    with open(config_path, "w") as f:
        json.dump(
            {"nodes_settings": {}, "global_settings": {"check_enabled_nodes": False}}, f
        )


# -- Open config check nodes
isChanged = False
json_data = None

with open(config_path, "r") as f:
    data = json.load(f)
    json_data, isChanged = addChangesToJson(data)

if isChanged:
    with open(config_path, "w") as f:
        json.dump(json_data, f, indent=2)

# -- end - Open config check nodes


CONFIG = json_data

NODES_SETTINGS = CONFIG.get("nodes_settings")
GLOBAL_SETTINGS = CONFIG.get("global_settings")

NODES_LOAD_SUCCESS = {}
NODES_LOAD_FAILED = {}

# Global settings
if GLOBAL_SETTINGS is not None:
    is_check_enabled_nodes = GLOBAL_SETTINGS.get("check_enabled_nodes", True)

# Nodes settings
if NODES_SETTINGS is None:
    is_check_enabled_nodes = False


# -- end - Config settings --


def get_version_extension():
    version = ""
    toml_file = os.path.join(extension_folder, "pyproject.toml")
    if os.path.isfile(toml_file):
        try:
            with open(toml_file, "r") as v:
                version = list(
                    filter(lambda l: l.startswith("version"), v.readlines())
                )[0]
                version = version.split("=")[1].replace('"', "").strip()
                return f" \033[1;34mv{version}\033[0m\033[1;35m"
        except Exception as e:
            print(e)

    return version


def log(*text):
    if DEBUG:
        print("".join(map(str, text)))


def information(datas):
    for info in datas:
        if not DEBUG:
            print(info, flush=True)


def printColorInfo(text, color="\033[92m"):
    CLEAR = "\033[0m"
    print(f"{color}{text}{CLEAR}")


def addComfyUINodesToMapping(nodeElement, nodesOptions):
    log(f"  -> Find class execute node <{nodeElement}>, add NODE_CLASS_MAPPINGS ...")
    node_folder = os.path.join(extension_folder, nodeElement)
    classesNames = []

    for f in ALL_NODES_DIRS[nodeElement]["py_files"]:
        ext = os.path.splitext(f)
        # remove extensions .py
        module_without_py = f.replace(ext[1], "")
        # Import module
        spec = importlib.util.spec_from_file_location(
            module_without_py, os.path.join(node_folder, f)
        )

        module = importlib.util.module_from_spec(spec)

        try:
            spec.loader.exec_module(module)
        except Exception as e:
            NODES_LOAD_FAILED[nodeElement] = e
            continue

        classes_names = list(
            filter(
                lambda p: callable(getattr(module, p)) and p.find("Node") != -1,
                dir(module),
            )
        )

        NODES_LOAD_SUCCESS[nodeElement] = classes_names

        for class_module_name in classes_names:
            # Check module
            if (
                class_module_name
                and class_module_name not in NODE_CLASS_MAPPINGS.keys()
            ):

                classesNames.append(class_module_name)

                if is_check_enabled_nodes and class_module_name in nodesOptions:
                    if nodesOptions[class_module_name]:
                        log(
                            f"    [*] Class node found '{class_module_name}' add to NODE_CLASS_MAPPINGS..."
                        )
                        NODE_CLASS_MAPPINGS.update(
                            {class_module_name: getattr(module, class_module_name)}
                        )
                        NODE_DISPLAY_NAME_MAPPINGS.update(
                            {
                                class_module_name: humanReadableTextReg.sub(
                                    r" \1", class_module_name
                                ).strip()
                            }
                        )
                else:
                    log(
                        f"    [*] Class node found '{class_module_name}' add to NODE_CLASS_MAPPINGS..."
                    )
                    NODE_CLASS_MAPPINGS.update(
                        {class_module_name: getattr(module, class_module_name)}
                    )
                    NODE_DISPLAY_NAME_MAPPINGS.update(
                        {
                            class_module_name: humanReadableTextReg.sub(
                                r" \1", class_module_name
                            ).strip()
                        }
                    )
    return classesNames
                    


def checkFolderIsset():
    log(f"*  Check and make not isset dirs...")
    for d in extension_dirs:
        dir_ = os.path.join(extension_folder, d)
        if not os.path.exists(dir_):
            log(f"* Dir <{d}> is not found, create...")
            os.mkdir(dir_)
            log(f"* Dir <{d}> created!")


def module_install(commands, cwd="."):
    result = subprocess.Popen(
        commands,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    out = threading.Thread(target=information, args=(result.stdout,))
    err = threading.Thread(target=information, args=(result.stderr,))
    out.start()
    err.start()
    out.join()
    err.join()

    return result.wait()


def get_installed_modules():
    result = subprocess.run(
        [sys.executable, "-m", "pip", "list", "--format=freeze"],
        capture_output=True,
        text=True,
        check=True,
    )
    return {line.split("==")[0].lower() for line in result.stdout.splitlines()}


def checkModules(nodeElement):
    file_requir = os.path.join(extension_folder, nodeElement, "requirements.txt")
    if os.path.exists(file_requir):
        log("  -> File 'requirements.txt' found!")
        with open(file_requir) as f:
            required_modules = {
                module_name_cut_version.split(line.strip())[0]
                for line in f
                if not line.startswith("#")
            }

        modules_to_install = required_modules - installed_modules

        if modules_to_install:
            module_install(
                [sys.executable, "-m", "pip", "install", *modules_to_install]
            )


def install_node(nodeElement):
    # Nodes direcories and nodes in extension
    folderNodes = ALL_NODES_DIRS.get(nodeElement)
    isNotNodes = len(folderNodes.get("nodes", [])) == 0

    # -- Copy tree folders
    web_extensions_dir = os.path.join(extension_folder, extension_dirs[0])

    extensions_dirs_copy = ["js", "css", "assets", "lib", "fonts"]
    for dir_name in extensions_dirs_copy:
        folder_curr = os.path.join(extension_folder, nodeElement, dir_name)
        if os.path.exists(folder_curr):
            folder_curr_dist = os.path.join(
                web_extensions_dir,
                dir_name,
                nodeElement.lower() if dir_name != "js" else web_extensions_dir,
            )
            shutil.copytree(folder_curr, folder_curr_dist, dirs_exist_ok=True)
    # -- end - Copy tree folders

    # Install dependencies
    checkModules(nodeElement)

    if DYNAMIC_NODES_ADD:
        currentNodeSettings = NODES_SETTINGS.get(nodeElement)
        isActiveNode = True
        nodesOptions = {}

        # Disable extensions and JavaScript files:
        # file_js = renameTextUnderline.sub("_\\1", nodeElement).lower().strip()
        # path_js = os.path.join(web_extensions_dir, f"{file_js}.js")
        # path_off = os.path.join(web_extensions_dir, f"{file_js}.off")

        if currentNodeSettings is not None:
            isActiveNode = currentNodeSettings.get("active", True)
            nodesOptions = currentNodeSettings.get("nodes", {})

        if is_check_enabled_nodes and isActiveNode == False or isNotNodes:
            stateValue = "Nodes missing" if isNotNodes else "off"
            printColorInfo(
                f"Node -> \033[93m{nodeElement}\033[0m: : [\033[91m{stateValue}\033[0m] "
            )

            # Disable extensions and JavaScript files, rename extension *.js -> *.off:
            # if os.path.isfile(path_js):
            #     print(file_js, "OK")
            #     os.rename(path_js, path_off)

            return

        # Disable extensions and JavaScript files, return normal extension *.off -> *.js:
        # if os.path.isfile(path_off):
        #     print(path_off, "OK")
        #     os.rename(path_off, path_js)

        log(f"* Node <{nodeElement}> is found, installing...")

        # -- Add to mapping
        # dynamic class nodes append in mappings
        clsNames = addComfyUINodesToMapping(nodeElement, nodesOptions)


def installNodes():
    global installed_modules
    log("\n-------> AlekPet Node Installing [DEBUG] <-------")

    # Remove files in lib directory
    libfiles = ["fabric.js"]
    for file in libfiles:
        filePath = os.path.join(folder__web_lib, file)
        if os.path.isfile(filePath):
            os.remove(filePath)

    # Remove old folder if exist
    oldDirNodes = os.path.join(folder_comfyui_web_extensions, "AlekPet_Nodes")
    if os.path.exists(oldDirNodes):
        shutil.rmtree(oldDirNodes)

    # Clear folder web_alekpet_nodes
    web_extensions_dir = os.path.join(extension_folder, extension_dirs[0])
    if os.path.exists(web_extensions_dir):
        shutil.rmtree(web_extensions_dir)

    checkFolderIsset()

    installed_modules = get_installed_modules()

    with ThreadPoolExecutor() as executor:
        executor.map(install_node, ALL_NODES_DIRS)


# Mount web directory
WEB_DIRECTORY = f"./{extension_dirs[0]}"


# Install nodes
installNodes()


# For ComfyUI Manager 😄
if not DYNAMIC_NODES_ADD:
    # Import classes nodes and add in mappings
    # ArgosTranslateNode
    try:
        from .ArgosTranslateNode.argos_translate_node import (
            ArgosTranslateCLIPTextEncodeNode,
            ArgosTranslateTextNode,
        )

        NODE_CLASS_MAPPINGS.update(
            {
                "ArgosTranslateCLIPTextEncodeNode": ArgosTranslateCLIPTextEncodeNode,
                "ArgosTranslateTextNode": ArgosTranslateTextNode,
            }
        )
        NODE_DISPLAY_NAME_MAPPINGS.update(
            {
                "ArgosTranslateCLIPTextEncodeNode": "Argos Translate CLIP Text Encode Node",
                "ArgosTranslateTextNode": "Argos Translate Text Node",
            }
        )

    except Exception as e:
        NODES_LOAD_FAILED["ArgosTranslateNode"] = e

    # DeepTranslatorNode
    try:
        from .DeepTranslatorNode.deep_translator_node import (
            DeepTranslatorCLIPTextEncodeNode,
            DeepTranslatorTextNode,
        )

        NODE_CLASS_MAPPINGS.update(
            {
                "DeepTranslatorCLIPTextEncodeNode": DeepTranslatorCLIPTextEncodeNode,
                "DeepTranslatorTextNode": DeepTranslatorTextNode,
            }
        )
        NODE_DISPLAY_NAME_MAPPINGS.update(
            {
                "DeepTranslatorCLIPTextEncodeNode": "Deep Translator CLIP Text Encode Node",
                "DeepTranslatorTextNode": "Deep Translator Text Node",
            }
        )

    except Exception as e:
        NODES_LOAD_FAILED["DeepTranslatorNode"] = e

    # GoogleTranslateNode
    try:
        from .GoogleTranslateNode.google_translate_node import (
            GoogleTranslateCLIPTextEncodeNode,
            GoogleTranslateTextNode,
        )

        NODE_CLASS_MAPPINGS.update(
            {
                "GoogleTranslateCLIPTextEncodeNode": GoogleTranslateCLIPTextEncodeNode,
                "GoogleTranslateTextNode": GoogleTranslateTextNode,
            }
        )
        NODE_DISPLAY_NAME_MAPPINGS.update(
            {
                "GoogleTranslateCLIPTextEncodeNode": "Google Translate CLIP Text Encode Node",
                "GoogleTranslateTextNode": "Google Translate Text Node",
            }
        )

    except Exception as e:
        NODES_LOAD_FAILED["GoogleTranslateNode"] = e

    # ChatGLMNode
    from .ChatGLMNode.chatglm_node import (
        ChatGLM4TranslateCLIPTextEncodeNode,
        ChatGLM4TranslateTextNode,
        ChatGLM4InstructNode,
        ChatGLM4InstructMediaNode,
    )

    # ExtrasNode
    from .ExtrasNode.extras_node import PreviewTextNode, HexToHueNode, ColorsCorrectNode

    # PainterNode
    from .PainterNode.painter_node import PainterNode

    # PoseNode
    from .PoseNode.pose_node import PoseNode

    # IDENode
    from .IDENode.ide_node import IDENode

    NODE_CLASS_MAPPINGS.update({
        "ChatGLM4TranslateCLIPTextEncodeNode": ChatGLM4TranslateCLIPTextEncodeNode,
        "ChatGLM4TranslateTextNode": ChatGLM4TranslateTextNode,
        "ChatGLM4TranslateTextNode": ChatGLM4TranslateTextNode,
        "ChatGLM4InstructNode": ChatGLM4InstructNode,
        "ChatGLM4InstructMediaNode": ChatGLM4InstructMediaNode,
        "PreviewTextNode": PreviewTextNode,
        "HexToHueNode": HexToHueNode,
        "ColorsCorrectNode": ColorsCorrectNode,
        "PainterNode": PainterNode,
        "PoseNode": PoseNode,
        "IDENode": IDENode,
    })

    NODE_DISPLAY_NAME_MAPPINGS.update({
        "ChatGLM4TranslateCLIPTextEncodeNode": "ChatGLM-4 Translate CLIP Text Encode Node",
        "ChatGLM4TranslateTextNode": "ChatGLM-4 Translate Text Node",
        "ChatGLM4InstructNode": "ChatGLM-4 Instruct Node",
        "ChatGLM4InstructMediaNode": "ChatGLM-4 Instruct Media Node",
        "PreviewTextNode": "Preview Text Node",
        "HexToHueNode": "HEX to HUE Node",
        "ColorsCorrectNode": "Colors Correct Node",
        "PainterNode": "Painter Node",
        "PoseNode": "Pose Node",
        "IDENode": "IDE Node",
    })

else:
    # For ComfyUI Manager 😄, if DYNAMIC_NODES_ADD = True
    '''
    # Import classes nodes and add in mappings
    NODE_CLASS_MAPPINGS = {
        "ArgosTranslateCLIPTextEncodeNode": ArgosTranslateCLIPTextEncodeNode,
        "ArgosTranslateTextNode": ArgosTranslateTextNode,
        "ChatGLM4TranslateCLIPTextEncodeNode": ChatGLM4TranslateCLIPTextEncodeNode,
        "ChatGLM4TranslateTextNode": ChatGLM4TranslateTextNode,
        "ChatGLM4InstructNode": ChatGLM4InstructNode,
        "ChatGLM4InstructMediaNode": ChatGLM4InstructMediaNode,
        "DeepTranslatorCLIPTextEncodeNode": DeepTranslatorCLIPTextEncodeNode,
        "DeepTranslatorTextNode": DeepTranslatorTextNode,
        "PreviewTextNode": PreviewTextNode,
        "HexToHueNode": HexToHueNode,
        "ColorsCorrectNode": ColorsCorrectNode,
        "GoogleTranslateCLIPTextEncodeNode": GoogleTranslateCLIPTextEncodeNode,
        "GoogleTranslateTextNode": GoogleTranslateTextNode,
        "PainterNode": PainterNode,
        "PoseNode": PoseNode,
        "IDENode": IDENode,
    }

    NODE_DISPLAY_NAME_MAPPINGS = {
        "ArgosTranslateCLIPTextEncodeNode": "Argos Translate CLIP Text Encode Node",
        "ArgosTranslateTextNode": "Argos Translate Text Node",
        "ChatGLM4TranslateCLIPTextEncodeNode": "ChatGLM-4 Translate CLIP Text Encode Node",
        "ChatGLM4TranslateTextNode": "ChatGLM-4 Translate Text Node",
        "ChatGLM4InstructNode": "ChatGLM-4 Instruct Node",
        "ChatGLM4InstructMediaNode": "ChatGLM-4 Instruct Media Node",
        "DeepTranslatorCLIPTextEncodeNode": "Deep Translator CLIP Text Encode Node",
        "DeepTranslatorTextNode": "Deep Translator Text Node",
        "PreviewTextNode": "Preview Text Node",
        "HexToHueNode": "HEX to HUE Node",
        "ColorsCorrectNode": "Colors Correct Node",
        "GoogleTranslateCLIPTextEncodeNode": "Google Translate CLIP Text Encode Node",
        "GoogleTranslateTextNode": "Google Translate Text Node",
        "PainterNode": "Painter Node",
        "PoseNode": "Pose Node",
        "IDENode": "IDE Node",
    }'''


# Information
printColorInfo(
    f"### [START] ComfyUI AlekPet Nodes{get_version_extension()} ###", "\033[1;35m"
)

for nodeElement in ALL_NODES_DIRS:
    folderNodes = ALL_NODES_DIRS.get(nodeElement)
    clsNodes = folderNodes.get("nodes", [])
    isNotNodes = len(clsNodes) == 0   

    # Method views nodes DYNAMIC_NODES_ADD = False
    if not DYNAMIC_NODES_ADD:
        status = "\033[1;36;40m [Success] "
        if nodeElement in NODES_LOAD_FAILED:
            status = "\033[91m [Failed] "

        clsNodesText = (
            "\033[93m" + ", ".join(clsNodes) + status
            if not isNotNodes
            else "\033[91m[Node missing]"
        )

        # Show list nodes
        printColorInfo(f"Node -> {nodeElement}: {clsNodesText} \033[92m")   
    else:
        # Method views nodes DYNAMIC_NODES_ADD = True
        if nodeElement not in NODES_LOAD_SUCCESS:
            printColorInfo(f"Node -> \033[93m{nodeElement}: \033[91m[Failed]")
            continue

        isActiveNode = True
        nodesOptions = {}
        currentNodeSettings = NODES_SETTINGS.get(nodeElement)

        if currentNodeSettings is not None:
            isActiveNode = currentNodeSettings.get("active", True)
            nodesOptions = currentNodeSettings.get("nodes", {})

        namesNodes = NODES_LOAD_SUCCESS[nodeElement]
        lenNodesNames = len(namesNodes) - 1
        listNodes = f"Node -> \033[93m{nodeElement}\033[0m: "

        for k, n in enumerate(namesNodes):
            sep = "" if k == lenNodesNames else ", "
            active = "off"
            if n in nodesOptions:
                active = (
                    "\033[94mon" if nodesOptions[n] else "\033[91moff"
                ) + "\033[0m"
            else:
                active = "\033[94mon\033[0m"

            listNodes += f"\033[92m{n}\033[0m [{active}]{sep} "

        listNodes += "\033[1;36;40m[Success]"
        # -- end Add to mapping

        # Show list nodes
        printColorInfo(listNodes)

# View nodes failed loading
if NODES_LOAD_FAILED.keys():
    print(
        f"\n\033[1;31;40m* Nodes have been temporarily disabled due to the error *\033[0m"
    )
    for failed_node in NODES_LOAD_FAILED:
        error_text = NODES_LOAD_FAILED[failed_node]
        print("\033[93m" + failed_node + " -> \033[1;31;40m" + str(error_text) + "\033[0m")

printColorInfo("### [END] ComfyUI AlekPet Nodes ###", "\033[1;35m")
