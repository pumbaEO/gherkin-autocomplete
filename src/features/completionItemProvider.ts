import * as vscode from "vscode";

import { IMethodValue } from "../IMethodValue";
import AbstractProvider from "./abstractProvider";

const Gherkin = require("gherkin");
const Token = require("./../../../node_modules/gherkin/lib/gherkin/token");
const GherkinLine = require("./../../../node_modules/gherkin/lib/gherkin/gherkin_line");

export default class GlobalCompletionItemProvider extends AbstractProvider implements vscode.CompletionItemProvider {
    private added: Object;

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        cansellationToken: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

        let self = this;
        this.added = {};

        return new Promise((resolve, reject) => {

            let bucket = new Array<vscode.CompletionItem>();
            let textLine: vscode.TextLine = document.lineAt(position.line);

            const filename = document.uri.fsPath;
            const languageInfo = self._global.getLanguageInfo(filename);
            if (languageInfo == null) {
                resolve(bucket);
                return;
            }
            let TokenMatcher = new Gherkin.TokenMatcher(languageInfo.language);

            let line = new GherkinLine(textLine.text, position.line);
            let token = new Token(line, position.line);
            let matches: Boolean = TokenMatcher.match_StepLine(token);

            if (!matches) {
                return resolve(bucket);
            }

            let word: string = token.matchedText;

            let result: Array<IMethodValue> = self._global.getCacheLocal(filename, word, document.getText(), false);
            result.forEach((value, index, array) => {
                if (!self.added[value.name.toLowerCase()] === true) {
                    if (value.name === word) { return; }
                    let item = new vscode.CompletionItem(value.name);
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
                    self.added[value.name.toLowerCase()] = true;
                }
            });
            result = self._global.query(filename, word, true, true);
            result.forEach((value, index, array) => {
                let moduleDescription = "";
                if (self.added[(moduleDescription + value.name).toLowerCase()] !== true) {
                    let item = new vscode.CompletionItem(value.name);
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
                    self.added[(moduleDescription + value.name).toLowerCase()] = true;
                }
            });

            result = self._global.queryAny(word);
            result.forEach((value, index, array) => {
                let moduleDescription = "";
                if (self.added[(moduleDescription + value.name).toLowerCase()] !== true) {
                    let item = new vscode.CompletionItem(value.name);
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
                    self.added[(moduleDescription + value.name).toLowerCase()] = true;
                }
            });
            return resolve(bucket);
        });
    }
}
