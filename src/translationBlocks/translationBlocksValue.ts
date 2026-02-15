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
            { parameter: this.key, scriptBlock: this.parent.block },
            this.keyRange.start,
            this.commaRange.end,
            vscode.DiagnosticSeverity.Warning
        );
    }
}