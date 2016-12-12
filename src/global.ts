import * as fs from "fs";
import * as glob from "glob";
import * as vscode from "vscode";

import { IMethodValue } from "./IMethodValue";

let Gherkin = require("gherkin");
let parser = new Gherkin.Parser();

let loki = require("lokijs");

export class Global {
    private cache: any;
    private db: any;
    private dbcalls: any;
    private languages: any;

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
        fromFirst: boolean = true): Array<IMethodValue> {

        let suffix = allToEnd ? "" : "$";
        let prefix = fromFirst ? "^" : "";
        let querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
        let entries = this.parse(source, filename).find(querystring);
        return entries;
    }

    public updateCache(): any {
        this.cacheUpdates = true;
        this.db = this.cache.addCollection("ValueTable");
        this.dbcalls = this.cache.addCollection("Calls");
        this.languages = this.cache.addCollection("Languages");
        let rootPath = vscode.workspace.rootPath;
        if (rootPath) {
            let featuresPath = String(vscode.workspace.getConfiguration("gherkin-autocomplete").get("featuresPath"));
            if (featuresPath) {
                if (!(featuresPath.endsWith("/") || featuresPath.endsWith("\\"))) {
                    featuresPath += "/";
                }
            }
            featuresPath += "**/*.feature";
            this.findFilesForUpdate(featuresPath, "Features' cache is built.");
        }

        let pathsLibrarys: string[] =
            vscode.workspace.getConfiguration("gherkin-autocomplete")
                .get<string[]>("featureLibraries", []);
        for (let library of pathsLibrarys) {
            if (!(library.endsWith("/") || library.endsWith("\\"))) {
                library += "/";
            }
            library += "**/*.feature";
            this.findFilesForUpdate(library, "Feature libraries cache is built.");
        }
    };

    public updateCacheOfTextDocument(uri): any {
        this.db.removeWhere((obj) => { return obj.filename === uri.fsPath; });
        this.addFileToCache(uri);
    }

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

    public queryAny(word: string): any {
        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        }
        let words = word.split(" ");
        let sb: String[] = new Array();
        words.forEach( (element) => {
            sb.push("(?=.*");
            sb.push(element);
            sb.push(")");
        });
        sb.push(".+");
        let querystring = { name: { $regex: new RegExp(sb.join(""), "i") } };
        let search = this.db.chain().find(querystring).simplesort("name").data();
        return search;
    }

    public getLanguageInfo(filename: string): ILanguageInfo {
        if (!this.cacheUpdates) {
            this.updateCache();
            let languageInfo: ILanguageInfo = {
                language: "en",
                name: filename,
            };
            return languageInfo;
        }

        return this.languages.findOne({ name: filename });
    }

    private findFilesForUpdate(library: string, successMessage: string): void {
        let globOptions: glob.IOptions = {};
        globOptions.dot = true;
        globOptions.cwd = vscode.workspace.rootPath;
        globOptions.nocase = true;
        // glob >=7.0.0 contains this property
        // tslint:disable-next-line:no-string-literal
        globOptions["absolute"] = true;
        glob(library, globOptions, (err, files) => {
            if (err) {
                console.error(err);
                return;
            }
            for (let file of files) {
                this.addFileToCache(vscode.Uri.file(file));
            }
            vscode.window.setStatusBarMessage(successMessage, 3000);
        });
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

    private addFileToCache(uri: vscode.Uri) {
        let fullpath = uri.fsPath;
        let source = fs.readFileSync(fullpath, "utf-8");
        let entries = this.parse(source, fullpath).find();
        let count = 0;
        for (let item of entries) {
            let newItem: IMethodValue = {
                description: item.description,
                endline: item.endline,
                filename: fullpath,
                kind: vscode.CompletionItemKind.Module,
                line: item.line,
                name: item.description,
            };
            ++count;
            this.db.insert(newItem);
        }
    }

    private parse(source: string, filename: string): any {

        let lockdb = new loki("loki.json");
        let methods = lockdb.addCollection("ValueTable");
        let gherkinDocument;
        try {
            gherkinDocument = parser.parse(source);
        } catch (error) {
            console.log("error parse file " + filename + ":" + error);
            return methods;
        }
        let languageInfo: ILanguageInfo;
        try {
            languageInfo = {
                language: gherkinDocument.feature.language,
                name: filename,
            };
        } catch (error) {
            console.error("error parse language " + filename + ":" + error);
            return methods;
        }

        this.languages.insert(languageInfo);
        if (!gherkinDocument.feature.children) {
            return methods;
        }

        const children = gherkinDocument.feature.children;
        for (let child of children) {
            const steps = child.steps;

            for (let step of steps) {
                let text: string = step.text;
                let methRow: IMethodValue = {
                    description: step.text,
                    endline: step.location.line,
                    filename,
                    line: step.location.line,
                    name: text,
                };

                methods.insert(methRow);
            }

        }

        return methods;
    }
}

interface ILanguageInfo {
    language: string;
    name: string;
}
