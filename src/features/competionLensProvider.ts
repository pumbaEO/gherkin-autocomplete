import * as vscode from "vscode";
import { IMethodValue } from "../IMethodValue";
import AbstractProvider from "./abstractProvider";

const Gherkin = require("gherkin");
const parser = new Gherkin.Parser();

// const Token = require("./../../node_modules/gherkin/lib/gherkin/token");
// const GherkinLine = require("./../../node_modules/gherkin/lib/gherkin/gherkin_line");

const Token = require("./../../../node_modules/gherkin/lib/gherkin/token");
const GherkinLine = require("./../../../node_modules/gherkin/lib/gherkin/gherkin_line");

// const Token = require("./../../../node_modules/gherkin/lib/gherkin/token");
// const GherkinLine = require("./../../../node_modules/gherkin/lib/gherkin/gherkin_line");

class ReferencesCodeLens extends vscode.CodeLens {
    constructor(
        public document: vscode.TextDocument,
        public range: vscode.Range
    ) {
        super(range);
    }
}

// tslint:disable-next-line:max-classes-per-file
export default class GlobalCompletionCodeLensProvider extends AbstractProvider implements vscode.CodeLensProvider {

    public provideCodeLenses(
        document: vscode.TextDocument): Thenable<vscode.CodeLens[]> {
        return new Promise((resolve) => {
            // const matches: <IToggleCommand[]>;
            const result: vscode.CodeLens[] = [];
            const matches = this.findGherkinStrings(document);
            matches.forEach((match) => {
                result.push(
                    new ReferencesCodeLens(match.document, match.range)
                    /*new vscode.CodeLens(
                    match.range,
                    {
                        arguments: [document.uri, match.range.start],
                        command: "editor.action.showReferences",
                        title: "Export scenario"
                    }*/
                );
            });
            resolve(result);

        });

    }

    public resolveCodeLens?(
        inputCodeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {

        const codeLens = inputCodeLens as ReferencesCodeLens;
        if (token.isCancellationRequested) {
            return Promise.resolve(inputCodeLens);
        }

        // vscode.commands.executeCommand<vscode.Location[]>(
        //     "vscode.executeReferenceProvider",
        //     codeLens.document.uri,
        //     codeLens.range.start
        // );
        codeLens.command = {
            arguments: [codeLens.document.uri, codeLens.range.start],
            command: "vscode.executeReferenceProvider",
            title: "Export scenario"
        };
        return codeLens;

        /*const referenceProvider = new ReferenceProvider(this._global);
        referenceProvider.provideReferences(codeLens.document, codeLens.range.start)
            .then( references => {
            codeLens.command = {
                arguments: [codeLens.document.uri, codeLens.range.start],
                command: "vscode.executeReferenceProvider",
                title: "Export scenario"
                };
            return codeLens;
            }, err => {
            console.log(err);
            codeLens.command = {
                title: "Error finding references",
                command: ""
            };
            return codeLens;
        });*/
    }
    private findGherkinStrings(textdocument: vscode.TextDocument): IToggleCommand[] {
        const results = new Array();
        const filename = textdocument.uri.fsPath;
        // const languageInfo = this._global.getLanguageInfo(filename);
        // if (languageInfo == null) {
        //     return results;
        // }

        let gherkinDocument;
        try {
            gherkinDocument = parser.parse(textdocument.getText());
        } catch (error) {
            console.log("error parse file " + filename + ":" + error);
            return results;
            // return methods;
        }
        const TokenMatcher = new Gherkin.TokenMatcher(gherkinDocument.feature.language);

        // const line = new GherkinLine(textLine.text, position.line);
        // const token = new Token(line, position.line);
        // const matches: boolean = TokenMatcher.match_StepLine(token);

        for (let i = 0; i < textdocument.lineCount; i++) {
                const line: vscode.TextLine = textdocument.lineAt(i);
                // const TokenMatcher = new Gherkin.TokenMatcher('ru');

                const gherkinLine = new GherkinLine(line.text, line.text.length);
                const token = new Token(gherkinLine, line.text.length);
                const matches: boolean = TokenMatcher.match_StepLine(token);
                if (!matches) {
                    continue;
                }
                const word: string = token.matchedText;
                const snippet = this._global.toSnippet(word);
                const exportSnippets: IMethodValue[] = this._global.queryExportSnippet(snippet, false, true);
                if (exportSnippets.length > 0) {
                    results.push(
                        {
                            document: textdocument,
                            range: line.range
                        }
                    );
                }
        }
        return results;
    }
}

/*
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken);: <vscode.CodeLens[]> {
        //return new Promise((resolve, reject) => {
            const matches = this.findGherkinStrings(document);
            let result: <vscode.CodeLens[]>
            matches.forEach(element => {
            });
            const result <vscode.CodeLens[]> = matches.map(match => new vscode.CodeLens(match.range,
                {
                    title: 'Library...',
                    command: 'extension.toggleRegexPreview',
                    arguments: [match]
                }));
            return result;
        //});
    };
*/

/*
    private findGherkinStrings(document: vscode.TextDocument): {
        let result = new Array;
        const filename = document.uri.fsPath;
        for (let i = 0; i < document.lineCount; i++) {
                const line: vscode.TextLine = document.lineAt(i);
                const TokenMatcher = new Gherkin.TokenMatcher('en');

                const gherkinLine = new GherkinLine(line.text, line.text.length);
                const token = new Token(gherkinLine, line.text.length);
                const matches: boolean = TokenMatcher.match_StepLine(token);
                if (!matches) {
                    continue;
                }
                result.push(
                    {
                        document: document,
                        range: line.range
                    }
                );
        }
        return result;
    }
}*/

interface IToggleCommand {
    document: vscode.TextDocument;
    range: vscode.Range;
}
