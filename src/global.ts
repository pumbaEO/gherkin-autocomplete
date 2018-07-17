import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as vscode from "vscode";
import Parser = require("onec-syntaxparser");

import { IBslMethodValue, ILanguageInfo, IMethodValue } from "./IMethodValue";

const Gherkin = require("gherkin");
const parser = new Gherkin.Parser();

const loki = require("lokijs");

export class Global {
    private cache: any;
    private db: any;
    private dbsnippets: any;
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
        const querystring = { snippet: { $regex: new RegExp(prefix + word + suffix, "i") } };
        const entries = this.parseFeature(source, filename).find(querystring);
        return entries;
    }

    public queryref(word: string, local = false): any {
        const prefix = local ? "" : ".";
        const querystring = { name: { $regex: new RegExp(prefix + word + "", "i") } };
        const search = this.dbsnippets.chain().find(querystring).simplesort("name").data();
        return search;
    }

    public updateCache(): any {
        this.cacheUpdates = true;
        this.db = this.cache.addCollection("ValueTable");
        this.dbsnippets = this.cache.addCollection("Calls");
        this.languages = this.cache.addCollection("Languages");
        const rootPath = vscode.workspace.rootPath;

        const pathsLibrarys: string[] =
            vscode.workspace.getConfiguration("gherkin-autocomplete")
                .get<string[]>("featureLibraries", []);
        for (let library of pathsLibrarys) {
            if (!(library.endsWith("/") || library.endsWith("\\"))) {
                library += "/";
            }
            library = path.resolve(vscode.workspace.rootPath, library);
            this.findFilesForUpdate(library, "Feature libraries cache is built.");
            this.findFilesBslForUpdate(library, "Bsl snippets search.");
        }

        if (rootPath) {
            let featuresPath = String(vscode.workspace.getConfiguration("gherkin-autocomplete").get("featuresPath"));
            if (featuresPath) {
                if (!(featuresPath.endsWith("/") || featuresPath.endsWith("\\"))) {
                    featuresPath += "/";
                }
            } else {
                // default path is rootPath + ./features
                featuresPath = "./features";
            }
            featuresPath = path.resolve(vscode.workspace.rootPath, featuresPath);
            this.findFilesForUpdate(featuresPath, "Features' cache is built.");
            this.findFilesBslForUpdate(featuresPath, "Bsl snippets search.");
        }

        const bslsPaths: string[] = vscode.workspace.getConfiguration("gherkin-autocomplete")
                        .get<string[]>("srcBslPath", []);
        for (let blspath of bslsPaths) {
            if (!(blspath.endsWith("/") || blspath.endsWith("\\"))) {
                blspath += "/";
            }
            blspath = path.resolve(vscode.workspace.rootPath, blspath);
            this.findFilesBslForUpdate(blspath, "Bsl snippets search.");
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
            const search = this.db.chain().find(querystring).limit(50).simplesort("name").data();
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

    public querySnippet(word: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        } else {
            const prefix = lazy ? "" : "^";
            const suffix = all ? "" : "$";
            const snipp = this.toSnippet(word);
            const querystring = { snippet: { $regex: new RegExp(prefix + snipp + suffix, "i") } };
            const search = this.db.chain().find(querystring).limit(15).simplesort("snippet").data();
            return search;
        }
    }

    public queryExportSnippet(word: string, all: boolean = true, lazy: boolean = false): any {
        if (!this.cacheUpdates) {
            this.updateCache();
            return new Array();
        } else {
            const prefix = lazy ? "" : "^";
            const suffix = all ? "" : "$";
            const snipp = this.toSnippet(word);
            const querystring = { snippet: { $regex: new RegExp(prefix + snipp + suffix, "i") } };
            /*const querystring = { "$and" : [
                { snippet: { $regex: new RegExp(prefix + snipp + suffix, "i") } },
                {isexport: { '$eq' : true }}
            ] };*/

            function filterByExport(obj) {
                return obj.isexport;
            };
            const search = this.db.chain().find(querystring).where(filterByExport)
                                .limit(15)
                                .simplesort("snippet")
                                .data();
            return search;
        }
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

    public toSnippet(stringLine: string, getsnippet: boolean = true): string {
        const re3Quotes = new RegExp(/('''([^''']|'''''')*''')/, "g");
        const re1Quotes = new RegExp(/('([^']|'')*')/, "g");
        const re2Quotes = new RegExp(/("([^"]|"")*")/, "g");
        const re = new RegExp(/(<([^<]|<>)*>)/, "g");
        const reSpaces = new RegExp(/\s/, "g");
        let result = stringLine.replace(re3Quotes, getsnippet ? "" : "''''''")
                        .replace(re1Quotes, getsnippet ? "" : "''")
                        .replace(re2Quotes, getsnippet ? "" : "\"\"" )
                        .replace(re, getsnippet ? "" : "<>");
        if (getsnippet) {
            result = result.replace(reSpaces, "");
        }
        return result;
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
                try {
                    this.addFileToCache(vscode.Uri.file(file));
                } catch (error) {
                    console.error( file + ":" + error);
                }
            }
            vscode.window.setStatusBarMessage(successMessage, 3000);
        });
    }

    private findFilesBslForUpdate(modulepath: string, successMessage: string): void {
        const globOptions: glob.IOptions = {};
        globOptions.dot = true;
        globOptions.cwd = modulepath;
        globOptions.nocase = true;
        // glob >=7.0.0 contains this property
        // tslint:disable-next-line:no-string-literal
        globOptions["absolute"] = true;
        glob("**/*.bsl", globOptions, (err, files) => {
            if (err) {
                console.error(err);
                return;
            }
            for (const file of files) {
                try {
                    this.addSnippetsToCache(vscode.Uri.file(file));
                } catch (error) {
                    console.error( file + ":" + error);
                }
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
                newPosition = new vscode.Position(leftWordRange.start.line, 0);
                if (leftWordRange.start.character > 1) {
                    newPosition = new vscode.Position(leftWordRange.start.line, leftWordRange.start.character - 2);
                // } else {
                //    newPosition = new vscode.Position(leftWordRange.start.line, 0);
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
        const entries = this.parseFeature(source, fullpath).find();
        let count = 0;
        for (const item of entries) {
            const newItem: IMethodValue = {
                description: item.description,
                endline: item.endline,
                filename: fullpath,
                isexport: item.isexport,
                kind: vscode.CompletionItemKind.Module,
                line: item.line,
                name: item.name,
                snippet: item.snippet
            };
            ++count;
            this.db.insert(newItem);
        }
    }

    private parseSnippets(source: string, filename: string): any {

        const lockdb = new loki("loki.json");
        const methods = lockdb.addCollection("ValueTable");
        const re = new RegExp(/\.ДобавитьШагВМассивТестов\([a-zA-Zа-яА-Я]+\,\".*\","([a-zA-Zа-яА-Я]+)\"/, "igm");
        const parsesModule = new Parser().parse(source);
        const entries = parsesModule.getMethodsTable().find();
        return entries;
    }

    private addSnippetsToCache(uri: vscode.Uri) {
        const fullpath = uri.fsPath;
        const source = fs.readFileSync(fullpath, "utf-8");
        const entries = this.parseSnippets(source, fullpath);

        for (const item of entries) {
            const method = {
                context: item.context,
                endline: item.endline,
                isproc: item.isproc,
                name: item.name
            };

            const dbMethod = {
                IsExport: item._method.IsExport,
                Params: item._method.Params
            };
            const newItem: IBslMethodValue = {
                name: String(item.name),
                // tslint:disable-next-line:object-literal-sort-keys
                isproc: Boolean(item.isproc),
                isExport: Boolean(item._method.IsExport),
                line: item.line,
                endline: item.endline,
                context: item.context,
                _method: dbMethod,
                filename: fullpath,
                // module: moduleStr,
                description: item.description
            };
            this.dbsnippets.insert(newItem);
        }
    }
    private parseFeature(source: string, filename: string): any {

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
        let isExport = false;
        for (const tag of gherkinDocument.feature.tags) {
            const tagname: string = tag.name;
            if (tagname.toLowerCase().localeCompare("@ExportScenarios".toLowerCase()) === 0) {
                isExport = true;
                break;
            }
        }

        for (const child of children) {
            if (isExport) {
                if (!(child.name.length === 0 || !child.name.trim())) {
                    const text: string = child.name;
                    const methRow: IMethodValue = {
                        description: text,
                        endline: child.location.line,
                        filename,
                        isexport: true,
                        line: child.location.line,
                        name: text,
                        snippet: this.toSnippet(text)
                    };
                    methods.insert(methRow);
                }
                // continue;
            }
            const steps = child.steps;

            for (const step of steps) {
                const text: string = step.text;
                const methRow: IMethodValue = {
                    description: step.text,
                    endline: step.location.line,
                    filename,
                    isexport: false,
                    line: step.location.line,
                    name: this.toSnippet(text, false),
                    snippet: this.toSnippet(text)
                };

                methods.insert(methRow);
            }

        }

        return methods;
    }
}
