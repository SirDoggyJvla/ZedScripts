import { ScriptBlockData, ScriptBlockParameter, SCRIPTS_TYPES_LOWER } from "./scriptsBlocksData";


export function isScriptBlock(word: string): boolean {
    return word.toLowerCase() in SCRIPTS_TYPES_LOWER;
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
    const blockData =   SCRIPTS_TYPES_LOWER[blockType.toLowerCase()] as ScriptBlockData;
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
