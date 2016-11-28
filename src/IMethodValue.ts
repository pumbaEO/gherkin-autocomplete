import * as vscode from "vscode";

export interface IMethodValue {

    name: string;

    // начало
    line: number;
    // конец процедуры
    endline: number;

    filename: string;

    description?: string;

    kind?: vscode.CompletionItemKind;
}
