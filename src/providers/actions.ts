import * as vscode from 'vscode';

export function registerActionTextReplace(
    document: vscode.TextDocument,
    replaceRange: vscode.Range,
    newText: string,
    reason: string = "Replace with " + newText
) {
    const fix = new vscode.CodeAction(reason, vscode.CodeActionKind.QuickFix);
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, replaceRange, newText);
    return fix;
}