import * as fs from "fs";
import * as path from "path";
let Gherkin = require("gherkin");
let parser = new Gherkin.Parser();

let loki = require("lokijs");

import * as vscode from "vscode";

export class Global {
    exec: string;
    cache: any;
    db: any;
    dblocal: any;
    dbcalls: any;
    private toreplaced: any;
    private cacheUpdates: boolean;

    parse(source: string, filename: string): any {
        /*try {
            let gherkinDocument = parser.parse(source);
            let result = JSON.stringify(gherkinDocument, null, 2);
            console.log(result);
        } catch (error) {
            console.log(error);
        }*/

        let ending = "\n";
        if (source.indexOf("\r\n") > 0) {
            ending = "\r\n";
        }
        let name = path.basename(filename, "feature");
        let lines = source.split(ending); // "/\r?\n/");
        let arr = [];

        let lockdb = new loki("loki.json");
        let methods = lockdb.addCollection("ValueTable");
        let replReg = new RegExp("'[А-яA-z\d]'", "i");
        for (let index = 0; index < lines.length; index++) {
            let element: string = lines[index].trim();
            if (element.startsWith("#") || element.startsWith("@")) {
                continue;
            }
            if (element.trim().length === 0) { continue; }
            element = element.replace(/'[а-яёa-z\d]+'/i, "");
            let methRow: MethodValue = {
                    "name": String(element),
                    "isproc": Boolean(false),
                    "line": index,
                    "endline": index,
                    "context": "",
                    "_method": {},
                    "filename": filename,
                    "module": element,
                    "description": name
                };

            methods.insert(methRow);
        }
        return methods;
    }

    getCacheLocal(filename: string, word: string, source, update: boolean = false, allToEnd: boolean = true, fromFirst: boolean = true) {
        let suffix = allToEnd  ? "" : "$";
        let prefix = fromFirst ? "^" : "";
        let querystring = {"name": {"$regex": new RegExp(prefix + word + suffix, "i")}};
        let entries = this.parse(source, filename).find(querystring);
        return entries;
    }

    getReplaceMetadata() {
        return { };
    }

    getModuleForPath(fullpath: string, rootPath: string): any {
        if (!this.toreplaced) {
            this.toreplaced = this.getReplaceMetadata();
        }

        fullpath = decodeURIComponent(fullpath);
        let splitsymbol = process.platform === "win32" ? "\\" : "/";
        if (fullpath.startsWith("file:")) {
            splitsymbol = "/";
            if (process.platform === "win32") {
                fullpath = fullpath.substr(8);
            } else {
                fullpath = fullpath.substr(7);
            }
        }
        let isbsl = false;
        let moduleArray: Array<string> = fullpath.substr(rootPath.length + 1).split(splitsymbol);
        let module: string = "";
        return {"fullpath": fullpath,
                "module": module};
    }

    private addtocachefiles(files: Array<vscode.Uri>, isbsl: boolean = false): any {
        let failed = new Array();
        let rootPath = vscode.workspace.rootPath;
        let replaced = this.getReplaceMetadata();
        for (let i = 0; i < files.length; ++i) {
            if (i > 10){
                continue;
            }
            let fullpath = files[i].toString();
            let moduleObj = this.getModuleForPath(fullpath, rootPath);
            let module = moduleObj.module;
            fullpath = moduleObj.fullpath;
            let source = fs.readFileSync(fullpath, "utf-8");
            let entries = this.parse(source, fullpath).find();
            let count = 0;
            let added = {};
            for (let y = 0; y < entries.length; ++y) {
                let item = entries[y];
                item["filename"] = fullpath;
                let newItem: MethodValue = {
                    "name": String(item.name),
                    "isproc": Boolean(item.isproc),
                    "line": item.line,
                    "endline": item.endline,
                    "context": item.context,
                    "_method": item._method,
                    "filename": fullpath,
                    "module": module,
                    "description": item.description
                };
                ++count;
                this.db.insert(newItem);
            }
        }
        vscode.window.setStatusBarMessage("Обновлен список процедур.", 3000);
    }

    updateCache(filename: string = ""): any {
        console.log("update cache");
        this.cacheUpdates = true;
        let rootPath = vscode.workspace.rootPath;
        if (rootPath) {
            this.db = this.cache.addCollection("ValueTable");
            this.dbcalls = this.cache.addCollection("Calls");

            let self = this;
            let files = vscode.workspace.findFiles("**/*.feature", "", 1000);
                files.then((value) => {
                    this.addtocachefiles(value, false);
                }, (reason) => {
                    console.log(reason);
                });
        }
    };

    queryref(word: string, collection: any, local: boolean = false ): any {
        if (!collection) {
            return new Array();
        }
        let prefix = local ? "" : ".";
        let querystring = {"call": {"$regex": new RegExp(prefix + word + "$", "i")}};
        let search = collection.chain().find(querystring).simplesort("name").data();
        return search;
    }

    private updateReferenceCalls(collection: any, calls: Array<any>, method: any, file: string, added: any): any {
        if (!collection) {
            collection = this.cache.addCollection("Calls");
        }
        let self = this;
        for (let index = 0; index < calls.length; index++) {
            let value = calls[index];
            if (added[value.call] === true) {
                continue;
            };
            if (value.call.startsWith(".")) {
                continue;
            }
            added[value.call] = true;
            let newItem: MethodValue = {
                "name": String(method.name),
                "filename": file,
                "isproc": Boolean(method.isproc),
                "call": value.call,
                "context": method.context,
                "line": value.line,
                "character": value.character,
                "endline": method.endline
            };
            collection.insert(newItem);
        }
    }

    querydef(filename: string, module: string, all: boolean = true, lazy: boolean = false): any {
        // Проверяем локальный кэш. 
        // Проверяем глобальный кэш на модули. 
        // console.log(filename);
        if (!this.cacheUpdates) {
            this.updateCache(filename);
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all  ? "" : "$";
            let querystring = {"module": {"$regex": new RegExp(prefix + module + suffix, "i")}};
            let search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

    query(filename: string, word: string, module: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            this.updateCache(filename);
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all  ? "" : "$";
            let querystring = {"name": {"$regex": new RegExp(prefix + word + suffix, "i")}};
            if (module && module.length > 0) {
                querystring["module"] = {"$regex": new RegExp("^" + module + "", "i")};
            }
            let moduleRegexp = new RegExp("^" + module + "$", "i");
            function filterByModule(obj) {
                if (module && module.length > 0) {
                    if (moduleRegexp.exec(obj.module) != null) {
                        return true;
                    } else {
                        return false;
                    }
                }
                return true;
            }
            let search = this.db.chain().find(querystring).where(filterByModule).simplesort("name").data();
            return search;
        }
    }

    fullNameRecursor(word: string, document: vscode.TextDocument, range: vscode.Range, left: boolean) {
        let result: string;
        let plus: number = 1;
        let newRange: vscode.Range;
        if (left) {
            plus = -1;
            if (range.start.character === 0) {
                return word;
            }
            newRange = new vscode.Range(new vscode.Position(range.start.line, range.start.character + plus), new vscode.Position(range.start.line, range.start.character));
        } else {
            newRange = new vscode.Range(new vscode.Position(range.end.line, range.end.character), new vscode.Position(range.end.line, range.end.character + plus));
        }
        let dot = document.getText(newRange);
        if (dot.endsWith(".")) {
            let newPosition: vscode.Position;
            if (left) {
                let leftWordRange: vscode.Range = document.getWordRangeAtPosition(newRange.start);
                result = document.getText(leftWordRange) + "." + word;
                if (leftWordRange.start.character > 1) {
                    newPosition = new vscode.Position(leftWordRange.start.line, leftWordRange.start.character - 2);
                } else {
                    newPosition = new vscode.Position(leftWordRange.start.line, 0);
                }
            } else {
                result = word + "." + document.getText(document.getWordRangeAtPosition(newRange.start));
                newPosition = new vscode.Position(newRange.end.line, newRange.end.character + 2);
            }
            let newWord = document.getWordRangeAtPosition(newPosition);
            if (newWord) {
                return this.fullNameRecursor(result, document, newWord, left);
            }
            return result;
        } else {
            result = word;
            return result;
        }
    }

    constructor(exec: string) {
        let configuration = vscode.workspace.getConfiguration("specflow-bsl");
        this.cache = new loki("gtags.json");
        this.cacheUpdates = false;
    }
}

interface MethodValue {
    // Имя процедуры/функции'
    name: string;
    // Процедура = true, Функция = false
    isproc: boolean;
    // начало
    line: number;
    // конец процедуры
    endline: number;

    filename: string;
    // контекст НаСервере, НаКлиенте, НаСервереБезКонтекста
    context?: string;
    module?: string;
    description?: string;
    call?: string;
    character?: number;
    _method?: {};
}

/// <reference path="node.d.ts" />