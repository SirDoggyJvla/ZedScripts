import * as vscode from "vscode";
import { DocumentBlock } from "../scripts/scriptBlocks";

export class DiagnosticProvider {
    // Static cache for DocumentBlock instances
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection("pz-scripts");
    }
    
    public updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        new DocumentBlock(document, diagnostics);
        this.diagnosticCollection.set(document.uri, diagnostics);
        return;
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}



