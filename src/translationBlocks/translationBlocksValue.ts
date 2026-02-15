import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";

import { IndexRange } from '../utils/positions';
import { 
    ThemeColorType, 
    DiagnosticType, 
    DefaultText, 
    WIKI_LINK,
    formatText
} from '../models/enums';
import { diagnostic } from '../providers/diagnostic';
import { TranslationBlock } from './translationBlocks';

export class TranslationKeyValue {
// MEMBERS
    // extra
    document: TextDocument;
    parent: TranslationBlock;
    diagnostics: Diagnostic[];

    // param data
    key: string;
    value: string;
    quote: string;
    comma: string;
    isDuplicate: boolean;
    
    // positions
    keyRange: IndexRange;
    valueRange: IndexRange;
    quoteRange: IndexRange;
    commaRange: IndexRange;

    constructor(
        document: TextDocument,
        parent: TranslationBlock,
        diagnostics: Diagnostic[],
        key: string, 
        value: string, 
        quote: string, 
        comma: string, 
        keyRange: IndexRange, 
        valueRange: IndexRange, 
        quoteRange: IndexRange, 
        commaRange: IndexRange,
        isDuplicate: boolean
    ) {
        this.document = document;
        this.parent = parent;
        this.diagnostics = diagnostics;

        this.key = key;
        this.value = value;
        this.quote = quote;
        this.comma = comma;

        this.keyRange = keyRange;
        this.valueRange = valueRange;
        this.quoteRange = quoteRange;
        this.commaRange = commaRange;

        this.isDuplicate = isDuplicate;

        // diagnostic(
        //     this.document, 
        //     this.diagnostics,
        //     DiagnosticType._DEBUG,
        //     { value: key },
        //     keyRange.start, keyRange.end
        // );

        this.validateParameter();
    }

    protected validateParameter(): boolean {

        // check for duplicate
        if (this.isDuplicate) {
            this.diagnosticDuplicate();
            return false;
        }

        // if has comma, it's optional
        if (this.comma) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.UNECESSARY_COMMA,
                {},
                this.commaRange.start, this.commaRange.end,
                vscode.DiagnosticSeverity.Hint
            );
        }

        // verify quotes
        if (!this.quote) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.MISSING_QUOTES,
                {},
                this.valueRange.start, this.valueRange.end
            );
            return false;
        }

        // verify it isn't in first line of the file
        // const firstLineRange = this.document.lineAt(0).range;
        const keyLine = this.document.positionAt(this.keyRange.start).line;
        if (keyLine === 0) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.IN_FIRST_LINE,
                {},
                this.keyRange.start, this.commaRange.end
            );
            return false;
        }

        return true;
    }




// DIAGNOSTICS HELPERS

    public setAsDuplicate(): void {
        if (!this.isDuplicate) {
            this.isDuplicate = true;
            this.diagnosticDuplicate();
        }
    }

    private diagnosticDuplicate(): void {
        diagnostic(
            this.document,
            this.diagnostics,
            DiagnosticType.DUPLICATE_PARAMETER,
            { parameter: this.key, scriptBlock: this.parent.filename },
            this.keyRange.start,
            this.commaRange.end,
            vscode.DiagnosticSeverity.Warning
        );
    }
}