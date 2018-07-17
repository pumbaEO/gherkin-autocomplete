import * as vscode from "vscode";

export interface IMethodValue {

    name: string;

    snippet: string;

    // начало
    line: number;
    // конец процедуры
    endline: number;

    filename: string;

    description?: string;

    kind?: vscode.CompletionItemKind;

    isexport: boolean;
}

export interface IBslMethodValue {
    // Имя процедуры/функции'
    name: string;
    // Процедура = true, Функция = false
    isproc: boolean;
    isExport: boolean;
    // начало
    line: number;
    // конец процедуры
    endline: number;

    filename: string;
    // контекст НаСервере, НаКлиенте, НаСервереБезКонтекста
    context?: string;
    module?: string;
    description?: string;
    call?: string;
    character?: number;
    _method?: {};
    oscriptLib?: boolean;
    oscriptClass?: boolean;
}

export interface ILanguageInfo {
    language: string;
    name: string;
}
