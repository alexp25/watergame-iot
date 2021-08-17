#!/usr/bin/python
import os
import sys

import yaml
import json
import re

with open("config.yml", 'r') as ymlfile:
    cfg = yaml.load(ymlfile)

for section in cfg:
    print(section, cfg[section])

path = cfg['path']
associations = cfg['associations']
outputFullSpecs = cfg['outputFullSpecs']
outputModels = cfg['outputModels']

extensions = [".js"]
excludeFolders = []

datatypes = cfg['datatypes']

counter_crt_vect = []

write = True
getDBModels = True
getDBNames = True

def find_between( s, first, last ):
    try:
        start = s.index( first ) + len( first )
        end = s.index( last, start )
        return s[start:end]
    except ValueError:
        return ""


def getInverseAssociations(f):
    entries = {}
    with open(f, "r", encoding="utf-8") as f:
        try:
            content = f.read()

            # content2 = re.sub(r'\(.*?\)', '', content2)

            # content2 = re.sub(r'm.*?.', '', content)
            tags = re.findall(r'm.*?.belongsTo', content)

            content2Lines = content.split()

            for line in content2Lines:
                # print("line: ", line)
                for tag in tags:
                    if(line.find(tag)!=-1):
                        # print("found: " + tag + "@ " + line)
                        a1 = re.findall(r'm.*?.belongsTo', line)
                        a1 = a1[0][2:-10]
                        a2 = re.findall(r'\(m.*?,', line)
                        a2 = a2[0][3:-1]
                        # print(a1, a2)
                       
                        if a1 not in entries:
                            entries[a1] = [a2]
                        else:
                            entries[a1].append(a2)
                        
                        # print("\n")
                        break
                        
            # print(json.dumps(entries, indent=2))
            # print(tags)
        except Exception as e:
            print(e)

    return entries



def getAssociations(f):
    entries = {}
    with open(f, "r", encoding="utf-8") as f:
        try:
            content = f.read()


            # content2 = re.sub(r'\(.*?\)', '', content2)

            # content2 = re.sub(r'm.*?.', '', content)
            tags = re.findall(r'm.*?.hasMany', content)

            content2Lines = content.split()

            for line in content2Lines:
                # print("line: ", line)
                for tag in tags:
                    if(line.find(tag)!=-1):
                        # print("found: " + tag + "@ " + line)
                        a1 = re.findall(r'm.*?.hasMany', line)
                        a1 = a1[0][2:-8]
                        a2 = re.findall(r'\(m.*?,', line)
                        a2 = a2[0][3:-1]
                        # print(a1, a2)
                       
                        if a1 not in entries:
                            entries[a1] = [a2]
                        else:
                            entries[a1].append(a2)
                        
                        # print("\n")
                        break
                        
            # print(json.dumps(entries, indent=2))
            # print(tags)
        except Exception as e:
            print(e)

    return entries

def getNameInterface(name):
    name = "IDBModel" + name[0:1].capitalize() + name[1:]
    return name
    
def pluralize(singular):
   
    ABERRANT_PLURAL_MAP = {
    'params': 'params',
    'links': 'links',
    'link': 'links',
    'settings': 'settings',
    'specs': 'specs',
    'stats': 'stats',
    'appendix': 'appendices',
    'barracks': 'barracks',
    'cactus': 'cacti',
    'child': 'children',
    'criterion': 'criteria',
    'deer': 'deer',
    'echo': 'echoes',
    'elf': 'elves',
    'embargo': 'embargoes',
    'focus': 'foci',
    'fungus': 'fungi',
    'goose': 'geese',
    'hero': 'heroes',
    'hoof': 'hooves',
    'index': 'indices',
    'knife': 'knives',
    'leaf': 'leaves',
    'life': 'lives',
    'man': 'men',
    'mouse': 'mice',
    'nucleus': 'nuclei',
    'person': 'people',
    'phenomenon': 'phenomena',
    'potato': 'potatoes',
    'self': 'selves',
    'syllabus': 'syllabi',
    'tomato': 'tomatoes',
    'torpedo': 'torpedoes',
    'veto': 'vetoes',
    'woman': 'women',
    }

    VOWELS = set('aeiou')

    """Return plural form of given lowercase singular word (English only). Based on
    ActiveState recipe http://code.activestate.com/recipes/413172/
    
    >>> pluralize('')
    ''
    >>> pluralize('goose')
    'geese'
    >>> pluralize('dolly')
    'dollies'
    >>> pluralize('genius')
    'genii'
    >>> pluralize('jones')
    'joneses'
    >>> pluralize('pass')
    'passes'
    >>> pluralize('zero')
    'zeros'
    >>> pluralize('casino')
    'casinos'
    >>> pluralize('hero')
    'heroes'
    >>> pluralize('church')
    'churches'
    >>> pluralize('x')
    'xs'
    >>> pluralize('car')
    'cars'

    """
    if not singular:
        return ''
    maps = [k for k in ABERRANT_PLURAL_MAP]
    # print(maps)

    plural = None

    for m in maps:
        if singular.lower().endswith(m):
            plural = singular
            break

    # plural = ABERRANT_PLURAL_MAP.get(singular)
    # plural_exc = EXCEPTIONS.get(singular)
    if plural:
        return plural

    root = singular
    try:
        if singular[-1] == 'y' and singular[-2] not in VOWELS:
            root = singular[:-1]
            suffix = 'ies'
        elif singular[-1] == 's':
            if singular[-2] in VOWELS:
                if singular[-3:] == 'ius':
                    root = singular[:-2]
                    suffix = 'i'
                else:
                    root = singular[:-1]
                    suffix = 'ses'
            else:
                suffix = 'es'
        elif singular[-2:] in ('ch', 'sh'):
            suffix = 'es'
        else:
            suffix = 's'
    except IndexError:
        suffix = 's'
    plural = root + suffix
    return plural
    
def extractContentCollection(root, files):
    done = True
    contentXC = "\
import { ISequelizeModel } from \"./db\";\n\n\
export interface IDBCollection {\n\
"

    # [key: string]: ISequelizeModel,\n\
    for (index, f) in enumerate(files):
        # if (index > 0):
        #     break
        if checkExtension(f, extensions):
            full_filename = os.path.join(root, f)
            print("extract collection: ", full_filename)
            with open(full_filename, "r", encoding="utf-8") as f:
                try:
                    content = f.read()
                    find_string = 'sequelize.define('
                    pos = content.find(find_string) 
                    content2 = content[pos:]

                    name = find_between(content2, "'", "'")
                    name1 = name
                    name = getNameInterface(name)

                    print(name)
                    # contentXC += "\t" + name1 + ": " + name + ",\n"
                    contentXC += "\t" + name1 + ": " + "ISequelizeModel"

                    if index < len(files) - 1:
                        contentXC += ","
                    
                    contentXC += "\n"

                except Exception as e:
                    print("EXCEPTION")
                    print(e)
                    contentXC = None
                    done = False

    if done:
        contentXC += "}"

    print(contentXC)
    return contentXC


def extractContent(f, a, inv_a):

    contentX = None

    with open(f, "r", encoding="utf-8") as f:
        try:
            content = f.read()
            # find def
            find_string = 'sequelize.define('
            pos = content.find(find_string) 
            # print(pos)
            content2 = content[pos:]

            name = find_between(content2, "'", "'")
            name1 = name
            name = getNameInterface(name)

            print(name)

            define = "export interface " + name + " {"

            pos = content2.find("', {")
            content2 = content2[pos+3:]
            pos = content2.find("}, {")
            content2 = content2[:pos] + "}"

            # exp = re.findall(r'\b(\w+:)\b', content2)
            exp = [w for w in content2.split() if w.endswith(':')]

            # sort by length, so that there will be only entire words not chunks of words replaced e.g. having id and uid,  uid will not be replaced by u"id"
            exp.sort(key=len, reverse=True)

            for e in exp:
                content2 = content2.replace(e, "\"" + e[:-1] + "\": ")

            for dt in datatypes:
                content2 = content2.replace(dt[0], "\"" + dt[1] + "\"")

            content2 = content2.replace("DataTypes.", "")

            content2 = re.sub(r'\(.*?\)', '', content2)

            content2 = content2.replace("'", "\"")

            content2 = content2.replace("\"\"", "\"")

            try:
                contentJson = json.loads(content2)
                contentJson2 = {}
                for k, v in contentJson.items():
                    v = v['type']
                    contentJson2[k+"?"] = v
                    # print (k, v)
            
                # contentJson2["_table"] = name1

                # print("adding associations")

                # add direct associations
                if name1 in a:
                    for a1 in a[name1]:
                        contentJson2[pluralize(a1)+"?"] = getNameInterface(a1) + "[]"

                # add inverse associations
                if name1 in inv_a:
                    for a1 in inv_a[name1]:
                        contentJson2[a1+"?"] = getNameInterface(a1)

                # contentJson2["[key: string]"] = "any"

                # print(contentJson2)
                newDef = json.dumps(contentJson2, indent=2)

                newDef = newDef.replace("\"","")

                interface = "export interface " + name + " " + newDef
                contentX = interface
            except Exception as e:
                print("EXCEPTION")
                print(e)
                print(content2)
                    
        except Exception as e:
            print(e)

    return contentX



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

def walk2(dirname, extensions, excludeFolders):
    print("\n\nwalking for db table names interface")
    nfiles = 0
    for (i, ef) in enumerate(excludeFolders):
        excludeFolders[i] = dirname + "\\" + ef


    for root, dirs, files in os.walk(dirname):
        # print(dirs)
        if not checkExcludeFolders(root, excludeFolders):
            dirs[:] = []
            files[:] = []
        for (index, f) in enumerate(files):
            if checkExtension(f, extensions):
                nfiles += 1

    contentXC = None

    for root, dirs, files in os.walk(dirname):
        # print(root)
        if not checkExcludeFolders(root, excludeFolders):
            dirs[:] = []
            files[:] = []

        contentXC = extractContentCollection(root, files)

    return (nfiles, contentXC)

def walk(dirname, extensions, excludeFolders):
    print("\n\nwalking for db table specs")
    line_count = 0
    file_count = 0
    exception_count = 0
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

    contentAll = ""

    a = getAssociations(associations)
    inv_a = getInverseAssociations(associations)

    # print("\n\ninverse associations")
    # print(inv_a)
    # inv_a = {}

    for root, dirs, files in os.walk(dirname):
        # print(root)
        if not checkExcludeFolders(root, excludeFolders):
            dirs[:] = []
            files[:] = []

        for (index, f) in enumerate(files):
            # if (index > 0):
            #     break
            if checkExtension(f, extensions):
                full_filename = os.path.join(root, f)
                print(full_filename)

                c = extractContent(full_filename, a, inv_a)
                # print(c)
                if c is not None:
                    contentAll += c + "\n\n"
                    file_count += 1
                else:
                    exception_count += 1

    return (file_count, exception_count, contentAll)


if getDBModels:
    res = walk(path, extensions, excludeFolders)
    total_string = "synced " + str(res[0]) + " files. exceptions: " + str(res[1])
    print(total_string)
    # print(res[2])

    if write:
        with open(outputFullSpecs, "w", encoding="utf-8") as f:
            f.write(res[2])

if getDBNames:
    res = walk2(path, extensions, excludeFolders)
    if write:
        with open(outputModels, "w", encoding="utf-8") as f:
            f.write(res[1])
# print(pluralize("user_entry"))
# print(pluralize("user_stats"))






