import * as vscode from "vscode";

import { IMethodValue } from "../IMethodValue";
import AbstractProvider from "./abstractProvider";

const Gherkin = require("gherkin");
const Token = require("./../../../node_modules/gherkin/lib/gherkin/token");
const GherkinLine = require("./../../../node_modules/gherkin/lib/gherkin/gherkin_line");

export default class GlobalCompletionItemProvider extends AbstractProvider implements vscode.CompletionItemProvider {
    private added: object;

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        cansellationToken: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

        this.added = {};

        return new Promise((resolve, reject) => {

            const bucket = new Array<vscode.CompletionItem>();
            const textLine: vscode.TextLine = document.lineAt(position.line);

            const filename = document.uri.fsPath;
            const languageInfo = this._global.getLanguageInfo(filename);
            if (languageInfo == null) {
                resolve(bucket);
                return;
            }
            const TokenMatcher = new Gherkin.TokenMatcher(languageInfo.language);

            const line = new GherkinLine(textLine.text, position.line);
            const token = new Token(line, position.line);
            const matches: boolean = TokenMatcher.match_StepLine(token);

            if (!matches) {
                return resolve(bucket);
            }

            const word: string = token.matchedText;

            let result: IMethodValue[] = this._global.getCacheLocal(filename, word, document.getText(), false);
            result.forEach((value, index, array) => {
                if (!this.added[value.name.toLowerCase()] === true) {
                    if (value.name === word) { return; }
                    const item = new vscode.CompletionItem(value.name);
                    item.sortText = "0";
                    item.textEdit = new vscode.TextEdit(
                        new vscode.Range(
                            position.line,
                            textLine.text.indexOf(token.matchedKeyword) + token.matchedKeyword.length,
                            position.line,
                            value.name.length + position.character - token.matchedText.length
                        ),
                        value.name
                    );
                    item.filterText = value.name.replace(/ /g, "").toLowerCase() + " ";
                    item.documentation = value.description ? value.description : "";
                    item.kind = vscode.CompletionItemKind.Keyword;
                    bucket.push(item);
                    this.added[value.name.toLowerCase()] = true;
                }
            });
            result = this._global.query(filename, word, true, true);
            result.forEach((value, index, array) => {
                const moduleDescription = "";
                if (this.added[(moduleDescription + value.name).toLowerCase()] !== true) {
                    const item = new vscode.CompletionItem(value.name);
                    item.insertText = value.name.substr(word.length);
                    item.sortText = "1";
                    item.textEdit = new vscode.TextEdit(
                        new vscode.Range(
                            position.line,
                            textLine.text.indexOf(token.matchedKeyword) + token.matchedKeyword.length,
                            position.line,
                            value.name.length + position.character - token.matchedText.length
                        ),
                        value.name
                    );
                    item.filterText = value.name.replace(/ /g, "").toLowerCase() + " ";
                    let startFilename = 0;
                    if (value.filename.length - 60 > 0) {
                        startFilename = value.filename.length - 60;
                    }
                    item.documentation = (value.description ? value.description : "") +
                                        "\n" + value.filename.substr(startFilename) + ":" + value.line;
                    item.kind = value.kind ? value.kind : vscode.CompletionItemKind.File;
                    bucket.push(item);
                    this.added[(moduleDescription + value.name).toLowerCase()] = true;
                }
            });

            result = this._global.queryAny(word);
            result.forEach((value, index, array) => {
                const moduleDescription = "";
                if (this.added[(moduleDescription + value.name).toLowerCase()] !== true) {
                    const item = new vscode.CompletionItem(value.name);
                    item.insertText = value.name.substr(word.length);
                    item.sortText = "3";
                    item.textEdit = vscode.TextEdit.replace(
                        new vscode.Range(
                            position.line,
                            textLine.text.indexOf(token.matchedKeyword) + token.matchedKeyword.length,
                            position.line,
                            value.name.length + position.character - token.matchedText.length
                        ),
                        value.name
                    );
                    item.filterText = value.name.replace(/ /g, "").toLowerCase() + " ";
                    let startFilename = 0;
                    if (value.filename.length - 60 > 0) {
                        startFilename = value.filename.length - 60;
                    }
                    item.documentation = (value.description ? value.description : "") +
                                        "\n" + value.filename.substr(startFilename) + ":" + value.line;
                    item.kind = vscode.CompletionItemKind.Property;
                    item.label = value.name;
                    bucket.push(item);
                    this.added[(moduleDescription + value.name).toLowerCase()] = true;
                }
            });
            return resolve(bucket);
        });
    }
}
