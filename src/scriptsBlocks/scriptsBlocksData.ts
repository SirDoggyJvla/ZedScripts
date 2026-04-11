import * as path from "path";

export interface ScriptData {
    [key: string]: ScriptBlockData;
}

export let SCRIPTS_TYPES: ScriptData = require('../data/scriptBlocks.json');
export enum VALUE_TYPES {
    STRING = "string",
    INT = "integer",
    FLOAT = "float",
    BOOLEAN = "boolean",
    ARRAY = "array",
    OBJECT = "object",
}



export interface ScriptBlockData {
    name: string;
    description: string;
    shouldHaveParent: boolean;
    needsChildren?: string[];
    parents: string[];
    ID?: ScriptBlockID;
    parameters: { [key: string]: ScriptBlockParameter };
    properties?: { [key: string]: InputParameterData };
    isVariant?: string; // if this block is a variant of another block, the name of the base block

    isRoot?: boolean;
    pattern?: string[]; // to be used as regex patterns for identification
    noComma?: boolean; // default is false
}

export interface IndexRange {
    start: number;
    end: number;
}

export type ScriptBlockValue = string;

export interface ScriptBlockParameter {
    name: string;
    description?: string;
    allowedDuplicate?: boolean;
    canBeEmpty?: boolean;
    default?: ScriptBlockValue[];
    type?: "string" | "int" | "float" | "boolean" | "array" | "object";
    blockType?: ScriptBlockType;
    arrayType?: "string" | "int" | "float" | "boolean"; // if type is array, the type of the values in the array
    separator?: string; // if type is array, the separator used to split values (default is ;)
    keyValueSeparator?: string; // if type is object, the separator used to split key and value (default is :)
    required?: boolean;
    deprecated?: DeprecatedInfo;
    values?: ScriptBlockValue[];
    needs?: ScriptBlockNeeds[];
}

export interface ScriptBlockNeeds {
    name?: string; // the dependent parameter
    values?: ScriptBlockValue[]; // list of possible values for the dependent parameter
    valueToType?: { [key: string]: string } // mapping of dependent parameter values to types (for dynamic typing based on other parameter's value)
}

export interface DeprecatedInfo {
    replacedBy?: string;
    description?: string;
    version?: string;
}

export interface ScriptBlockID {
    parentsWithout?: string[];
    values?: string[];
    asType?: boolean;
    optional?: string[];
    canHaveSpace?: boolean;
}

export interface ScriptBlockType {
    block: string;
    fullType: boolean; // if true, this can use the module to reference the block
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
    description: string;
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