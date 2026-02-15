import * as vscode from "vscode";
import { TextDocument, DiagnosticSeverity, Diagnostic, Range } from "vscode";
import * as path from "path";

import { DocumentBlock } from "../scriptsBlocks/scriptsBlocks";
import { TranslationBlock } from "../translationBlocks/translationBlocks";
import { translationPattern } from "../translationBlocks/translationBlocksData";

import { EXTENSION_LANGUAGE, DiagnosticType } from "../models/enums";


export class DiagnosticProvider {
    // Static cache for DocumentBlock instances
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection(EXTENSION_LANGUAGE);
    }
    
    public updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        const filePath = path.posix.normalize(document.fileName);

        // Check if the file is a translation block
        console.log(translationPattern);
        const translationMatch = filePath.match(translationPattern);
        if (translationMatch && translationMatch.groups) {
            const groups = translationMatch.groups;
            const folderCode = groups.folderCode;
            const fileCode = groups.fileCode;
            const prefix = groups.prefix;
            // const extension = groups.extension;

            new TranslationBlock(document, diagnostics, folderCode, fileCode, prefix);
        } else {
            new DocumentBlock(document, diagnostics);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
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
    type: DiagnosticType,
    params: Record<string, string>,
    index_start: number, index_end: number = index_start,
    severity: DiagnosticSeverity = DiagnosticSeverity.Error
): void {
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
}
