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



// generates a regex pattern to match any script block line
export let BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
export let SCRIPTS_TYPES_LOWER = Object.fromEntries(
    Object.entries(SCRIPTS_TYPES).map(([key, value]) => [key.toLowerCase(), value])
);
export let blockPattern: RegExp;
export function initBlockRegex() {
    BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
    SCRIPTS_TYPES_LOWER = Object.fromEntries(
        Object.entries(SCRIPTS_TYPES).map(([key, value]) => [key.toLowerCase(), value])
    );
    blockPattern = new RegExp(
        `^\\s*(${BLOCK_NAMES.join('|')})\\s+.*\\{.*$`
    );
}

export function setScriptsTypes(newTypes: ScriptData) {
    SCRIPTS_TYPES = newTypes;
    initBlockRegex();
}