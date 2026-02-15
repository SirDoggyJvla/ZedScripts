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
    keyValues: { [key: string]: TranslationKeyValue } = {};

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

        TranslationBlock.documentBlockCache.set(document.uri.toString(), this);

        this.keyValues = this.extractKeyValues();
    }

    private extractKeyValues(): { [key: string]: TranslationKeyValue } {
        const keyValues: { [key: string]: TranslationKeyValue } = {};
        const text = this.document.getText();
        
        // read line by line, ignore first line as it is the file starter
        const lines = text.split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const match = line.match(keyValueTranslation);
            if (!match || !match.groups) {
                continue;
            }

            const lineStart = text.indexOf(line);

            const fullMatch = match[0];
            const key = match.groups['key'];
            const value = match.groups['value'];
            const quote = match.groups['quote'];
            const comma = match.groups['comma'];

            const index = match.index!;

            const keyRange = createIndexRange(lineStart, index, fullMatch, key);
            const valueRange = createIndexRange(lineStart, index, fullMatch, value);
            const quoteRange = createIndexRange(lineStart, index, fullMatch, quote);
            const commaRange = createIndexRange(lineStart, index, fullMatch, comma);
            
            const keyVal = new TranslationKeyValue(
                key,
                value,
                quote,
                comma,
                keyRange,
                valueRange,
                quoteRange,
                commaRange
            );
            keyValues[key] = keyVal;
        }

        return keyValues;
    }
}