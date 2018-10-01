// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import CompletionCodeLensProvider from "./features/competionLensProvider";
import CompletionItemProvider from "./features/completionItemProvider";
import ReferenceProvider from "./features/referenceProvider";

import { Global } from "./global";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const global = new Global("global");
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(["feature", "gherkin"], new CompletionItemProvider(global), ".")
        // vscode.languages.registerDefinitionProvider
    );
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(["feature", "gherkin"], new ReferenceProvider(global))
    );

    context.subscriptions.push(vscode.commands.registerCommand("gherkin-autocomplete.update", () => {
        updateCacheForAll(global);
        //vscode.commands.executeCommand("vscode.executeReferenceProvider", )
    }));

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(["feature", "gherkin"], new CompletionCodeLensProvider(global))
    );

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(
        (document: vscode.TextDocument) => {
            global.updateCacheOfTextDocument(document.uri);
    }));

    updateCacheForAll(global);
    
}

function updateCacheForAll(global) {

    if (vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0) {
        vscode.workspace.workspaceFolders.forEach(element => {
            global.updateCache(element.uri.fsPath);
        });
    }
}
