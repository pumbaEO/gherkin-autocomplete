// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { BSL_MODE } from "./const";
import {Global} from "./global";
import CompletionItemProvider from "./features/completionItemProvider";
// import DefinitionProvider from "./features/definitionProvider";
// import LintProvider from "./features/lintProvider";
// import DocumentSymbolProvider from "./features/documentSymbolProvider";
// import ReferenceProvider from "./features/referenceProvider";

let diagnosticCollection: vscode.DiagnosticCollection;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const global = new Global("global");
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(["feature", "feature"], new CompletionItemProvider(global), "."));

    context.subscriptions.push(vscode.commands.registerCommand("specflow-bsl.update", () => {
        let filename = vscode.window.activeTextEditor.document.fileName;
        global.updateCache(filename);
    }));
    console.log("feature bsl loaded");

}
