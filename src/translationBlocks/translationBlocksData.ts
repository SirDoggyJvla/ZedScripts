import * as vscode from 'vscode';

export interface TranslationBlocks {
    [key: string]: TranslationBlocksData;
}
export interface LanguageCodes {
    [key: string]: LanguageCodesData;
}

export let TRANSLATION_TYPES: TranslationBlocks = require('../data/translationFiles.json');
export let LANGUAGE_CODES: LanguageCodes = require('../data/languageCodes.json');

export interface TranslationBlocksData {
    name: string;
    description: string;
    filePrefix: string;
    fileStarter: string;
}

export interface LanguageCodesData {
    name: string;
    languageName: string;
    encoding: string;
}



export let TRANSLATION_FILE_PREFIXES: { [key: string]: string } = {};
function loadTranslationPrefixes() {
    TRANSLATION_FILE_PREFIXES = {};
    for (const key in TRANSLATION_TYPES) {
        const blockData = TRANSLATION_TYPES[key];
        TRANSLATION_FILE_PREFIXES[blockData.filePrefix] = key;
    }
    return;
}

export let TRANSLATION_PATTERN: RegExp;
export function initTranslationBlockRegex() {
    loadTranslationPrefixes();
    const prefixes = Object.keys(TRANSLATION_FILE_PREFIXES);
    TRANSLATION_PATTERN = new RegExp(
        `\/Translate\/(?<folderCode>\\w+)\/(?<prefix>${prefixes.join('|')})(?<fileCode>\\w+)(?<extension>.txt)`
    )
}

export function setTranslationTypes(newTypes: TranslationBlocks) {
    TRANSLATION_TYPES = newTypes;
    initTranslationBlockRegex();
}

export function setLanguageTypes(newTypes: LanguageCodes) {
    LANGUAGE_CODES = newTypes;
}