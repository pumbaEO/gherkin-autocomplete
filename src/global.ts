import * as fs from "fs";
import * as path from "path";
let Gherkin = require("gherkin");
let parser = new Gherkin.Parser();

let loki = require("lokijs");

import * as vscode from "vscode";

export class Global {
    private cache: any;
    private db: any;
    private dbcalls: any;

    private cacheUpdates: boolean;

    constructor(exec: string) {
        this.cache = new loki("gtags.json");
        this.cacheUpdates = false;
    }

    public getCacheLocal(
        filename: string,
        word: string,
        source,
        update: boolean = false,
        allToEnd: boolean = true,
        fromFirst: boolean = true) {

        let suffix = allToEnd ? "" : "$";
        let prefix = fromFirst ? "^" : "";
        let querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
        let entries = this.parse(source, filename).find(querystring);
        return entries;
    }

    public updateCache(): any {
        console.log("update cache");
        this.cacheUpdates = true;
        let rootPath = vscode.workspace.rootPath;
        if (rootPath) {
            this.db = this.cache.addCollection("ValueTable");
            this.dbcalls = this.cache.addCollection("Calls");

            let files = vscode.workspace.findFiles("**/*.feature", "", 1000);
            files.then((value) => {
                this.addtocachefiles(value);
            }, (reason) => {
                console.log(reason);
            });
        }
    };

    public query(filename: string, word: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all ? "" : "$";
            let querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
            let search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        } else {
            let prefix = lazy ? "" : "^";
            let suffix = all ? "" : "$";
            let querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
            if (module && module.length > 0) {
                querystring["module"] = { $regex: new RegExp("^" + module + "", "i") };
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

    private fullNameRecursor(word: string, document: vscode.TextDocument, range: vscode.Range, left: boolean) {
        let result: string;
        let plus: number = 1;
        let newRange: vscode.Range;
        if (left) {
            plus = -1;
            if (range.start.character === 0) {
                return word;
            }
            newRange = new vscode.Range(
                new vscode.Position(range.start.line, range.start.character + plus),
                new vscode.Position(range.start.line, range.start.character)
            );
        } else {
            newRange = new vscode.Range(
                new vscode.Position(range.end.line, range.end.character),
                new vscode.Position(range.end.line, range.end.character + plus)
            );
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

    private addtocachefiles(files: Array<vscode.Uri>): any {
        let rootPath = vscode.workspace.rootPath;
        for (let i = 0; i < files.length; ++i) {
            let fullpath = files[i].toString();
            let moduleObj = this.getModuleForPath(fullpath, rootPath);
            fullpath = moduleObj.fullpath;
            let source = fs.readFileSync(fullpath, "utf-8");
            let entries = this.parse(source, fullpath).find();
            let count = 0;
            for (let y = 0; y < entries.length; ++y) {
                let item = entries[y];
                item["filename"] = fullpath;
                let newItem: IMethodValue = {
                    description: item.description,
                    endline: item.endline,
                    filename: fullpath,
                    line: item.line,
                    name: item.description,
                };
                ++count;
                this.db.insert(newItem);
            }
        }
        vscode.window.setStatusBarMessage("Features' cache is built.", 3000);
    }

    private parse(source: string, filename: string): any {

        let lockdb = new loki("loki.json");
        let methods = lockdb.addCollection("ValueTable");
        let TokenMatcher = new Gherkin.TokenMatcher("ru");
        let gherkinDocument;
        try {
            gherkinDocument = parser.parse(source, TokenMatcher);
        } catch (error) {
            console.log("error parse file " + filename + ":" + error);
            return methods;
        }

        const children = gherkinDocument.feature.children;
        for (let index = 0; index < children.length; index++) {
            const child = children[index];
            const steps = child.steps;

            for (let indexStep = 0; indexStep < steps.length; indexStep++) {
                const step = steps[indexStep];

                let methRow: IMethodValue = {
                    description: step.text,
                    endline: step.location.line,
                    filename,
                    line: step.location.line,
                    name: step.text,
                };

                methods.insert(methRow);
            }

        }

        return methods;
    }
}
interface IMethodValue {

    name: string;

    // начало
    line: number;
    // конец процедуры
    endline: number;

    filename: string;

    description?: string;
}
