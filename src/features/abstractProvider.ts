import {Disposable} from "vscode";
import {Global} from "../global";

export default class AbstractProvider {

    protected _global: Global;
    protected _disposables: Disposable[];

    constructor(global: Global) {
        this._global = global;
        this._disposables = [];
    }

    public dispose() {
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
