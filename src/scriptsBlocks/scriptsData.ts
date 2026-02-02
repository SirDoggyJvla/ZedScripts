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
let blockPattern: RegExp;
function initBlockRegex() {
    BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
    blockPattern = new RegExp(
        `^\\s*(${BLOCK_NAMES.join('|')})\\s+.*\\{.*$`
    );
}



// detects if a line is starting a script block and returns the block type
function isScriptBlockLine(line: string): string | null {
    const match = line.match(blockPattern);
    return match ? match[1] : null;
}

export function isScriptBlock(word: string): boolean {
    return word in SCRIPTS_TYPES;
}

// check if the position of the doc is within a script block
export function getBlockType(document: TextDocument, lineNumber: number): string | null {
    let currentLine = lineNumber;
    
    while (currentLine >= 0) {
        let line = document.lineAt(currentLine).text.trim();
        const nextLine = currentLine + 1 < document.lineCount ? document.lineAt(currentLine + 1).text.trim() : '';
        
        line = line + " " + nextLine;
        
        const blockName = isScriptBlockLine(line);
        if (blockName) {
            // check the line has { or the next line has {
            if (line.endsWith('{')) {        
                return blockName;
            } else {
                const nextLineNum = currentLine + 1;
                if (nextLineNum < document.lineCount) {
                    const nextLine = document.lineAt(nextLineNum).text.trim();
                    if (nextLine.startsWith('{')) {            
                        return blockName;
                    }
                }
            }
            
            return blockName;
        }
        currentLine--;
    }
    return null;
}


/**
* Retrieve the script block data for a given block type
* @param blockType The script block type
* @returns ScriptBlockData | null
*/
export function getScriptBlockData(blockType: string): ScriptBlockData {
    if (!isScriptBlock(blockType)) {
        throw new Error(`Block type ${blockType} is not a valid script block type. Ensure to check with isScriptBlock() before getting block data.`);
    }
    const blockData = SCRIPTS_TYPES[blockType as keyof typeof SCRIPTS_TYPES] as ScriptBlockData;
    return blockData;
}

export function canHaveParent(blockType: string, parentType: string): boolean {
    const blockData = getScriptBlockData(blockType);
    // if (!blockData.shouldHaveParent && blockType === DOCUMENT_IDENTIFIER) {
    //     return true;
    // }
    return blockData.parents.includes(parentType);
}

export function shouldHaveID(blockType: string, parentType: string): boolean {
    const blockData = getScriptBlockData(blockType);
    const IDData = blockData.ID;
    if (!IDData) { return false; }

    return shouldChildrenHaveID(blockType, parentType);
}

export function shouldChildrenHaveID(blockType: string, parentType: string): boolean {
    const childrenBlockData = getScriptBlockData(blockType);
    const IDData = childrenBlockData.ID;
    if (!IDData) { return false; }

    // used to check if the parent block requires an ID for this subblock
    const invalidBlocks = IDData.parentsWithout;
    let shouldHaveIDfromParent = true;
    if (invalidBlocks) {
        if (invalidBlocks.includes(parentType)) {
            shouldHaveIDfromParent = false;
        }
    }

    return shouldHaveIDfromParent;
}

export function listRequiredParameters(blockType: string): ScriptBlockParameter[] {
    const blockData = getScriptBlockData(blockType);
    const requiredParams: ScriptBlockParameter[] = [];
    for (const paramName in blockData.parameters) {
        const param = blockData.parameters[paramName];
        if (param.required) {
            requiredParams.push(param);
        }
    }
    return requiredParams;
}