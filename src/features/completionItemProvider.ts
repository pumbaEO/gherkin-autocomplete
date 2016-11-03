import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";

const Gherkin = require("gherkin");
const Token = require("./../../../node_modules/gherkin/lib/gherkin/token");
const GherkinLine = require("./../../../node_modules/gherkin/lib/gherkin/gherkin_line");

export default class GlobalCompletionItemProvider extends AbstractProvider implements vscode.CompletionItemProvider {
    private added: Object;

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

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
            let wordRange: vscode.Range = document.getWordRangeAtPosition(position);
            let word2: string = "";
            if (wordRange) {
                word2 = document.getText(wordRange);
            }
            let word: string = token.matchedText.trim();

            let firstChar = 0; // textLine.firstNonWhitespaceCharacterIndex;

            let result: Array<any> = self._global.getCacheLocal(document.fileName, word, document.getText(), false);
            result.forEach((value, index, array) => {
                if (!self.added[value.name.toLowerCase()] === true) {
                    if (value.name === word) { return; }
                    let item = new vscode.CompletionItem(value.name);
                    item.sortText = "0";
                    item.insertText = word2 + value.name.substr(word.length ? word.length: 0);
                    item.filterText = value.name.replace(/ /g, "").toLowerCase() + " ";
                    item.documentation = value.description;
                    item.kind = vscode.CompletionItemKind.Keyword;
                    bucket.push(item);
                    self.added[value.name.toLowerCase()] = true;
                }
            });
            result = self._global.query(document.fileName, word, "", true, false);
            result.forEach((value, index, array) => {
                let moduleDescription = "";
                if (self.added[(moduleDescription + value.name).toLowerCase()] !== true) {
                    let item = new vscode.CompletionItem(value.name);
                    item.insertText = value.name.substr(word.length);
                    item.sortText = "1";
                    item.insertText = word2 + value.name.substr(word.length ? word.length : 0);
                    item.filterText = value.name.replace(/ /g, "").toLowerCase() + " ";
                    item.documentation = value.description;
                    item.documentation = value.description;
                    item.kind = vscode.CompletionItemKind.File;
                    bucket.push(item);
                    self.added[(moduleDescription + value.name).toLowerCase()] = true;
                }
            });
            //console.log(bucket.length);
            return resolve(bucket);
        });
    }
}
