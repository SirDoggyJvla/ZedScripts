import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { ScriptBlock } from "./scriptBlocks";
import { ThemeColorType, DiagnosticType, DefaultText, formatDiagnostic } from '../models/enums';
import { getScriptBlockData } from './scriptData';

export class ScriptParameter {
// MEMBERS
    // extra
    document: TextDocument;
    diagnostics: Diagnostic[];
    
    // param data
    parent: ScriptBlock;
    name: string;
    value: string;
    comma: string;
    isDuplicate: boolean;

    // positions
    parameterStart: number;
    parameterEnd: number;
    valueStart: number;
    valueEnd: number;

// CONSTRUCTOR
    constructor(
        document: TextDocument,
        parent: ScriptBlock,
        diagnostics: Diagnostic[],
        name: string,
        value: string,
        parameterStart: number,
        parameterEnd: number,
        valueStart: number,
        valueEnd: number,
        comma: string,
        isDuplicate: boolean
    ) {
        this.document = document;
        this.parent = parent;
        this.diagnostics = diagnostics;
        this.name = name;
        this.value = value;
        this.parameterStart = parameterStart;
        this.parameterEnd = parameterEnd;
        this.valueStart = valueStart;
        this.valueEnd = valueEnd;
        this.comma = comma;
        this.isDuplicate = isDuplicate;
    
        this.validateParameter();

        // this.highlightPositions();
    }

    private highlightPositions(): void {
        const parameterRange = new vscode.Range(
            this.document.positionAt(this.parameterStart),
            this.document.positionAt(this.parameterEnd)
        );
        const valueRange = new vscode.Range(
            this.document.positionAt(this.valueStart),
            this.document.positionAt(this.valueEnd)
        );

        this.diagnostics.push(new vscode.Diagnostic(
            parameterRange,
            `Parameter: ${this.name}`,
            vscode.DiagnosticSeverity.Information
        ));

        this.diagnostics.push(new vscode.Diagnostic(
            valueRange,
            `Value: ${this.value}`,
            vscode.DiagnosticSeverity.Information
        ));
    }



// CHECKERS

    private validateParameter(): boolean {
        const blockData = getScriptBlockData(this.parent.scriptBlock);
        const parameters = blockData.parameters;
        const name = this.name;
        const lowerName = name.toLowerCase();

        // check if parameter exists in this block
        if (parameters) {
            const parameterData = parameters[lowerName];
            if (!parameterData) {
                this.diagnostic(
                    DiagnosticType.UNKNOWN_PARAMETER,
                    { parameter: name, scriptBlock: this.parent.scriptBlock },
                    this.parameterStart
                );
                return false;
            }
        }

        // check for duplicate
        if (this.isDuplicate) {
            this.diagnostic(
                DiagnosticType.DUPLICATE_PARAMETER,
                { parameter: name, scriptBlock: this.parent.scriptBlock },
                this.parameterStart,
                this.parameterEnd
            );
            return false;
        }

        // check if value is missing
        if (this.value === "") {
            this.diagnostic(
                DiagnosticType.MISSING_VALUE,
                { parameter: name },
                this.parameterStart,
                this.valueEnd
            );
            return false;
        }

        // check if missing comma at the end
        if (this.comma === "") {
            this.diagnostic(
                DiagnosticType.MISSING_COMMA,
                {},
                this.parameterStart,
                this.valueEnd
            );
            return false;
        } else if (this.comma !== ",") {
            this.diagnostic(
                DiagnosticType.INVALID_COMMA,
                {},
                this.parameterStart,
                this.valueEnd + this.comma.length
            );
            return false;
        }

        return true;
    }



// DIAGNOSTICS HELPERS

    public setAsDuplicate(): void {
        if (!this.isDuplicate) {
            this.isDuplicate = true;
            this.diagnostic(
                DiagnosticType.DUPLICATE_PARAMETER,
                { parameter: this.name, scriptBlock: this.parent.scriptBlock },
                this.parameterStart,
                this.parameterEnd
            );
        }
    }

    private diagnostic(
        type: DiagnosticType,
        params: Record<string, string>,
        index_start: number,index_end?: number,
        severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
    ): void {
        const positionStart = this.document.positionAt(index_start);
        const positionEnd = index_end ? this.document.positionAt(index_end) : positionStart;
        const message = formatDiagnostic(type, params);
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(positionStart, positionEnd),
            message,
            severity
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

}