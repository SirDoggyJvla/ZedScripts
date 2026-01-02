import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { ScriptBlock } from "./scriptBlocks";
import { ThemeColorType, DiagnosticType, DefaultText, formatDiagnostic } from '../models/enums';
import { getScriptBlockData, ScriptBlockParameter } from './scriptData';
import { getColor } from "../utils/themeColors";
import { colorText } from '../utils/htmlFormat';

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

    private getLineEnd(): number {
        const line = this.document.positionAt(this.valueEnd).line;
        const lineEndPosition = this.document.lineAt(line).range.end;
        return this.document.offsetAt(lineEndPosition);
    }

// INFORMATION

    private color(txt: string): string {
        const color = getColor(ThemeColorType.PARAMETER);
        return colorText(txt, color);
    }

    private getTree(): string {
        const parameter = "**" + this.color(this.name) + "**";
        const parents = this.parent.getTree(true);
        return parents + " → " + parameter;
    }

    public getHoverText(): MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true; // needed for html rendering

        // retrieve tree and description
        const tree = this.getTree();
        const desc = this.getDescription();

        // assemble the hover content
        markdown.appendMarkdown(`${tree}  \n`);
        markdown.appendMarkdown('\n\n---\n\n');
        markdown.appendMarkdown(desc);
        
        return markdown;
    }


// DATA

    public getParameterData(): ScriptBlockParameter | null {
        const blockData = getScriptBlockData(this.parent.scriptBlock);
        const parameters = blockData.parameters;
        const name = this.name;
        const lowerName = name.toLowerCase();

        if (parameters) {
            const parameterData = parameters[lowerName];
            if (parameterData) {
                return parameterData;
            }
        }
        
        return null;
    }

    public getDescription(): string {
        const parameterData = this.getParameterData();
        return parameterData?.description || DefaultText.SCRIPT_BLOCK_DESCRIPTION;
    }

    public canBeDuplicate(): boolean {
        const parameterData = this.getParameterData();
        if (parameterData) {
            return parameterData.allowedDuplicate === true;
        }
        return false;
    }

    public canBeEmpty(): boolean {
        const parameterData = this.getParameterData();
        if (parameterData) {
            return parameterData.canBeEmpty === true;
        }
        return false;
    }


// CHECKERS

    protected validateParameter(): boolean {
        const name = this.name;

        // check if parameter exists in this block
        if (!this.parent.canHaveParameter(name)) {
            this.diagnostic(
                DiagnosticType.UNKNOWN_PARAMETER,
                { parameter: name, scriptBlock: this.parent.scriptBlock },
                this.parameterStart,
                this.parameterEnd,
                vscode.DiagnosticSeverity.Hint
            );
            // return false;
        }

        // check for duplicate
        if (this.isDuplicate && !this.canBeDuplicate()) {
            this.diagnosticDuplicate();
            return false;
        }

        // check if value is missing
        if (this.value === "" && !this.canBeEmpty()) {
            const lineEnd = this.getLineEnd();
            this.diagnostic(
                DiagnosticType.MISSING_VALUE,
                { parameter: name },
                this.valueStart,
                lineEnd,
                vscode.DiagnosticSeverity.Hint
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
        if (!this.isDuplicate && !this.canBeDuplicate()) {
            this.isDuplicate = true;
            this.diagnosticDuplicate();
        }
    }

    private diagnosticDuplicate(): void {
        this.diagnostic(
            DiagnosticType.DUPLICATE_PARAMETER,
            { parameter: this.name, scriptBlock: this.parent.scriptBlock },
            this.parameterStart,
            this.parameterEnd,
            vscode.DiagnosticSeverity.Warning
        );
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