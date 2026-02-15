import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { KEY_VALUE_TRANSLATION_REGEX } from '../models/regexPatterns';
import { TranslationKeyValue } from './translationBlocksValue';
import { TRANSLATION_FILE_PREFIXES } from './translationBlocksData';
import { IndexRange, createIndexRange } from '../utils/positions';
import { diagnostic, DiagnosticType } from '../models/enums';

export class TranslationBlock {
    private static documentBlockCache: Map<string, TranslationBlock> = new Map();
    
// MEMBERS
    // extra
    document: TextDocument;
    diagnostics: Diagnostic[];

    // block data
    translationBlock: string;
    folderCode: string;
    fileCode: string;
    filePrefix: string;
    keyValues: TranslationKeyValue[] = [];
    filename: string;

    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        translationBlock: string,
        folderCode: string,
        fileCode: string,
        filePrefix: string
    ) {
        this.document = document;
        this.diagnostics = diagnostics;
        this.translationBlock = translationBlock;
        this.folderCode = folderCode;
        this.fileCode = fileCode;
        this.filePrefix = filePrefix;

        // recreate filename
        this.filename = filePrefix + fileCode;

        TranslationBlock.documentBlockCache.set(document.uri.toString(), this);

        const test = this.validateTranslationFile();
        if (test) {
            this.extractKeyValues();
        }
    }

    private validateTranslationFile(): boolean {
        if (this.folderCode != this.fileCode) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.UNMATCHED_CODE,
                { folderCode: this.folderCode, fileCode: this.fileCode },
                0,
                this.document.getText().length
            );
            return false;
        }

        return true;
    }

    private extractKeyValues(): void {
        const keyValues = this.keyValues;
        const text = this.document.getText();
        
        // read line by line, ignore first line as it is the file starter
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(KEY_VALUE_TRANSLATION_REGEX);
            if (!match || !match.groups) {
                continue;
            }

            const lineStart = this.document.offsetAt(new vscode.Position(i, 0));

            const fullMatch = match[0];
            const key = match.groups['key'];
            const value = match.groups['value'] || '';
            const quote = match.groups['quote'] || '';
            const comma = match.groups['comma'] || '';

            const index = match.index!;

            // find ranges
            const keyRange = createIndexRange(lineStart, index, fullMatch, key);
            const valueRange = createIndexRange(lineStart, index, fullMatch, value);
            const quoteRange = createIndexRange(lineStart, index, fullMatch, quote);
            const commaRange = createIndexRange(lineStart, index, fullMatch, comma);

            if (key == "IGUI_ContainerTitle_trough") {
                console.log("debug");
            }

            // check duplicate
            const existingParam = this.getParameter(key);
            const isDuplicate = existingParam !== undefined;
            if (existingParam) {
                existingParam.setAsDuplicate();
            }
            
            const keyVal = new TranslationKeyValue(
                this.document,
                this,
                this.diagnostics,
                key,
                value,
                quote,
                comma,
                keyRange,
                valueRange,
                quoteRange,
                commaRange,
                isDuplicate
            );
            keyValues.push(keyVal);
        }
    }

    public getParameter(key: string): TranslationKeyValue | undefined {
        return this.keyValues.find(kv => kv.key === key);
    }

    public isParameterOf(key: string): boolean {
        return this.keyValues.some(kv => kv.key === key);
    }

    protected getKeyPrefix(): string | undefined {   
        
        return;
    }
}