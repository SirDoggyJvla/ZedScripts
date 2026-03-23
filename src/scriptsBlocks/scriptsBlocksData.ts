import * as path from "path";

export interface ScriptData {
    [key: string]: ScriptBlockData;
}

export let SCRIPTS_TYPES: ScriptData = require('../data/scriptBlocks.json');



export interface ScriptBlockData {
    name: string;
    description: string;
    shouldHaveParent: boolean;
    needsChildren?: string[];
    parents: string[];
    ID?: ScriptBlockID;
    parameters: { [key: string]: ScriptBlockParameter };
    properties?: { [key: string]: InputParameterData };

    isRoot?: boolean;
    pattern?: string[]; // to be used as regex patterns for identification
    noComma?: boolean; // default is false
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

function mapScriptTypes(data: ScriptData): { [key: string]: ScriptBlockData } {
    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key.toLowerCase(), value])
    );
}

// generates a regex pattern to match any script block line
export let BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
export let SCRIPTS_TYPES_LOWER = mapScriptTypes(SCRIPTS_TYPES);
export let blockPattern: RegExp;
export function initBlockRegex() {
    BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
    SCRIPTS_TYPES_LOWER = mapScriptTypes(SCRIPTS_TYPES);
    blockPattern = new RegExp(
        `^\\s*(${BLOCK_NAMES.join('|')})\\s+.*\\{.*$`
    );
}

function mapRootFiles(data: ScriptData): ScriptBlockData[] {
    return Object.values(data).filter(block => block.isRoot);
}

export let ROOT_FILES = mapRootFiles(SCRIPTS_TYPES);
export function initRootFiles() {
    ROOT_FILES = mapRootFiles(SCRIPTS_TYPES);
    return;
}

export function setScriptsTypes(newTypes: ScriptData) {
    SCRIPTS_TYPES = newTypes;
    initBlockRegex();
    initRootFiles();
}


export let DEFAULT_ROOT_FILE = "ROOT-Scripts";
export function testForScriptRootFile(filePath: string): string | null{
    filePath = filePath.replace(/\\/g, '/');
    filePath = path.posix.normalize(filePath);
    console.debug(`Testing file path for script root file: ${filePath}`);
    for (const rootFile of ROOT_FILES) {
        for (const pattern of rootFile.pattern || []) {
            const regex = new RegExp(pattern);
            if (regex.test(filePath)) {
                return rootFile.name;
            }
        }
    }
    // default to scripts file in case of weird match case, 
    // since the user might just want to use the extension 
    // features without following the usual file naming conventions
    return null;
}