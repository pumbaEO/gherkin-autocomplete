import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
// tslint:disable-next-line:ordered-imports
import { IMethodValue, ILanguageInfo, IBslMethodValue } from "../IMethodValue";

const Gherkin = require("gherkin");
const parser = new Gherkin.Parser();
const Token = require("./../../../node_modules/gherkin/lib/gherkin/token");
const GherkinLine = require("./../../../node_modules/gherkin/lib/gherkin/gherkin_line");

export default class GlobalReferenceProvider extends AbstractProvider implements vscode.ReferenceProvider {
    public provideReferences(document: vscode.TextDocument,
                             position: vscode.Position): Thenable<vscode.Location[]> {
        return this.doFindReferences(document, position);
    }

    private addReference(searchResult: any, results: vscode.Location[]) {
        if (searchResult) {
            for (const element of searchResult) {
                const result = {
                    path: element.filename,
                    // tslint:disable-next-line:object-literal-sort-keys
                    line: element.line,
                    description: element.name,
                    label: element.filename
                };
                let colStr = element.character;
                if (!colStr) {
                    colStr = 0;
                }
                const referenceResource = vscode.Uri.file(result.path);
                const range = new vscode.Range(
                    result.line, +colStr, result.line, +colStr // + element.call.length
                );
                results.push(new vscode.Location(referenceResource, range));

            }
        }
    }

    private doFindReferences(document: vscode.TextDocument,
                             position: vscode.Position): Thenable<vscode.Location[]> {
        return new Promise((resolve) => {
            const filename = document.fileName;
            const workspaceRoot = vscode.workspace.rootPath;

            const results: vscode.Location[] = Array<vscode.Location>();

            const textLine: vscode.TextLine = document.lineAt(position.line);

            let languageInfo = this._global.getLanguageInfo(document.uri);
            if (languageInfo == null) {
                let gherkinDocument;
                try {
                    gherkinDocument = parser.parse(document.getText());
                    languageInfo = {
                        language: gherkinDocument.feature.language,
                        name: document.uri.fsPath
                    };
                } catch (error) {
                    console.error("FindReferences error parse file " + filename + ":" + error);
                    resolve(results);
                    return;
                }
            }
            const TokenMatcher = new Gherkin.TokenMatcher(languageInfo.language);

            const line = new GherkinLine(textLine.text, position.line);
            const token = new Token(line, position.line);
            const matches: boolean = TokenMatcher.match_StepLine(token);

            if (!matches) {
                console.log("not mathed tocken for " + textLine.text);
                return resolve(results);
            }

            const word: string = token.matchedText;
            console.log("referense for:" + word);

            const snippet = this._global.toSnippet(word);

            const snippetsRefs: IBslMethodValue[] = this._global.queryref(snippet, true);
            this.addReference(snippetsRefs, results);
            if (results.length > 0) {
                resolve(results);
            }

            const exportSnippets: IMethodValue[] = this._global.queryExportSnippet(document.uri, snippet, false, true);
            this.addReference(exportSnippets, results);
            return resolve(results);
        });
    }
}
