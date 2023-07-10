# Title: ComfyUI Install Customs Nodes and javascript files
# Author: AlekPet 
# Version: 2023.05.10

import os
import importlib.util
import subprocess
import sys
import filecmp
import shutil
import __main__

python = sys.executable

# User extension files in custom_nodes
extension_folder = os.path.dirname(os.path.realpath(__file__))

# ComfyUI folders web
folder_web = os.path.join(os.path.dirname(os.path.realpath(__main__.__file__)), "web")
folder_web_extensions = os.path.join(folder_web, "extensions")
folder__web_lib = os.path.join(folder_web, 'lib')
#
DEBUG = False
NODE_CLASS_MAPPINGS = {}

def log(*text):
    if DEBUG:
        print(''.join(map(str, text)))


def check_is_installed(module_name):
    try:
        mod = importlib.util.find_spec(module_name[:module_name.find('=')])
    except ModuleNotFoundError:
        return False

    return mod is not None

def module_install(module_name, action='install'):
    command = f'"{python}" -m pip {action} {module_name}'
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, env=os.environ )

    if result.returncode != 0:
        log(f'    [E] Install module {module_name} is fail! Error code: {result.returncode}')

    log(f'    [*] Install module "{module_name}" successful')


def checkModules(nodeElement):
    file_requir = os.path.join(extension_folder, nodeElement, 'requirements.txt')
    if os.path.exists(file_requir):
        log("  -> File 'requirements.txt' found!")
        with open(file_requir, 'r', encoding="utf-8") as r:
            for m in r.readlines():
                m = m.strip()
                log(f"    [*] Check installed module '{m}'...")
                check_m = check_is_installed(m)
                if not check_m:
                    module_install(m)
                else:
                    log(f"    [*] Module '{m}' is installed!")                  
    

def addFilesToFolder(folderSrc, folderDst, nodeElement):
    if os.path.exists(folderSrc):
        folder = os.path.split(folderSrc)[-1]
        log(f"  -> Find files javascipt in '{folder}' folder...")
        find_files = filecmp.dircmp(folderSrc, folderDst)
        if find_files.left_only or find_files.diff_files:
            listFiles = list(find_files.left_only)
            listFiles.extend(f for f in find_files.diff_files if f not in listFiles)

            log(f"    [*] Found files in '{folder}': {', '.join(listFiles)}")
            for f in listFiles:
                src_f = os.path.join(folderSrc, f)
                dst_f = os.path.join(folderDst, f)
                if os.path.exists(dst_f):
                    os.remove(dst_f)
                shutil.copy(src_f, dst_f)


def addComfyUINodesToMapping(nodeElement):
    log(f"  -> Find class execute node <{nodeElement}>, add NODE_CLASS_MAPPINGS ...")
    node_folder = os.path.join(extension_folder, nodeElement)
    for f in os.listdir(node_folder):
        ext = os.path.splitext(f)
        # Find files extensions .py
        if os.path.isfile(os.path.join(node_folder, f)) and not f.startswith('__') and ext[1] == '.py' and ext[0] != '__init__':
            # remove extensions .py
            module_without_py = f.replace(ext[1],'')
            # Import module
            spec = importlib.util.spec_from_file_location(module_without_py, os.path.join(node_folder, f))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            classes_names = list(filter(lambda p: p.find('Node')!=-1, dir(module)))
            for class_module_name in classes_names:
                # Check module 
                if class_module_name and class_module_name not in NODE_CLASS_MAPPINGS.keys():
                    log(f"    [*] Class node found '{class_module_name}' add to NODE_CLASS_MAPPINGS...")
                    NODE_CLASS_MAPPINGS.update({
                        class_module_name:getattr(module, class_module_name)
                        })
   
def installNodes():   
    for nodeElement in os.listdir(extension_folder):
        if not nodeElement.startswith('__') and nodeElement.endswith('Node') and os.path.isdir(os.path.join(extension_folder, nodeElement)):
            log(f"* Node <{nodeElement}> is found, installing...")
            js_folder = os.path.join(extension_folder, nodeElement, "js")
            lib_folder = os.path.join(extension_folder, nodeElement, "lib")
            
            # Add missing or updates files
            addFilesToFolder(js_folder, folder_web_extensions, nodeElement)             
            addFilesToFolder(lib_folder, folder__web_lib, nodeElement)

            checkModules(nodeElement)
            addComfyUINodesToMapping(nodeElement)
            
installNodes()
