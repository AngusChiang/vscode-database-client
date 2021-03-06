import { Constants, ModelType } from "@/common/constants";
import { FileManager } from "@/common/filesManager";
import { DbTreeDataProvider } from "@/provider/treeDataProvider";
import { renameSync } from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import { Node } from "../interface/node";

export class QueryNode extends Node {
    public contextValue = ModelType.QUERY;
    public iconPath = path.join(Constants.RES_PATH, "icon/select.svg")
    constructor(public name: string, readonly parent: Node) {
        super(name)
        this.init(parent)
        this.collapsibleState = TreeItemCollapsibleState.None
        this.command = {
            command: "mysql.query.open",
            title: "Open Query",
            arguments: [this, true],
        }
    }

    public async open() {
        await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(this.getFilePath())
        );
    }

    public async rename() {
        vscode.window.showInputBox({ placeHolder: "Input new name" }).then(newName => {
            if (newName) {
                renameSync(this.getFilePath(), this.getFilePath(newName))
                DbTreeDataProvider.refresh(this.parent)
            }
        })
    }

    private getFilePath(newName?: string): string {
        return `${FileManager.storagePath}/query/${this.getConnectId({ withDbForce: true })}/${newName || this.name}.sql`;
    }


}