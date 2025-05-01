# Title: Autoinstall Golang (Go) and DeepLX for ComfyUI DeepLXTranslateNode
# Author: AlekPet (https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet)
# DeepLXTranslateNode README: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/blob/master/DeepLXTranslateNode/README.md

import os
from sys import version_info, platform as _platform
import platform
import requests
from tqdm import tqdm
import shutil

class ColPrintInstall:
    RED = "\033[1;31;40m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    MAGNETA = "\033[95m"
    BLUE = "\033[94m"
    CLEAR = "\033[0m"


GO_URLS = {
    "win32": "https://go.dev/dl/go1.24.2.windows-386.zip",
    "win64": "https://go.dev/dl/go1.24.2.windows-amd64.zip",
    "darwin": "https://go.dev/dl/go1.24.2.darwin-arm64.tar.gz",
    "linux": "https://go.dev/dl/go1.24.2.linux-386.tar.gz",
    }

FILES_DOWNLOAD = {
    "Golang": {
        "url": None,
    },
    "DeepLX": {
        "url":"https://github.com/OwO-Network/DeepLX/archive/refs/heads/main.zip",
    },
}

WORK_DIR = os.path.dirname(os.path.abspath(__file__))


def getPlatform():
    """ Get platform machine """
    platform_name = None
    
    if _platform.startswith("linux"):
        platform_name = "linux"
        
    elif _platform == "darwin":
        platform_name = "darwin"
        
    elif _platform == "win32":
        # Check Windows id 64-bit
        if platform.machine().endswith('64'):
            platform_name = "win64"
        else:
            platform_name = "win32"
    
    return platform_name


def download(url, save_to = WORK_DIR):
    """ Download file """
    file_name = url.split('/')[-1]
    print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.BLUE} Downloading file: {url}{ColPrintInstall.CLEAR}")
    
    response = requests.get(url, stream=True)
    file_size = int(response.headers.get('Content-Length', 0))
    
    save_file_path = os.path.join(save_to, file_name)
    chunk_size = 1024
    
    with open(save_file_path, "wb") as handle, tqdm(
    desc=file_name,
    total=file_size,
    unit='B',
    unit_scale=True,
    unit_divisor=chunk_size,
) as progress_bar:
        for data in response.iter_content(chunk_size=chunk_size):
                handle.write(data)
                progress_bar.update(len(data))
                
        
    print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.GREEN} File '{file_name}' downloaded!{ColPrintInstall.CLEAR}")    
    return file_name, save_file_path


def extractArchive(file_path, extract_to = WORK_DIR, removeArchive = True):
    """ Extract zip or tar.gzip archive """
    try:
        file_name = os.path.basename(file_path)
        ext = os.path.splitext(file_path)[-1]
        desc = f"Extracting '{file_name}'"
        
        # Type archive
        if ext == ".gz":
            # TarFile
            import tarfile

            # Safe extract for python < 3.12 (secure path traversal)
            def safe_extract(tar, path=".", members=None):
                if members is None:
                    members = tar.getmembers()
                
                safe_members = []
                for member in members:
                    member_path = os.path.join(path, member.name)
                    if not os.path.abspath(member_path).startswith(os.path.abspath(path)):
                        continue
                    safe_members.append(member)
                
                tar.extractall(path, safe_members)
                
            # Open tar archive
            with tarfile.open(file_path, 'r') as tar_archive:
                members = tar_archive.getmembers()

                # Python >= 3.12
                if version_info >= (3, 12):
                    for file in tqdm(members, desc=desc, unit="file"):
                        tar_archive.extract(file, extract_to, filter='data')
                else:
                    for member in tqdm(members, desc=desc):
                        safe_extract(tar_archive, extract_to, [member])
                        

        elif ext == ".zip":
            # ZipFile
            import zipfile

            # Open zip archive
            with zipfile.ZipFile(file_path, 'r') as zip_archive:
                file_list = zip_archive.namelist()
                
                with tqdm(file_list, desc=desc, unit="file") as pbar:
                    for file in pbar:
                        zip_archive.extract(file, extract_to)
                        
        print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.GREEN} Archive '{file_name}' extracted.{ColPrintInstall.CLEAR}")

        # Remove archive file
        if removeArchive:
            os.remove(file_path)
            print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.MAGNETA} File {file_name} removed, after extract.{ColPrintInstall.CLEAR}\n")
                
    except Exception as e:
        raise e


def otherOperations(name, save_path_dir):
    if name == "DeepLX":
        path_to_deeplx_master = os.path.join(save_path_dir, "DeepLX-main")
        path_to_rename = os.path.join(save_path_dir, "DeepLX")
        
        if os.path.isdir(path_to_deeplx_master) and not os.path.exists(path_to_rename):
            os.rename(path_to_deeplx_master, path_to_rename)
            print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.MAGNETA} Directory 'DeepLX-main' renamed to 'DeepLX'!{ColPrintInstall.CLEAR}")
        else:
            print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.MAGNETA} Directory 'DeepLX' already exists or directory {path_to_deeplx_master}' is not correct! Renaming operation abort!{ColPrintInstall.CLEAR}")
            shutil.rmtree(path_to_deeplx_master, ignore_errors=True)


def main():
    print(f"""{ColPrintInstall.MAGNETA}~~~~~~~~~ Autoinstall Golang (Go) and DeepLX for ComfyUI DeepLXTranslateNode by AlekPet ~~~~~~~~~
#{ColPrintInstall.CLEAR} Github: {ColPrintInstall.BLUE}https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
{ColPrintInstall.MAGNETA}~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~{ColPrintInstall.CLEAR}""")
    try:
        platform_name = getPlatform()
        print(f"{ColPrintInstall.YELLOW}[DeepLXTranslateNode]{ColPrintInstall.GREEN} Your platform is: {'macOS (Darwin)' if platform_name == 'darwin' else platform_name.capitalize()}{ColPrintInstall.CLEAR}")

        if platform_name is None:
            raise Exception("Unable to determine identifying the underlying platform!")

        url_down = GO_URLS[platform_name]

        # Download links (Golang and DeepLX)
        FILES_DOWNLOAD["Golang"]["url"] = url_down
              
        for keyName in FILES_DOWNLOAD:
            url = FILES_DOWNLOAD[keyName].get("url")
            
            if url is None:
                continue
            
            # Download file
            file_name, path_to_file = download(url, WORK_DIR)
            
            # Extract file
            extractArchive(path_to_file)
            
            # Other operation
            otherOperations(keyName, WORK_DIR)

            
        print(f"{ColPrintInstall.GREEN}--------------------\nAutoinstall has completed its work...{ColPrintInstall.CLEAR}")
        
    except Exception as e:
        raise e
                
if __name__ == "__main__":
    main()
    
