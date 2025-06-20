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
folder_web = os.path.join(os.path.dirname(
    os.path.realpath(__main__.__file__)), "web")
folder_comfyui_web_extensions = os.path.join(folder_web, "extensions")

folder__web_lib = os.path.join(folder_web, "lib")
extension_dirs = [
    "web_alekpet_nodes",
]

# Debug mode
DEBUG = False

NODE_CLASS_MAPPINGS = dict()  # dynamic class nodes append in mappings
# dynamic display names nodes append mappings names
NODE_DISPLAY_NAME_MAPPINGS = dict()

humanReadableTextReg = re.compile(
    "(?<=[a-z0-9])([A-Z])|(?<=[A-Z0-9])([A-Z][a-z][0-9]+)")
module_name_cut_version = re.compile("[>=<]")

installed_modules = {}
# installed_modules = {m[1] for m in pkgutil.iter_modules()}

# -- Config settings --
CONFIG = {}
NODES_SETTINGS = {}
GLOBAL_SETTINGS = {}
is_check_enabled_nodes = True

# List nodes dirs
ALL_NODES_DIRS = [dir.name for dir in os.scandir(extension_folder) if dir.is_dir(
) and not dir.name.startswith(".") and not dir.name.startswith("_")]

# Directory config file
config_path = os.path.join(extension_folder, "config.json")

# Load config.js file
if not os.path.exists(config_path):
    print("File config.js file not found! Reinstall extensions! Used default settings!")
    is_check_enabled_nodes = False
else:
    with open(config_path, "r") as f:
        CONFIG = json.load(f)

        NODES_SETTINGS = CONFIG.get("nodes_settings")
        GLOBAL_SETTINGS = CONFIG.get("global_settings")

        # Global settings
        if GLOBAL_SETTINGS is not None:
            is_check_enabled_nodes = GLOBAL_SETTINGS.get(
                "check_enabled_nodes", True)

        # Nodes settings
        if NODES_SETTINGS is None:
            is_check_enabled_nodes = False


# -- end - Config settings --

def get_version_extension():
    version = ''
    toml_file = os.path.join(extension_folder, 'pyproject.toml')
    if (os.path.isfile(toml_file)):
        try:
            with open(toml_file, "r") as v:
                version = list(
                    filter(lambda l: l.startswith("version"), v.readlines()))[0]
                version = version.split("=")[1].replace("\"", "").strip()
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
            try:
                print(info, end="\r", flush=True)
            except UnicodeError:
                safe_text = info.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
                print(safe_text, end="\r", flush=True)


def printColorInfo(text, color="\033[92m"):
    CLEAR = "\033[0m"
    print(f"{color}{text}{CLEAR}", end="\r\n")


def get_classes(code):
    tree = ast.parse(code)
    return [
        n.name
        for n in ast.walk(tree)
        if isinstance(n, ast.ClassDef) and "Node" in n.name
    ]


def addComfyUINodesToMapping(nodeElement, nodesOptions):
    log(f"  -> Find class execute node <{nodeElement}>, add NODE_CLASS_MAPPINGS ...")
    node_folder = os.path.join(extension_folder, nodeElement)
    classesNames = []

    for f in os.listdir(node_folder):
        ext = os.path.splitext(f)
        # Find files extensions .py
        if os.path.isfile(os.path.join(node_folder, f)) and not f.startswith('__') and ext[1] == '.py' and ext[0] != '__init__':
            # remove extensions .py
            module_without_py = f.replace(ext[1], '')
            # Import module
            spec = importlib.util.spec_from_file_location(
                module_without_py, os.path.join(node_folder, f))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            classes_names = list(filter(lambda p: callable(
                getattr(module, p)) and p.find('Node') != -1, dir(module)))

            for class_module_name in classes_names:
                # Check module
                if class_module_name and class_module_name not in NODE_CLASS_MAPPINGS.keys():

                    classesNames.append(class_module_name)

                    if (is_check_enabled_nodes and class_module_name in nodesOptions):
                        if nodesOptions[class_module_name]:
                            log(
                                f"    [*] Class node found '{class_module_name}' add to NODE_CLASS_MAPPINGS...")
                            NODE_CLASS_MAPPINGS.update({
                                class_module_name: getattr(
                                    module, class_module_name)
                            })
                            NODE_DISPLAY_NAME_MAPPINGS.update({
                                class_module_name: humanReadableTextReg.sub(
                                    " \\1\\2", class_module_name)
                            })
                    else:
                        log(
                            f"    [*] Class node found '{class_module_name}' add to NODE_CLASS_MAPPINGS...")
                        NODE_CLASS_MAPPINGS.update({
                            class_module_name: getattr(
                                module, class_module_name)
                        })
                        NODE_DISPLAY_NAME_MAPPINGS.update({
                            class_module_name: humanReadableTextReg.sub(
                                " \\1\\2", class_module_name)
                        })

    return classesNames


def getNamesNodesInsidePyFile(nodeElement):
    node_folder = os.path.join(extension_folder, nodeElement)
    cls_names = []
    for f in os.listdir(node_folder):
        ext = os.path.splitext(f)
        if (
            os.path.isfile(os.path.join(node_folder, f))
            and not f.startswith("__")
            and ext[1] == ".py"
            and ext[0] != "__init__"
        ):
            with open(os.path.join(node_folder, f), "r") as pyf:
                cls_names.extend(get_classes(pyf.read()))
    return cls_names


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
        encoding='utf-8',
        errors='replace'
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
    file_requir = os.path.join(
        extension_folder, nodeElement, "requirements.txt")
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
    currentNodeSettings = NODES_SETTINGS.get(nodeElement)
    isActiveNode = True
    nodesOptions = {}

    if (currentNodeSettings is not None):
        isActiveNode = currentNodeSettings.get("active", True)
        nodesOptions = currentNodeSettings.get("nodes", {})

    if is_check_enabled_nodes and isActiveNode == False:
        printColorInfo(
            f"Node -> \033[93m{nodeElement}\033[0m: : [\033[91moff\033[0m] ")
        return

    log(f"* Node <{nodeElement}> is found, installing...")

    # -- Add to mapping
    # dynamic class nodes append in mappings
    namesNodes = addComfyUINodesToMapping(nodeElement, nodesOptions)
    lenNodesNames = len(namesNodes)-1
    listNodes = f"Node -> \033[93m{nodeElement}\033[0m: "

    for k, n in enumerate(namesNodes):
        sep = "" if k == lenNodesNames else ", "
        active = "off"
        if n in nodesOptions:
            active = ('\033[94mon' if nodesOptions[n]
                      else '\033[91moff')+'\033[0m'
        else:
            active = '\033[94mon\033[0m'

        listNodes += f"\033[92m{n}\033[0m [{active}]{sep}"
    # -- end Add to mapping

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

    # Old method views nodes
    # clsNodes = getNamesNodesInsidePyFile(nodeElement)
    # clsNodesText = "\033[93m" + \
    #     ", ".join(clsNodes) + "\033[0m" if clsNodes else ""
    # printColorInfo(f"Node -> {nodeElement}: {clsNodesText} \033[92m[Loading] ")

    checkModules(nodeElement)

    # Show list nodes
    printColorInfo(listNodes)


def installNodes():
    global installed_modules
    log("\n-------> AlekPet Node Installing [DEBUG] <-------")
    printColorInfo(
        f"### [START] ComfyUI AlekPet Nodes{get_version_extension()} ###", "\033[1;35m")

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

    nodes = [
        nodeElement
        for nodeElement in os.listdir(extension_folder)
        if not nodeElement.startswith("__")
        and nodeElement.endswith("Node")
        and os.path.isdir(os.path.join(extension_folder, nodeElement))
    ]

    with ThreadPoolExecutor() as executor:
        executor.map(install_node, nodes)

    printColorInfo(f"### [END] ComfyUI AlekPet Nodes ###", "\033[1;35m")


# Mount web directory
WEB_DIRECTORY = f"./{extension_dirs[0]}"


# Install nodes
installNodes()


# For ComfyUI Manager 😄
'''
=======

# Import classes nodes and add in mappings
from .ArgosTranslateNode.argos_translate_node import (
    ArgosTranslateCLIPTextEncodeNode,
    ArgosTranslateTextNode,
)

from .ChatGLMNode.chatglm_node import (
    ChatGLM4TranslateCLIPTextEncodeNode,
    ChatGLM4TranslateTextNode, ChatGLM4InstructNode, ChatGLM4InstructMediaNode
)
from .DeepTranslatorNode.deep_translator_node import (
    DeepTranslatorCLIPTextEncodeNode,
    DeepTranslatorTextNode,
)
from .ExtrasNode.extras_node import PreviewTextNode, HexToHueNode, ColorsCorrectNode
from .GoogleTranslateNode.google_translate_node import (
    GoogleTranslateCLIPTextEncodeNode,
    GoogleTranslateTextNode,
)

from .DeepLXTranslateNode.deeplx_translate_node import (
        DeepLXTranslateCLIPTextEncodeNode,
        DeepLXTranslateTextNode,
)

from .PainterNode.painter_node import PainterNode
from .PoseNode.pose_node import PoseNode
from .IDENode.ide_node import IDENode

NODE_CLASS_MAPPINGS = {
    "ArgosTranslateCLIPTextEncodeNode": ArgosTranslateCLIPTextEncodeNode,
    "ArgosTranslateTextNode": ArgosTranslateTextNode,
    "ChatGLM4TranslateCLIPTextEncodeNode": ChatGLM4TranslateCLIPTextEncodeNode,
    "ChatGLM4TranslateTextNode": ChatGLM4TranslateTextNode,
    "ChatGLM4InstructNode": ChatGLM4InstructNode,
    "ChatGLM4InstructMediaNode": ChatGLM4InstructMediaNode,
    "DeepTranslatorCLIPTextEncodeNode": DeepTranslatorCLIPTextEncodeNode,
    "DeepTranslatorTextNode": DeepTranslatorTextNode,
    "DeepLXTranslateCLIPTextEncodeNode": DeepLXTranslateCLIPTextEncodeNode,
    "DeepLXTranslateTextNode": DeepLXTranslateTextNode,    
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
    "DeepLXTranslateCLIPTextEncodeNode": "DeepLX Translate CLIP Text Encode Node",
    "DeepLXTranslateTextNode": "DeepLX Translate Text Node",    
    "PreviewTextNode": "Preview Text Node",
    "HexToHueNode": "HEX to HUE Node",
    "ColorsCorrectNode": "Colors Correct Node",
    "GoogleTranslateCLIPTextEncodeNode": "Google Translate CLIP Text Encode Node",
    "GoogleTranslateTextNode": "Google Translate Text Node",
    "PainterNode": "Painter Node",
    "PoseNode": "Pose Node",
    "IDENode": "IDE Node",
}
'''