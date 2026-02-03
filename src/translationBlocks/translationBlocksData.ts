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



export let TRANSLATION_PREFIXES: { [key: string]: string } = {};
function loadTranslationPrefixes() {
    TRANSLATION_PREFIXES = {};
    for (const key in TRANSLATION_TYPES) {
        const blockData = TRANSLATION_TYPES[key];
        TRANSLATION_PREFIXES[blockData.filePrefix] = key;
    }
}

export let translationPattern: RegExp;
export function initTranslationBlockRegex() {
    loadTranslationPrefixes();
    const prefixes = Object.keys(TRANSLATION_PREFIXES);
    translationPattern = new RegExp(
        `\/Translate\/(?<languageCode>\w+)\/(?<prefix>${prefixes.join('|')})(?<code>\w+)(?<extension>.txt)`
    )
}

export function setTranslationTypes(newTypes: TranslationBlocks) {
    TRANSLATION_TYPES = newTypes;
    initTranslationBlockRegex();
}


export function setLanguageTypes(newTypes: LanguageCodes) {
    LANGUAGE_CODES = newTypes;
}