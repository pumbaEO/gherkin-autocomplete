import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";


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
            let word = textLine.text.trim();
            let firstChar = textLine.firstNonWhitespaceCharacterIndex;

            let result: Array<any> = self._global.getCacheLocal(document.fileName, word, document.getText(), false);
            result.forEach( (value, index, array) => {
                if (!self.added[value.name.toLowerCase()] === true) {
                    if (value.name === word) { return; }
                    let item = new vscode.CompletionItem(value.name);
                    item.sortText = "0";
                    item.insertText = value.name;
                    item.textEdit = new vscode.TextEdit(
                        new vscode.Range(position.line, firstChar, position.line, position.character),
                        value.name
                    );
                    item.filterText = value.name;
                    item.documentation = value.description;
                    item.kind = vscode.CompletionItemKind.Keyword;
                    bucket.push(item);
                    self.added[value.name.toLowerCase()] = true;
                }
            });
            result = self._global.query(document.fileName, word, "", true, false);
            result.forEach( (value, index, array) => {
                let moduleDescription = (value.module && value.module.length > 0) ? module + "." : "";
                if (self.added[(moduleDescription + value.name).toLowerCase()] !== true) {
                    let item = new vscode.CompletionItem(value.name);
                    item.insertText = value.name.substr(word.length);
                    item.sortText = "1";
                    item.insertText = value.name;
                    item.textEdit = new vscode.TextEdit(
                        new vscode.Range(position.line, firstChar, position.line, position.character),
                        value.name
                    );
                    item.documentation = value.description;
                    item.kind = vscode.CompletionItemKind.File;
                    bucket.push(item);
                    self.added[(moduleDescription + value.name).toLowerCase()] = true;
                }
            });
            return resolve(bucket);
        });
    }
}