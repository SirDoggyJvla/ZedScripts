import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { scriptBlockRegex, parameterRegex } from '../models/regexPatterns';
import { ThemeColorType, DiagnosticType, DefaultText, formatDiagnostic } from '../models/enums';
import { getColor } from "../utils/themeColors";
import { isScriptBlock, getScriptBlockData, ScriptBlockData } from './scriptData';
import { colorText, underlineText } from '../utils/htmlFormat';
import { ScriptParameter } from './scriptParameter';

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
    parent: ScriptBlock | null = null;
    scriptBlock: string = "";
    id: string | null = null;
    children: ScriptBlock[] = [];
    parameters: ScriptParameter[] = [];

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
            console.log(`Checking parameter '${param.name}' against '${name}'`);
            if (param.name === name) {
                console.log(`Found parameter '${name}' in block '${this.scriptBlock}'`);
                return param;
            }
        }
        return null;
    }

    public isParameterOf(name: string): boolean {
        for (const param of this.parameters) {
            if (param.name === name) {
                return true;
            }
        }
        return false;
    }

    private colorBlock(txt: string): string {
        const color = getColor(ThemeColorType.SCRIPT_BLOCK);
        return colorText(txt, color);
    }

    private getTree(): string {
        const scriptBlock = "**" + this.colorBlock(this.scriptBlock) + "**";
        const parents = [scriptBlock];
    
        // recursively collect parents
        let current = this.parent;
        while (current && current.scriptBlock !== "_DOCUMENT") {
            parents.unshift(this.colorBlock(current.scriptBlock));
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
            const paramName = groups.name.trim();
            const paramValue = groups.value.trim();
            const comma = groups.comma.trim();

            console.log(`Full Match: '${fullMatch}'`);

            const index = match.index!;

            const parameterStart = this.start + index + fullMatch.indexOf(paramName);
            const parameterEnd = parameterStart + paramName.length;
            const valueStart = this.start + index + fullMatch.indexOf(paramValue);
            const valueEnd = valueStart + paramValue.length;

            // verify it is within this block and not in a child block
            if (!this.isIndexOf(parameterStart) || !this.isIndexOf(valueEnd - 1)) {
                continue;
            }

            // verify it isn't already a parameter of the block
            const param = this.getParameter(paramName, parameters);
            let isDuplicate = false;
            if (param) {
                isDuplicate = true;
                param.setAsDuplicate(); // set the other parameter as duplicate too
            }

            const parameter = new ScriptParameter(
                document,
                this,
                this.diagnostics,
                paramName,
                paramValue,
                parameterStart,
                parameterEnd,
                valueStart,
                valueEnd,
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
            if (this.parent && this.parent.scriptBlock !== "_DOCUMENT") {
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
        if (this.scriptBlock === "_DOCUMENT") {
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

        if (hasID) {
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
                    console.log(`Consider ID '${id}' as part of script block type for block '${this.scriptBlock}'`);
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

    private diagnostic(
        type: DiagnosticType,
        params: Record<string, string>,
        index_start: number,index_end?: number,
        severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
    ): void {
        const positionStart = this.document.positionAt(index_start);
        const positionEnd = index_end ? this.document.positionAt(index_end) : positionStart;
        const message = formatDiagnostic(type, params);
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(positionStart, positionEnd),
            message,
            severity
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
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



/**
 * A ScriptBlock that represents the entire document. This is more a convenience class to handle everything easily.
 */
export class DocumentBlock extends ScriptBlock {
    private static documentBlockCache: Map<string, DocumentBlock> = new Map();
    
    constructor(document: TextDocument, diagnostics: Diagnostic[]) {
        // Only document is provided
        const parent = null;
        const type = "_DOCUMENT";
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