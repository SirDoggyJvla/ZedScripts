import { TRANSLATION_FILE_PREFIXES } from "./translationBlocksData";

export function isTranslationBlock(filePrefix: string): boolean {
    return filePrefix in TRANSLATION_FILE_PREFIXES;
}

// export function getTranslationblockData()