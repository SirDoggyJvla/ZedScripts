import { TRANSLATION_FILE_PREFIXES, TRANSLATION_TYPES, TranslationBlocksData } from "./translationBlocksData";

export function isTranslationBlock(filePrefix: string): boolean {
    return filePrefix in TRANSLATION_FILE_PREFIXES;
}

export function getTranslationblockData(key: string): TranslationBlocksData {
    const blockData = TRANSLATION_TYPES[key];
    if (!blockData) {
        throw new Error(`Translation block data not found for key: ${key}`);
    }
    return blockData;
}