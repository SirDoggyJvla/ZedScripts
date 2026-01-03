import { TextDocument, Position } from 'vscode';
import SCRIPTS_TYPES from '../data/scriptBlocks.json';


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
}

export interface ScriptBlockID {
    parentsWithout?: string[];
    values?: string[];
    asType?: boolean;
}

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
export const BLOCK_NAMES = Object.keys(SCRIPTS_TYPES);
const blockPattern = new RegExp(
    `^\\s*(${BLOCK_NAMES.join('|')})\\s+.*\\{.*$`
);

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
