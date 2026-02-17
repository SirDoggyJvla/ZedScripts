import * as vscode from "vscode";
import { TextDocument, DiagnosticSeverity, Diagnostic, Range } from "vscode";
import * as path from "path";

import { DocumentBlock } from "../scriptsBlocks/scriptsBlocks";
import { TranslationBlock } from "../translationBlocks/translationBlocks";
import { TRANSLATION_FILE_PREFIXES } from "../translationBlocks/translationBlocksData";

import { LANGUAGE_FILE_REGEX } from "../models/regexPatterns";
import { LANG_ZEDSCRIPTS, LANG_TRANSLATIONSCRIPTS, EXTENSION_ID, DiagnosticType } from "../models/enums";
import { isTranslationBlock } from "../translationBlocks/translationBlocksUtility";


export class DiagnosticProvider {
    // Static cache for DocumentBlock instances
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection(EXTENSION_ID);
    }
    
    public updateDiagnostics(document: vscode.TextDocument): void {
    console.debug(`Updating diagnostics for document: ${document.fileName}`);
        if (document.languageId === LANG_ZEDSCRIPTS) {
            this.updateDiagnosticsZedScripts(document);
        } else if (document.languageId === LANG_TRANSLATIONSCRIPTS) {
            this.updateDiagnosticsTranslationScripts(document);
        } else {
            // Clear diagnostics for unsupported languages
            this.diagnosticCollection.delete(document.uri);
        }
    }

    private updateDiagnosticsZedScripts(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        new DocumentBlock(document, diagnostics);

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private updateDiagnosticsTranslationScripts(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        const translationMatch = document.fileName.match(LANGUAGE_FILE_REGEX);
        if (translationMatch && translationMatch.groups) {
            const groups = translationMatch.groups;
            const folderCode = groups.folderCode;
            const fileCode = groups.fileCode;
            const filePrefix = groups.filePrefix;

            // verify file prefix is a valid one
            if (!isTranslationBlock(filePrefix)) {
                diagnostic(
                    document,
                    diagnostics,
                    DiagnosticType.INVALID_FILE_PREFIX,
                    { filePrefix: filePrefix, validPrefixes: Object.keys(TRANSLATION_FILE_PREFIXES).map(p => `'${p}'`).join(", ") },
                    0,
                    document.getText().length,
                    vscode.DiagnosticSeverity.Error
                );
            } else {
                const translationBlock = TRANSLATION_FILE_PREFIXES[filePrefix];

                new TranslationBlock(document, diagnostics, translationBlock, folderCode, fileCode, filePrefix);
            }
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
