import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { keyValueTranslation } from '../models/regexPatterns';
import { TranslationKeyValue } from './translationBlocksValue';
import { IndexRange, createIndexRange } from '../utils/positions';

export class TranslationBlock {
    private static documentBlockCache: Map<string, TranslationBlock> = new Map();
    
// MEMBERS
    // extra
    document: TextDocument;
    diagnostics: Diagnostic[];

    // block data
    folderCode: string;
    fileCode: string;
    prefix: string;
    keyValues: TranslationKeyValue[] = [];
    block: string;

    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        folderCode: string,
        fileCode: string,
        prefix: string
    ) {
        this.document = document;
        this.diagnostics = diagnostics;
        this.folderCode = folderCode;
        this.fileCode = fileCode;
        this.prefix = prefix;

        this.block = prefix + fileCode;

        TranslationBlock.documentBlockCache.set(document.uri.toString(), this);

        this.extractKeyValues();
    }

    private extractKeyValues(): void {
        const keyValues = this.keyValues;
        const text = this.document.getText();
        
        // read line by line, ignore first line as it is the file starter
        const lines = text.split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(keyValueTranslation);
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
}