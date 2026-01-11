import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { scriptBlockRegex, parameterRegex, inputsOutputsRegex } from '../models/regexPatterns';
import { DOCUMENT_IDENTIFIER, ThemeColorType, DiagnosticType, DefaultText, diagnostic } from '../models/enums';
import { getColor, getFontStyle } from "../utils/themeColors";
import { isScriptBlock, getScriptBlockData, ScriptBlockData, IndexRange } from './scriptData';
import { colorText } from '../utils/htmlFormat';
import { ScriptParameter, InputsItemParameter, InputsFluidParameter, } from './scriptParameter';

/**
 * Represents a script block in a PZ script file. Handles nested blocks and diagnostics.
 */
export class ScriptBlock {
// MEMBERS
    // extra
    document: TextDocument;
    diagnostics: Diagnostic[];
    originalScriptBlock: string | null = null;
    
    // block data
    parent: ScriptBlock | null = null; // the parent script block, if any
    scriptBlock: string = ""; // the type of the script block
    id: string | null = null; // the ID of the block, if any
    children: ScriptBlock[] = []; // children script blocks
    parameters: ScriptParameter[] = []; // parameters of the block
    isTemplate: boolean = false; // whether this block is a template block

    // positions
    start: number = 0;
    end: number = 0;
    lineStart: number = 0;
    lineEnd: number = 0;
    headerStart: number = 0;



// CONSTRUCTOR
    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        parent: ScriptBlock | null,
        type: string,
        name: string | null,
        start: number,
        end: number,
        headerStart: number
    ) {
        this.document = document;
        this.diagnostics = diagnostics;
        this.parent = parent;
        this.scriptBlock = type;
        this.id = name;
        this.start = start;
        this.end = end;
        this.headerStart = headerStart;
        this.lineStart = document.positionAt(this.start).line;
        this.lineEnd = document.positionAt(this.end).line;

        if (!this.validateBlock()) {
            return;
        }
        this.children = this.findChildBlocks();
        this.validateChildren();
        this.parameters = this.findParameters();
    }



// INFORMATION

    public isWord(word: string): boolean {
        return this.scriptBlock === word;
    }

    public isIndexOf(index: number): boolean {
        // check if in main block
        if (index < this.start || index >= this.end) {
            return false;
        }

        // check if in any child block
        for (const child of this.children) {
            if (index >= child.start && index < child.end) {
                return false;
            }
        }

        return true;
    }

    public getParameter(name: string, parameters?: ScriptParameter[]): ScriptParameter | null {
        const paramsToSearch = parameters || this.parameters;
        for (const param of paramsToSearch) {
            if (param.parameter === name) {
                return param;
            }
        }
        return null;
    }

    public isParameterOf(name: string): boolean {
        for (const param of this.parameters) {
            if (param.parameter === name) {
                return true;
            }
        }
        return false;
    }

    public canHaveParameter(name: string): boolean {
        const blockData = getScriptBlockData(this.scriptBlock);
        const parameters = blockData.parameters;
        if (parameters) {
            const paramData = parameters[name.toLowerCase()];
            if (paramData) {
                return true;
            }
        }
        return false;
    }

    private color(txt: string, colorType: ThemeColorType = ThemeColorType.SCRIPT_BLOCK): string {
        const color = getColor(colorType);
        const fontStyle = getFontStyle(colorType);
        return colorText(txt, color, fontStyle);
    }

    public getTree(children: boolean = false): string {
        let scriptBlock = this.color(this.scriptBlock)
        if (!children) {
            scriptBlock = "**" + scriptBlock + "**";
        }
        const parents = [scriptBlock];
    
        // recursively collect parents
        let current = this.parent;
        while (current && current.scriptBlock !== DOCUMENT_IDENTIFIER) {
            parents.unshift(this.color(current.scriptBlock));
            current = current.parent;
        }
        
        // build the tree string
        const str = parents.join(" → ");

        return str;
    }

    public getHoverText(): MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true; // needed for html rendering

        // retrieve tree and description
        const tree = this.getTree();
        const desc = this.getDescription();

        // assemble the hover content
        markdown.appendMarkdown(`${tree}  \n`);
        markdown.appendMarkdown('\n\n---\n\n');
        markdown.appendMarkdown(desc);
        
        return markdown;
    }

    public getDescription(): string {
        const blockData = getScriptBlockData(this.scriptBlock);
        return blockData?.description || DefaultText.SCRIPT_BLOCK_DESCRIPTION;
    }

    public canHaveParent(parentBlock: string): boolean {
        const blockData = getScriptBlockData(this.scriptBlock);
        const validParents = blockData.parents;
        if (this.scriptBlock in validParents) {
            return true;
        }
        return false;
    }

    public getRequiredChildren(): string[] | null {
        const blockData = getScriptBlockData(this.scriptBlock);
        return blockData.needsChildren || null;
    }

    public shouldHaveID(): boolean {
        if (!this.parent) { return true; } // there should always be a parent anyway
        return this.parent.shouldChildrenHaveID(this.scriptBlock);
    }

    public shouldChildrenHaveID(childrenBlock: string): boolean {
        const childrenBlockData = getScriptBlockData(childrenBlock);
        const IDData = childrenBlockData.ID;
        if (!IDData) { return false; }

        // used to check if the parent block requires an ID for this subblock
        const invalidBlocks = IDData.parentsWithout;
        let shouldHaveIDfromParent = true;
        if (invalidBlocks) {
            if (invalidBlocks.includes(this.scriptBlock)) {
                shouldHaveIDfromParent = false;
            }
        }

        return shouldHaveIDfromParent;
    }
    

// SEARCHERS

    protected findChildBlocks(): ScriptBlock[] {
        const children: ScriptBlock[] = [];

        const document = this.document;
        const text = document.getText()

        const blockHeader = scriptBlockRegex;
        let match: RegExpExecArray | null;
        let searchPos = this.start;

        while (searchPos < text.length) {
            // find the first script block
            blockHeader.lastIndex = searchPos;
            match = blockHeader.exec(text);            
            if (!match) break;

            // retrieve the match informations
            const blockType = match[1];
            const id = match[2].trim();
            const headerStart = match.index + match[0].indexOf(blockType); // position of the block keyword
            const braceStart = blockHeader.lastIndex - 1; // position of the '{'

            // stop if the block is outside the current block
            let braceCount = 1;
            let i = braceStart + 1;
            if (i >= this.end) {
                break;
            }

            // find the matching closing brace
            for (; i < text.length; ++i) {
                if (text[i] === '{') braceCount++;
                else if (text[i] === '}') braceCount--;
                if (braceCount === 0) break;
            }

            // unmatched braces
            if (braceCount !== 0) {
                this.diagnostic(
                    DiagnosticType.UNMATCHED_BRACE,
                    { scriptBlock: blockType },
                    headerStart
                );
                break;
            }

            // create the child block
            const blockEnd = i + 1; // position after the '}'
            const startOffset = braceStart + 1;
            const endOffset = blockEnd;
            const blockClass = assignedClasses.get(blockType) || ScriptBlock;
            const childBlock = new blockClass(
                document,
                this.diagnostics,
                this,
                blockType,
                id || null,
                startOffset,
                endOffset,
                headerStart
            );
            children.push(childBlock);
            searchPos = endOffset;
        
            // stop if we reached the end of this block
            if (searchPos >= this.end) {
                break;
            }
        }

        return children;
    }

    protected findParameters(): ScriptParameter[] {
        const document = this.document;
        const text = document.getText().slice(this.start, this.end);

        const parameters: ScriptParameter[] = [];

        const matches = Array.from(text.matchAll(parameterRegex));

        for (const match of matches) {
            const groups = match.groups;
            if (!groups) continue;
            const fullMatch = match[0];
            const name = groups.name.trim();
            const value = groups.value.trim();
            const comma = groups.comma.trim();

            const index = match.index!;

            const nameStart = this.start + index + fullMatch.indexOf(name);
            const nameEnd = nameStart + name.length;
            const nameRange: IndexRange = {start: nameStart, end: nameEnd};
            
            const valueStart = this.start + index + fullMatch.indexOf(value);
            const valueEnd = valueStart + value.length;
            const valueRange: IndexRange = {start: valueStart, end: valueEnd};

            // verify it is within this block and not in a child block
            if (!this.isIndexOf(nameStart) || !this.isIndexOf(valueEnd - 1)) {
                continue;
            }

            // verify it isn't already a parameter of the block
            const param = this.getParameter(name, parameters);
            let isDuplicate = false;
            if (param) {
                isDuplicate = true;
                param.setAsDuplicate(); // set the other parameter as duplicate too
            }

            const parameter = new ScriptParameter(
                document,
                this,
                this.diagnostics,
                name,
                value,
                nameRange,
                valueRange,
                comma,
                isDuplicate
            );

            parameters.push(parameter);
        }
        return parameters;
    } 


// CHECKERS

    protected validateBlock(): boolean {
        const type = this.scriptBlock;

        // verify it's a script block
        if (!isScriptBlock(type)) {
            this.diagnostic(
                DiagnosticType.NOT_VALID_BLOCK,
                { scriptBlock: type },
                this.headerStart
            )
            return false;
        }

        // verify ID
        if (!this.validateID()) {
            // return false;
        }

        // verify parent block
        if (!this.validateParent()) {
            // return false;
        }

        return true;
    }

    protected validateParent(): boolean {
        const blockData = getScriptBlockData(this.scriptBlock) as ScriptBlockData;

        // check should have parent
        const shouldHaveParent = blockData.shouldHaveParent;
        if (shouldHaveParent) {
            if (!this.parent) {
                const parentBlocks = blockData?.parents?.map(p => `'${p}'`).join(", ") || "unknown";
                this.diagnostic(
                    DiagnosticType.MISSING_PARENT_BLOCK,
                    { scriptBlock: this.scriptBlock, parentBlocks: parentBlocks },
                    this.headerStart
                )
                return false;
            }
        
        // shouldn't have parent
        } else {
            // but has one when shouldn't
            if (this.parent && this.parent.scriptBlock !== DOCUMENT_IDENTIFIER) {
                this.diagnostic(
                    DiagnosticType.HAS_PARENT_BLOCK,
                    { scriptBlock: this.scriptBlock }, 
                    this.headerStart
                )
                return false;
            }
            // all good, no parent as expected
            return true;
        }

        // check parent type
        const validParents = blockData.parents;
        if (validParents) {
            const parentType = this.parent.scriptBlock;
            if (!validParents.includes(parentType)) {
                this.diagnostic(
                    DiagnosticType.WRONG_PARENT_BLOCK,
                    { scriptBlock: this.scriptBlock, parentBlock: parentType, parentBlocks: validParents.map(p => `'${p}'`).join(", ") },
                    this.headerStart
                )
                return false;
            }
        }

        return true;
    }

    protected validateChildren(): boolean {
        const blockData = getScriptBlockData(this.scriptBlock) as ScriptBlockData;

        const validChildren = blockData.needsChildren;
        if (validChildren) {
            const childTypes = this.children.map(child => child.scriptBlock);
            for (const neededChild of validChildren) {
                if (!childTypes.includes(neededChild)) {
                    this.diagnostic(
                        DiagnosticType.MISSING_CHILD_BLOCK,
                        { scriptBlock: this.scriptBlock, childBlocks: validChildren.map(p => `'${p}'`).join(", ") },
                        this.headerStart
                    )
                    return false;
                }
            }
        }

        return true;
    }

    protected validateID(): boolean {
        if (this.scriptBlock === DOCUMENT_IDENTIFIER) {
            return true;
        }

        const blockData = getScriptBlockData(this.scriptBlock) as ScriptBlockData;

        // retrieve ID info
        const id = this.id;
        const hasID = id !== null && id !== undefined;

        // no ID data, means there shouldn't be any ID
        const IDData = blockData.ID;
        if (!IDData) {
            if (hasID) {
                this.diagnostic(
                    DiagnosticType.HAS_ID,
                    { scriptBlock: this.scriptBlock }, 
                    this.headerStart
                )
                return false;
            }
            return true;
        
        // check if ID is required
        }

        // used to check if the parent block requires an ID for this subblock
        const invalidBlocks = IDData.parentsWithout;
        let shouldHaveIDfromParent = true;
        if (invalidBlocks && this.parent) {
            if (invalidBlocks.includes(this.parent.scriptBlock)) {
                shouldHaveIDfromParent = false;
            }
        }

        // should have an ID
        if (!hasID && shouldHaveIDfromParent) {
            this.diagnostic(
                DiagnosticType.MISSING_ID,
                { scriptBlock: this.scriptBlock }, 
                this.headerStart
            )
            return false;
        }

        // has an ID, so validate it
        if (hasID) {
            // check if parent block forbids an ID for this subblock
            if (!shouldHaveIDfromParent) {
                this.diagnostic(
                    DiagnosticType.HAS_ID_IN_PARENT,
                    { 
                        scriptBlock: this.scriptBlock, 
                        parentBlock: this.parent ? this.parent.scriptBlock : "unknown", 
                        invalidBlocks: invalidBlocks ? invalidBlocks.map(p => `'${p}'`).join(", ") : "unknown" }, 
                    this.headerStart
                )
                return false;
            }

            // check if the ID has one or more valid value
            const validIDs = IDData.values;
            if (validIDs) {
                // verify the ID is valid
                if (!validIDs.includes(id)) {
                    this.diagnostic(
                        DiagnosticType.INVALID_ID,
                        { scriptBlock: this.scriptBlock, id: id, validIDs: validIDs.map(p => `'${p}'`).join(", ") },
                        this.headerStart
                    )
                    return false;
                }

                // consider the ID as part of the script block type
                // this means it will be a script block in itself with its own data
                if (IDData.asType) {
                    this.originalScriptBlock = this.scriptBlock;
                    this.scriptBlock = this.scriptBlock + " " + id;
                    this.id = null; // reset ID to null
                }
            }
        }
        
        return true;
    }

    protected validateParameters(): boolean {

        return true;
    }


// DIAGNOSTICS HELPERS

    protected diagnostic(
        type: DiagnosticType,
        params: Record<string, string>,
        index_start: number,index_end?: number,
        severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
    ): void {
        diagnostic(
            this.document,
            this.diagnostics,
            type,
            params,
            index_start,
            index_end,
            severity
        );
    }
}


/**
 * A ScriptBlock that represents a 'component' block specifically.
 */
export class ComponentBlock extends ScriptBlock {
    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        parent: ScriptBlock | null,
        type: string,
        name: string | null,
        start: number,
        end: number,
        headerStart: number
    ) {
        super(document, diagnostics, parent, type, name, start, end, headerStart);
    }

    // override isWord to check original script block since ID and scriptBlock are merged
    public isWord(word: string): boolean {
        return this.originalScriptBlock === word;
    }
}


export class ItemMapperBlock extends ScriptBlock {
    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        parent: ScriptBlock | null,
        type: string,
        name: string | null,
        start: number,
        end: number,
        headerStart: number
    ) {
        super(document, diagnostics, parent, type, name, start, end, headerStart);
    }

    public canHaveParameter(name: string): boolean {
        // TODO: to implement
        // allow any parameter in itemMapper blocks for now
        return true;
    }
}


export class TemplateBlock extends ScriptBlock {
    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        parent: ScriptBlock | null,
        type: string,
        name: string | null,
        start: number,
        end: number,
        headerStart: number
    ) {
        const splittedID = name ? name.split(" ") : null;
        if (splittedID) {
            type = splittedID[0];
            name = splittedID.slice(1).join(" ") || null;
        }
        
        super(document, diagnostics, parent, type, name, start, end, headerStart);
        this.isTemplate = true;
    }

    protected validateBlock(): boolean {
        const type = this.scriptBlock;

        // verify it's a script block
        if (!isScriptBlock(type)) {
            this.diagnostic(
                DiagnosticType.NOT_VALID_BLOCK,
                { scriptBlock: type },
                this.headerStart
            )
            return false;
        }

        // make sure an ID is provided
        if (!this.id) {
            this.diagnostic(
                DiagnosticType.MISSING_ID,
                { scriptBlock: this.scriptBlock },
                this.headerStart
            )
            return false;
        }

        // verify ID
        if (!this.validateID()) {
            // return false;
        }

        // verify parent block
        if (!this.validateParent()) {
            // return false;
        }

        return true;
    }
}


export class InputsBlock extends ScriptBlock {
    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        parent: ScriptBlock | null,
        type: string,
        name: string | null,
        start: number,
        end: number,
        headerStart: number
    ) {
        super(document, diagnostics, parent, type, name, start, end, headerStart);
    }

    protected findParameters(): any[] {
        const document = this.document;
        const text = document.getText().slice(this.start, this.end);

        const parameters: any[] = [];

        // identify the different inputs/outputs parameters
        const matches = Array.from(text.matchAll(inputsOutputsRegex.main));

        for (const match of matches) {
            const groups = match.groups;
            if (!groups) continue;
            const fullMatch = match[0];
            const name = groups.name.trim();
            const amount = groups.amount.trim();
            const values = groups.values;
            const comma = groups.comma.trim();

            const index = match.index!;

            // retrieve the positions
            const nameStart = this.start + index + fullMatch.indexOf(name);
            const nameEnd = nameStart + name.length;
            const nameRange: IndexRange = {start: nameStart, end: nameEnd};

            const amountStart = this.start + index + fullMatch.indexOf(amount);
            const amountEnd = amountStart + amount.length;
            const amountRange: IndexRange = {start: amountStart, end: amountEnd};
            
            const valuesStart = this.start + index + fullMatch.indexOf(values);
            const valuesEnd = valuesStart + values.length;
            const valuesRange: IndexRange = {start: valuesStart, end: valuesEnd};

            // verify it is within this block and not in a child block
            if (!this.isIndexOf(nameStart) || !this.isIndexOf(valuesEnd - 1)) {
                continue;
            }

            // determine parameter type
            let parameterType;
            if (name === "item") {
                parameterType = InputsItemParameter;
            } else if (name.includes("fluid")) {
                parameterType = InputsFluidParameter;
            } else {
                // unknown parameter type
                continue;
            }

            // create the parameter
            const parameter = new parameterType(
                document,
                this,
                this.diagnostics,
                name,
                values,
                amount,
                nameRange,
                amountRange,
                valuesRange,
                comma
            );

            parameters.push(parameter);
        } 

        return parameters;
    }
}


/**
 * A ScriptBlock that represents the entire document. This is more a convenience class to handle everything easily.
 */
export class DocumentBlock extends ScriptBlock {
    private static documentBlockCache: Map<string, DocumentBlock> = new Map();
    
    constructor(document: TextDocument, diagnostics: Diagnostic[]) {
        // Only document is provided
        const parent = null;
        const type = DOCUMENT_IDENTIFIER;
        const name = null;
        const start = 0;
        const end = document.getText().length;
        super(document, diagnostics, parent, type, name, start, end, start);

        // cache this document block
        DocumentBlock.documentBlockCache.set(document.uri.toString(), this);
    }


// CACHE

    // Static method to retrieve cached DocumentBlock
    public static getDocumentBlock(document: vscode.TextDocument): DocumentBlock | undefined {
        const documentBlock = DocumentBlock.documentBlockCache.get(document.uri.toString());
        // if (!documentBlock) {
        //     documentBlock = new DocumentBlock(document, []);
        // }
        return documentBlock;
    }

    public static clearCache(): void {
        DocumentBlock.documentBlockCache.clear();
    }


// ACCESS

    public getBlock(index: number): ScriptBlock | null {
        // check if index is within this document
        if (index < this.headerStart || index >= this.end) {
            return null;
        }

        // recursive search for the block containing the index
        const searchBlock = (block: ScriptBlock): ScriptBlock | null => {
            for (const child of block.children) {
                if (index >= child.headerStart && index < child.end) {
                    // found a child containing the index, search deeper
                    const found = searchBlock(child);
                    return found || child;
                }
            }
            return null; // no child contains the index
        }
        return searchBlock(this);
    }

    // overwrite validates for this class since the rules aren't the same
    protected validateBlock(): boolean { return true; }
    protected validateChildren(): boolean { return true; }
    protected validateID(): boolean { return true; }
    protected findParameters(): ScriptParameter[] { return []; }
}



// ASSIGNED CLASSES FOR SCRIPT BLOCK TYPES
const assignedClasses = new Map<string, typeof ScriptBlock>();
assignedClasses.set("component", ComponentBlock);
assignedClasses.set("template", TemplateBlock);
assignedClasses.set("itemMapper", ItemMapperBlock)
assignedClasses.set("inputs", InputsBlock);