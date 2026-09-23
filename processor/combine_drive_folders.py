from pathlib import Path
import shutil

SOURCE = "./images"
DEST = "./images"
DRIVE_NAME = "images"

folder = Path(SOURCE)
for path in folder.rglob("*"):
    if path.is_dir():
        if str(path).startswith(DRIVE_NAME):
            print(f"Combining folder: {path}")
            for subpath in path.iterdir():
                if subpath.is_dir():
                    shutil.copytree(str(subpath), DEST, dirs_exist_ok=True)
                    shutil.rmtree(str(subpath))
                else:
                    shutil.move(str(subpath), DEST)
            shutil.rmtree(str(path))