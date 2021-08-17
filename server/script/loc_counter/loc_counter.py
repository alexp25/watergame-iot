#!/usr/bin/python
import os
import sys

import yaml

with open("config.yml", 'r') as ymlfile:
    cfg = yaml.load(ymlfile)

for section in cfg:
    print(section, cfg[section])

path = cfg['path']
extensions = cfg['extensions']
excludeFolders = cfg['exclude_folders']


counter_crt_vect = []

def CountFile(f):
    counter = 0
    with open(f, "r", encoding="utf-8") as f:
        try:
            for line in f.read().split('\n'):
                counter = counter + 1
        except Exception as e:
            counter = 0
            print(e)

    return counter

def CountDir(dirname):
    counter = 0
    files = 0
    counter_vect = ""
    for f in os.listdir(dirname):
        fa = os.path.join(dirname, f)
        if os.path.isdir(fa):
            dcount = CountDir(fa)
            counter = counter + dcount[1]
            counter_vect += fa + "\n" + str(dcount[1]) + "\n"
            files += 1
        else:
            fcount = CountFile(fa)
            counter = counter + fcount
            counter_vect += fa + "\n" + str(fcount) + "\n"
            files += 1
    # print(files)
    # print(counter)
    return (counter_vect, counter, files)


def checkExtension(f, extensions):
    ext = os.path.splitext(f)
    # print(ext[1])
    found = False
    if extensions is not None:
        for e in extensions:
            if e == ext[1]:
                found = True
                break
    else:
        found = True
    return found


def checkExcludeFolders(dirname, excludeFolders):
    for folder in excludeFolders:
        if dirname.startswith(folder):
            return False
    return True

def CountDir2(dirname, extensions, excludeFolders):
    line_count = 0
    file_count = 0
    # counter_vect = ""
    nfiles = 0

    for (i, ef) in enumerate(excludeFolders):
        excludeFolders[i] = dirname + "\\" + ef

    # print("excl")
    # print(excludeFolders)

    for root, dirs, files in os.walk(dirname):
        # print(dirs)
        if not checkExcludeFolders(root, excludeFolders):
            dirs[:] = []
            files[:] = []
        for (index, f) in enumerate(files):
            if checkExtension(f, extensions):
                nfiles += 1

    # print("\n")
    for root, dirs, files in os.walk(dirname):
        # print(root)
        if not checkExcludeFolders(root, excludeFolders):
            dirs[:] = []
            files[:] = []

        for (index, f) in enumerate(files):
            if checkExtension(f, extensions):
                full_filename = os.path.join(root, f)
                count1 = CountFile(full_filename)
                line_count += count1
                counter_crt = '{:-<12}'.format("[" + str(file_count+1) + "/"+ str(nfiles) + "]") + '{:-<12}'.format(str(count1)) + full_filename
                print(counter_crt)
                counter_crt_vect.append(counter_crt)
                # counter_vect += counter_crt
                file_count += 1

    return (line_count, file_count)


res = CountDir2(path, extensions, excludeFolders)

total_string = "TOTAL: " + str(res[0]) + " LOC / " + str(res[1]) + " files"
print(total_string)

# print(counter_crt_vect)
with open("locs.txt", "w") as f:
    for c in counter_crt_vect:
        f.write(c + "\n")
    f.write(total_string)



