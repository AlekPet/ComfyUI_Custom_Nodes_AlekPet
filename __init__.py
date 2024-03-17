# Title: ComfyUI Install Customs Nodes and javascript files
# Author: AlekPet
# Version: 2023.12.03
import os
import importlib.util
import subprocess
import sys
import shutil
import __main__
import pkgutil
import re
import threading

python = sys.executable

# User extension files in custom_nodes
extension_folder = os.path.dirname(os.path.realpath(__file__))

# ComfyUI folders web
folder_web = os.path.join(os.path.dirname(os.path.realpath(__main__.__file__)), "web")
folder_comfyui_web_extensions = os.path.join(folder_web, "extensions")

folder__web_lib = os.path.join(folder_web, 'lib')
extension_dirs = ["web_alekpet_nodes",]
#
DEBUG = False
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
humanReadableTextReg = re.compile('(?<=[a-z])([A-Z])|(?<=[A-Z])([A-Z][a-z]+)')
module_name_cut_version = re.compile("[>=<]")

installed_modules = list(m[1] for m in pkgutil.iter_modules(None))

def log(*text):
    if DEBUG:
        print(''.join(map(str, text)))


def information(datas):
    for info in datas:
        if DEBUG:
            print(info, end="")


def module_install(commands, cwd='.'):
    result = subprocess.Popen(commands, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    out = threading.Thread(target=information, args=(result.stdout,))
    err = threading.Thread(target=information, args=(result.stderr,))
    out.start()
    err.start()
    out.join()
    err.join()

    return result.wait()


def checkModules(nodeElement):
    file_requir = os.path.join(extension_folder, nodeElement, 'requirements.txt')
    if os.path.exists(file_requir):
        log("  -> File 'requirements.txt' found!")
        module_install([sys.executable, '-s', '-m', 'pip', 'install', '-r', file_requir])


def addComfyUINodesToMapping(nodeElement):
    log(f"  -> Find class execute node <{nodeElement}>, add NODE_CLASS_MAPPINGS ...")
    node_folder = os.path.join(extension_folder, nodeElement)
    for f in os.listdir(node_folder):
        ext = os.path.splitext(f)
        # Find files extensions .py
        if os.path.isfile(os.path.join(node_folder, f)) and not f.startswith('__') and ext[1] == '.py' and ext[0] != '__init__':
            # remove extensions .py
            module_without_py = f.replace(ext[1], '')
            # Import module
            spec = importlib.util.spec_from_file_location(module_without_py, os.path.join(node_folder, f))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            classes_names = list(filter(lambda p: callable(getattr(module, p)) and p.find('Node') != -1, dir(module)))
            for class_module_name in classes_names:
                # Check module
                if class_module_name and class_module_name not in NODE_CLASS_MAPPINGS.keys():
                    log(f"    [*] Class node found '{class_module_name}' add to NODE_CLASS_MAPPINGS...")
                    NODE_CLASS_MAPPINGS.update({
                        class_module_name: getattr(module, class_module_name)
                    })
                    NODE_DISPLAY_NAME_MAPPINGS.update({
                        class_module_name: humanReadableTextReg.sub(" \\1\\2", class_module_name)
                    })


def checkFolderIsset():
    log(f"*  Check and make not isset dirs...")
    for d in extension_dirs:
        dir_ = os.path.join(extension_folder, d)
        if not os.path.exists(dir_):
            log(f"* Dir <{d}> is not found, create...")
            os.mkdir(dir_)
            log(f"* Dir <{d}> created!")


def printColorInfo(text, color='\033[92m'):
    CLEAR = '\033[0m'
    print(f"{color}{text}{CLEAR}")


def installNodes():
    log(f"\n-------> AlekPet Node Installing [DEBUG] <-------")
    printColorInfo(f"### [START] ComfyUI AlekPet Nodes ###", "\033[1;35m")
    web_extensions_dir = os.path.join(extension_folder, extension_dirs[0])
    
    # Remove files in lib directory 
    libfiles = ['fabric.js']
    for file in libfiles:
        filePath = os.path.join(folder__web_lib, file)
        if os.path.exists(filePath):
            os.remove(filePath)
    
    if os.path.exists(web_extensions_dir):
        shutil.rmtree(web_extensions_dir)
        
    checkFolderIsset()
    
    extensions_dirs_copy = ['js','assets', 'lib']

    for nodeElement in os.listdir(extension_folder):
        if not nodeElement.startswith('__') and nodeElement.endswith('Node') and os.path.isdir(os.path.join(extension_folder, nodeElement)):
            log(f"* Node <{nodeElement}> is found, installing...")

            # Add missing or updates files           
            for dir_name in extensions_dirs_copy:
                folder_curr = os.path.join(extension_folder, nodeElement, dir_name)
                if os.path.exists(folder_curr):
                    folder_curr_dist = os.path.join(web_extensions_dir, dir_name, nodeElement.lower() if dir_name != 'js' else web_extensions_dir)                 
                    shutil.copytree(folder_curr, folder_curr_dist, dirs_exist_ok=True)
            
            # Loading node info
            printColorInfo(f"Node -> {nodeElement} [Loading]")

            checkModules(nodeElement)
            addComfyUINodesToMapping(nodeElement)
            
    printColorInfo(f"### [END] ComfyUI AlekPet Nodes ###", "\033[1;35m")

WEB_DIRECTORY = f"./{extension_dirs[0]}"

installNodes()
