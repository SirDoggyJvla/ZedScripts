import * as vscode from "vscode";
import { TextDocument, DiagnosticSeverity, Diagnostic, Range } from "vscode";

import { DocumentBlock } from "../scriptsBlocks/scriptsBlocks";
import { testForScriptRootFile, DEFAULT_ROOT_FILE } from "../scriptsBlocks/scriptsBlocksData";

import { LANG_ZEDSCRIPTS, EXTENSION_ID, DiagnosticType } from "../models/enums";


export function diagnosticNonLibrary(document: TextDocument, diagnosticProvider: DiagnosticProvider): void {
    const block = diagnosticProvider.updateDiagnostics(document);
    if (block instanceof DocumentBlock) {
        block.validateRecursiveLater();
    }
}


export class DiagnosticProvider {
    // Static cache for DocumentBlock instances
    public diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection(EXTENSION_ID);
    }
    
    public updateDiagnostics(document: vscode.TextDocument): DocumentBlock | void {
    // console.debug(`Updating diagnostics for document: ${document.fileName}`);
        if (document.languageId === LANG_ZEDSCRIPTS) {
            return this.updateDiagnosticsZedScripts(document);
        } else {
            // Clear diagnostics for unsupported languages
            this.diagnosticCollection.delete(document.uri);
        }
        return;
    }

    private updateDiagnosticsZedScripts(document: vscode.TextDocument): DocumentBlock {
        const diagnostics: vscode.Diagnostic[] = [];

        const path = document.fileName;
        const type = testForScriptRootFile(path) || DEFAULT_ROOT_FILE;

        const block = new DocumentBlock(document, diagnostics, type);
        this.diagnosticCollection.set(document.uri, diagnostics);
        return block;
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}






// Diagnostic helpers
export function formatText(message: string, params: Record<string, string>): string {
    return message.replace(/{(\w+)}/g, (_, key) => params[key] ?? "");
}

export function diagnostic(
    document: TextDocument,
    diagnostics: Diagnostic[],
    type: DiagnosticType | string,
    params: Record<string, string>,
    index_start: number, index_end: number = index_start,
    severity: DiagnosticSeverity = DiagnosticSeverity.Error
): vscode.Diagnostic | false {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);

    // Skip all diagnostics if the master switch is on
    if (config.get("disableAllDiagnostics")) {
        return false;
    }

    // Check if this diagnostic type is disabled in configuration
    const disabledDiagnostics: string[] = config.get("disabledDiagnostics") || [];
    
    // Find the key name for this diagnostic type value
    const diagnosticKey = Object.entries(DiagnosticType).find(([_, value]) => value === type)?.[0];
    if (diagnosticKey && disabledDiagnostics.includes(diagnosticKey)) {
        return false; // Skip adding this diagnostic
    }

    const positionStart = document.positionAt(index_start);
    const positionEnd = document.positionAt(index_end);
    const message = formatText(type, params);
    const diagnostic = new Diagnostic(
        new Range(positionStart, positionEnd),
        message,
        severity
    );
    diagnostics.push(diagnostic);
    // console.warn(message);
    return diagnostic;
}
