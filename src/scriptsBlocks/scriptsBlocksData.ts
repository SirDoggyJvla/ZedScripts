import * as vscode from 'vscode';
import { TextDocument, ExtensionContext } from 'vscode';
import { DocumentBlock } from './scriptsBlocks';

export interface ScriptData {
    [key: string]: ScriptBlockData;
}

export let SCRIPTS_TYPES: ScriptData = require('../data/scriptBlocks.json');
import { CACHE_DURATION_MS, SCRIPT_DATA_LINK } from '../models/enums';



export interface ScriptBlockData {
    version: number;
    name: string;
    description: string;
    shouldHaveParent: boolean;
    needsChildren?: string[];
    parents: string[];
    ID?: ScriptBlockID;
    parameters: { [key: string]: ScriptBlockParameter };
    properties?: { [key: string]: InputParameterData };
}

export interface IndexRange {
    start: number;
    end: number;
}

export interface ScriptBlockParameter {
    name: string;
    description?: string;
    itemTypes?: string[];
    allowedDuplicate?: boolean;
    canBeEmpty?: boolean;
    default?: (string | number | boolean)[];
    type?: "string" | "int" | "float" | "boolean" | "array";
    required?: boolean;
    deprecated?: boolean;
    values?: (string | number | boolean)[];
}

export interface ScriptBlockID {
    parentsWithout?: string[];
    values?: string[];
    asType?: boolean;
}

export interface InputAnalysisProperty {
    source: string,
    value: any,
    range: IndexRange,
    regex: RegExp,
    type: 'array' | 'boolean' | 'string',
}

export interface InputProperty {
    name: string;
    description?: string;
    type: 'array' | 'boolean' | 'string';
    values?: string[];
}

export interface InputParameterData {
    oneOf?: string[];
    properties: { [key: string]: InputProperty };
}



// utility functions to set the current source of data
export async function initScriptBlocks(context: ExtensionContext, forceFetch: boolean = false): Promise<boolean> {
    // check cache first
    const cached: ScriptData | undefined = context.globalState.get('scriptBlocks');
    const lastFetch = context.globalState.get<number>('lastFetch', 0);
    
    // clear DocumentBlock cache to update diagnostics
    DocumentBlock.clearCache();

    // check if the user wants to use the local copy only
    const config = vscode.workspace.getConfiguration("ZedScripts");
    const onlyUseLocalData: boolean = config.get("onlyUseLocalData", false);
    if (onlyUseLocalData) {
        SCRIPTS_TYPES = require('../data/scriptBlocks.json');
        initBlockRegex();
        console.log("Using local script block data as per configuration.");
        return true;
    }

    // if cached and less than the config time, use it
    if (cached && (onlyUseLocalData || (!forceFetch && Date.now() - lastFetch < CACHE_DURATION_MS))) {
        SCRIPTS_TYPES = cached;
        initBlockRegex();
        console.log("Using cached script block data.");
        return true;
    }
    
    // try to fetch fresh data
    try {
        const response = await fetch(SCRIPT_DATA_LINK);
        const data = await response.json();
        SCRIPTS_TYPES = data;
        initBlockRegex();
        
        // save to cache
        await context.globalState.update('scriptBlocks', data);
        await context.globalState.update('lastFetch', Date.now());
        console.log("Fetched and cached new script block data.");
        return true;
    } catch (error) {
        // if fetch fails, return cached (even if old) or fallback
        SCRIPTS_TYPES = cached || require('../data/scriptBlocks.json');
        initBlockRegex();
        console.warn("Failed to fetch new script block data, using cached or default extension data. Information might be outdated.");
        return false;
    }
}

// generates a regex pattern to match any script block line
export let BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
export let SCRIPTS_TYPES_LOWER = Object.fromEntries(
    Object.entries(SCRIPTS_TYPES).map(([key, value]) => [key.toLowerCase(), value])
);
export let blockPattern: RegExp;
function initBlockRegex() {
    BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
    SCRIPTS_TYPES_LOWER = Object.fromEntries(
        Object.entries(SCRIPTS_TYPES).map(([key, value]) => [key.toLowerCase(), value])
    );
    blockPattern = new RegExp(
        `^\\s*(${BLOCK_NAMES.join('|')})\\s+.*\\{.*$`
    );
}

