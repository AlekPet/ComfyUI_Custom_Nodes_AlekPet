# Title: ComfyUI Install Customs Nodes and javascript files
# Author: AlekPet
# Version: 2023.12.03
import os
import importlib.util
import subprocess
import sys
import filecmp
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
folder_web_extensions = os.path.join(folder_web, "extensions")
folder__web_lib = os.path.join(folder_web, 'lib')
extension_dirs = ["AlekPet_Nodes",]
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


def check_is_installed(module_name):    
    try:
        module_name_cut_index = module_name_cut_version.search(module_name)
        module_name_no_version = ""
        if(module_name_cut_index):
            module_name_cut_index = module_name_cut_index.start()
            module_name_no_version = module_name[:module_name_cut_index]
            modulImport = importlib.util.find_spec(module_name_no_version)
            
            if(modulImport is not None):
                return True
        
        if(module_name_no_version.lower() in installed_modules or module_name.lower() in installed_modules):                   
            return True
        
        return False 

    except ModuleNotFoundError:
        return False


def module_install_old(module_name, action='install'):
    if not module_name and not action:
        log(f'    [!] Action, module_name arguments is not corrects!')
        return

    command = f'"{python}" -m pip {action} {module_name}'
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, env=os.environ)
    action_capitalize = action.capitalize()

    if result.returncode != 0:
        log(f'    [E] {action_capitalize} module {module_name} is fail! Error code: {result.returncode}')

    log(f'    [*] {action_capitalize} module "{module_name}" successful')


def checkModules_old(nodeElement):
    file_requir = os.path.join(extension_folder, nodeElement, 'requirements.txt')
    if os.path.exists(file_requir):
        log("  -> File 'requirements.txt' found!")
        with open(file_requir, 'r', encoding="utf-8") as r:
            for m in r.readlines():
                m = m.strip()

                if m.startswith("#"):
                    log(f"    [!] Found comment skipping: '{m}'")
                    continue

                log(f"    [*] Check installed module '{m}'...")
                check_m = check_is_installed(m)
                if not check_m:
                    module_install(m)
                else:
                    log(f"    [*] Module '{m}' is installed!")


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


def removeFilesOldFolder(folderSrc, folderDst, nodeElement):
    if os.path.exists(folderSrc):
        folder = os.path.split(folderDst)[-1]
        log(f"  -> Find old js files and remove in '{folder}' folder")
        find_files = filecmp.dircmp(folderDst, folderSrc)
        if find_files.common:
            listFiles = list()
            listFiles.extend(f for f in find_files.common if f not in listFiles)

            log(f"    [*] Found old files in '{folder}' folder: {', '.join(listFiles)}")
            for f in listFiles:
                dst_f = os.path.join(folderDst, f)
                if os.path.exists(dst_f):
                    log(f"    [*] File '{f}' is removed.")
                    os.remove(dst_f)


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
        dir_ = os.path.join(folder_web_extensions, d)
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
    web_extensions_dir = os.path.join(folder_web_extensions, extension_dirs[0])
    
    if os.path.exists(web_extensions_dir):
        shutil.rmtree(web_extensions_dir)
        
    checkFolderIsset()

    for nodeElement in os.listdir(extension_folder):
        if not nodeElement.startswith('__') and nodeElement.endswith('Node') and os.path.isdir(os.path.join(extension_folder, nodeElement)):
            log(f"* Node <{nodeElement}> is found, installing...")
            js_folder = os.path.join(extension_folder, nodeElement, "js")
            lib_folder = os.path.join(extension_folder, nodeElement, "lib")

            # Removes old files
            removeFilesOldFolder(js_folder, folder_web_extensions, nodeElement)

            # Add missing or updates files
            addFilesToFolder(js_folder, web_extensions_dir, nodeElement)
            addFilesToFolder(lib_folder, folder__web_lib, nodeElement)

            # Loading node info
            printColorInfo(f"Node -> {nodeElement} [Loading]")

            checkModules(nodeElement)
            addComfyUINodesToMapping(nodeElement)
    printColorInfo(f"### [END] ComfyUI AlekPet Nodes ###", "\033[1;35m")


installNodes()
