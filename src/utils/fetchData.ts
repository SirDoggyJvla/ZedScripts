import * as vscode from 'vscode';
import { setScriptsTypes, ScriptData } from '../scriptsBlocks/scriptsBlocksData';
import { 
    setTranslationTypes, TranslationBlocks,
    setLanguageTypes, LanguageCodes, 
} from '../translationBlocks/translationBlocksData';
import { DocumentBlock } from '../scriptsBlocks/scriptsBlocks';
import { 
    SCRIPT_DATA_LINK, TRANSLATION_FILES_DATA_LINK, LANGUAGE_CODES_DATA_LINK,
    CACHE_DURATION_MS 
} from '../models/enums';

export async function fetchData(context: vscode.ExtensionContext, forceFetch: boolean = false): Promise<boolean> {
    console.log("Initializing script and translation blocks data...");
    
    // clear DocumentBlock cache to update diagnostics
    DocumentBlock.clearCache();
    await context.globalState.update('lastFetch', Date.now());

    // check if the user wants to use the local copy only
    const config = vscode.workspace.getConfiguration("ZedScripts");
    const onlyUseLocalData: boolean = config.get("onlyUseLocalData", false);
    if (onlyUseLocalData) {
        setScriptsTypes(require('../data/scriptBlocks.json'));
        setTranslationTypes(require('../data/translationFiles.json'));
        setLanguageTypes(require('../data/languageCodes.json'));
        return true;
    }

    // check cache first
    const cachedScriptsBlocks: ScriptData | undefined = context.globalState.get('scriptBlocks');
    const cachedTranslationBlocks: TranslationBlocks | undefined = context.globalState.get('translationBlocks');
    const cachedLanguageCodes: LanguageCodes | undefined = context.globalState.get('languageCodes');
    const lastFetch = context.globalState.get<number>('lastFetch', 0);
    if (!forceFetch && Date.now() - lastFetch < CACHE_DURATION_MS) {
        // set data to cache values if they exist
        if (cachedScriptsBlocks) {
            setScriptsTypes(cachedScriptsBlocks);
        }
        if (cachedTranslationBlocks) {
            setTranslationTypes(cachedTranslationBlocks);
        }
        if (cachedLanguageCodes) {
            setLanguageTypes(cachedLanguageCodes);
        }
        if (cachedScriptsBlocks && cachedTranslationBlocks && cachedLanguageCodes) {
            console.log("Using cached data.");
            return true;
        }
    }

    // fetch data
    try {
        const scriptsData = await fetchScriptBlocksData();
        await context.globalState.update('scriptBlocks', scriptsData);

        const translationData = await fetchTranslationBlocksData();
        await context.globalState.update('translationBlocks', translationData);

        const languageCodesData = await fetchLanguageCodesData();
        await context.globalState.update('languageCodes', languageCodesData);
        
        // save to cache
        await context.globalState.update('lastFetch', Date.now());
        
        console.log("Fetched data successfully");
        return true;
    } catch (error) {
        setScriptsTypes(cachedScriptsBlocks || require('../data/scriptBlocks.json'));
        setTranslationTypes(cachedTranslationBlocks || require('../data/translationFiles.json'));
        setLanguageTypes(cachedLanguageCodes || require('../data/languageCodes.json'));
        console.warn("Failed to fetch data, using cached or local data.");
        return false;
    }
}

async function fetchScriptBlocksData(): Promise<ScriptData> {
    const response = await fetch(SCRIPT_DATA_LINK);
    const data = await response.json();
    setScriptsTypes(data);
    return data;
}

async function fetchTranslationBlocksData(): Promise<TranslationBlocks> {
    const response = await fetch(TRANSLATION_FILES_DATA_LINK);
    const data = await response.json();
    setTranslationTypes(data);
    return data;
}

async function fetchLanguageCodesData(): Promise<LanguageCodes> {
    const response = await fetch(LANGUAGE_CODES_DATA_LINK);
    const data = await response.json();
    setLanguageTypes(data);
    return data;
}