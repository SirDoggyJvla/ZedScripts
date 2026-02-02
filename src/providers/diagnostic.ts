import * as vscode from "vscode";
import * as path from "path";
import { DocumentBlock } from "../scriptsBlocks/scriptsBlocks";
import { EXTENSION_LANGUAGE } from "../models/enums";

export class DiagnosticProvider {
    // Static cache for DocumentBlock instances
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection(EXTENSION_LANGUAGE);
    }
    
    public updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        const filePath = path.posix.normalize(document.fileName);

        new DocumentBlock(document, diagnostics);
        this.diagnosticCollection.set(document.uri, diagnostics);
        return;
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}



