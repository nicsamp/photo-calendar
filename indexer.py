from pathlib import Path
import exiftool
import json

FOLDER = "./images/"
media_ext = {".png", ".jpg", ".gif", ".jpeg", ".wmv", ".mpg", ".3gp", ".avi", ".mov", ".mp4", ".mswmm", ".heic", ".bmp"}
img_ext = {".png", ".jpg", ".gif", ".jpeg", ".bmp"}
MAX_BATCH_SIZE = 256
GET_DATES = True
GET_EXTENSIONS = False

print("filtering media...")
extensions = set()
extension_examples = []
target_media = []
curr_batch = []

folder = Path(FOLDER)
unknown_extensions = 0
for path in folder.rglob("*"):
    if path.is_file():
        ext = path.suffix.lower()
        if ext not in extensions:
            extensions.add(ext)
            extension_examples.append([ext, str(path)])
        if ext not in media_ext:
            unknown_extensions += 1

        if GET_DATES and (ext in media_ext):
            curr_batch.append(str(path))
            if len(curr_batch) >= MAX_BATCH_SIZE:
                target_media.append(curr_batch)
                curr_batch = []
if curr_batch:
    target_media.append(curr_batch)

if GET_DATES:
    print("finding dates...")
    metadata = ["File:FileName", "EXIF:DateTimeOriginal", "QuickTime:CreateDate"]
    index = {}
    batches = []
    faulty = []
    files_left = sum(len(batch) for batch in target_media)

    with exiftool.ExifToolHelper() as et:
        while target_media:
            target = target_media.pop()
            print(f"{files_left} files left.")
            
            try:
                batch = et.get_tags(target, tags=metadata, params=["-m"])
                batches.extend(batch)
                files_left -= len(target)
            except Exception as e:
                if len(target) == 1:
                    #print(f"FAULTY FILE: {target[0]}\nError: {e}")
                    files_left -= 1
                    faulty.append(target[0])
                    continue

                mid = len(target)//2
                target_media.append(target[:mid])
                target_media.append(target[mid:])

    print("storing dates...")
    unknown_dates = []
    good_file_n = 0
    for file_metadata in batches:
        datetime = file_metadata.get('EXIF:DateTimeOriginal') or file_metadata.get('QuickTime:CreateDate')
        file = file_metadata.get('SourceFile')

        if datetime:
            try:
                date, time = datetime.split(" ")
                year, month, day = map(int, date.split(":"))
                hour, min, sec = map(int, time.split(":"))
                obj = {"path": file, "h": hour, "m": min, "s": sec}
                is_img = Path(file).suffix.lower() in img_ext
                obj["is_img"] = is_img
                year_dict = index.setdefault(year, {})
                month_dict = year_dict.setdefault(month, {})
                month_dict.setdefault(day, []).append(obj)
                good_file_n += 1
            except ValueError:
                unknown_dates.append({"path": file})
        else:
            unknown_dates.append({"path": file})

    print("sorting dates...")
    for year in index.values():
        for month in year.values():
            for day in month.values():
                day.sort(key = lambda x: (x["h"], x["m"], x["s"]))

    if unknown_dates:
        index["-1"] = unknown_dates

    print("saving...")
    with open("index.js", "w") as f:
        f.write("const image_data = ")
        json.dump(index, f, indent = 4)

    with open("faulty_files.txt", "w") as f:
        f.write("\n".join(faulty))

    tot_files = good_file_n + len(unknown_dates) + len(faulty) #+ unknown_extensions
    print(f"Total files:        {tot_files}")
    print(f"Successful files:   {good_file_n} ({good_file_n / tot_files * 100:.2f} %)")
    print(f"Unknown date files: {len(unknown_dates)} ({len(unknown_dates) / tot_files * 100:.2f} %)")
    print(f"Broken files:       {len(faulty)} ({len(faulty) / tot_files * 100:.2f} %)")
    #print(f"Unknown extensions: {unknown_extensions} ({unknown_extensions / tot_files * 100:.2f} %)")

if GET_EXTENSIONS:
    print("Unused extensions:")
    for extension,example in extension_examples:
        if extension not in media_ext:
            print(f"{extension}: {example}")
print(f"Unknown extensions: {unknown_extensions} ")