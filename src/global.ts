import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as vscode from "vscode";

import { IMethodValue } from "./IMethodValue";

const Gherkin = require("gherkin");
const parser = new Gherkin.Parser();

const loki = require("lokijs");

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
        fromFirst: boolean = true): IMethodValue[] {

        const suffix = allToEnd ? "" : "$";
        const prefix = fromFirst ? "^" : "";
        const querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
        const entries = this.parse(source, filename).find(querystring);
        return entries;
    }

    public updateCache(): any {
        this.cacheUpdates = true;
        this.db = this.cache.addCollection("ValueTable");
        this.dbcalls = this.cache.addCollection("Calls");
        this.languages = this.cache.addCollection("Languages");
        const rootPath = vscode.workspace.rootPath;
        if (rootPath) {
            let featuresPath = String(vscode.workspace.getConfiguration("gherkin-autocomplete").get("featuresPath"));
            if (featuresPath) {
                if (!(featuresPath.endsWith("/") || featuresPath.endsWith("\\"))) {
                    featuresPath += "/";
                }
            }
            featuresPath = path.resolve(vscode.workspace.rootPath, featuresPath);
            this.findFilesForUpdate(featuresPath, "Features' cache is built.");
        }

        const pathsLibrarys: string[] =
            vscode.workspace.getConfiguration("gherkin-autocomplete")
                .get<string[]>("featureLibraries", []);
        for (let library of pathsLibrarys) {
            if (!(library.endsWith("/") || library.endsWith("\\"))) {
                library += "/";
            }
            library = path.resolve(vscode.workspace.rootPath, library);
            this.findFilesForUpdate(library, "Feature libraries cache is built.");
        }
    };

    public updateCacheOfTextDocument(uri): any {
        this.db.removeWhere((obj) => obj.filename === uri.fsPath);
        this.addFileToCache(uri);
    }

    public query(filename: string, word: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        } else {
            const prefix = lazy ? "" : "^";
            const suffix = all ? "" : "$";
            const querystring = { name: { $regex: new RegExp(prefix + word + suffix, "i") } };
            const search = this.db.chain().find(querystring).simplesort("name").data();
            return search;
        }
    }

    public queryAny(word: string): any {
        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        }
        const words = word.split(" ");
        const sb: string[] = new Array();
        words.forEach( (element) => {
            sb.push("(?=.*");
            sb.push(element);
            sb.push(")");
        });
        sb.push(".+");
        const querystring = { name: { $regex: new RegExp(sb.join(""), "i") } };
        const search = this.db.chain().find(querystring).simplesort("name").data();
        return search;
    }

    public getLanguageInfo(filename: string): ILanguageInfo {
        if (!this.cacheUpdates) {
            this.updateCache();
            const languageInfo: ILanguageInfo = {
                language: "en",
                name: filename,
            };
            return languageInfo;
        }

        return this.languages.findOne({ name: filename });
    }

    private findFilesForUpdate(library: string, successMessage: string): void {
        const globOptions: glob.IOptions = {};
        globOptions.dot = true;
        globOptions.cwd = library;
        globOptions.nocase = true;
        // glob >=7.0.0 contains this property
        // tslint:disable-next-line:no-string-literal
        globOptions["absolute"] = true;
        glob("**/*.feature", globOptions, (err, files) => {
            if (err) {
                console.error(err);
                return;
            }
            for (const file of files) {
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
        const dot = document.getText(newRange);
        if (dot.endsWith(".")) {
            let newPosition: vscode.Position;
            if (left) {
                const leftWordRange: vscode.Range = document.getWordRangeAtPosition(newRange.start);
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
            const newWord = document.getWordRangeAtPosition(newPosition);
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
        const fullpath = uri.fsPath;
        const source = fs.readFileSync(fullpath, "utf-8");
        const entries = this.parse(source, fullpath).find();
        let count = 0;
        for (const item of entries) {
            const newItem: IMethodValue = {
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

        const lockdb = new loki("loki.json");
        const methods = lockdb.addCollection("ValueTable");
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
        for (const child of children) {
            const steps = child.steps;

            for (const step of steps) {
                const text: string = step.text;
                const methRow: IMethodValue = {
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
