import * as vscode from 'vscode';
import { Position, TextDocument, Diagnostic } from "vscode";
import { scriptBlockRegex } from '../models/regexPatterns';
import { DiagnosticType, formatDiagnostic } from '../models/enums';
import { isScriptBlock, getScriptBlockData, ScriptBlockData } from '../models/scriptData';

/**
 * Represents a script block in a PZ script file. Handles nested blocks and diagnostics.
 */
export class ScriptBlock {
    // members
    document: TextDocument;
    diagnostics: Diagnostic[];
    
    // block data
    parent: ScriptBlock | null = null;
    scriptBlock: string = "";
    id: string | null = null;
    children: ScriptBlock[] = [];

    // positions
    start: number = 0;
    end: number = 0;
    lineStart: number = 0;
    lineEnd: number = 0;
    headerStart: number = 0;

    // constructors
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
    }

    public findChildBlocks(): ScriptBlock[] {
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
            const id = match[2];
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
                    DiagnosticType.unmatchedBrace,
                    { scriptBlock: blockType },
                    headerStart
                );
                break;
            }

            // create the child block
            const blockEnd = i + 1; // position after the '}'
            const startOffset = braceStart + 1;
            const endOffset = blockEnd;
            const childBlock = new ScriptBlock(
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


// CHECKERS

    protected validateBlock(): boolean {
        const type = this.scriptBlock;

        // verify it's a script block
        if (!isScriptBlock(type)) {
            this.diagnostic(
                DiagnosticType.notValidBlock,
                { scriptBlock: type },
                this.headerStart
            )
            return false;
        }

        // verify parent block
        if (!this.validateParent()) {
            return false;
        }

        // verify ID
        if (!this.validateID()) {
            return false;
        }

        return true;
    }

    protected validateParent(): boolean {
        const blockData = getScriptBlockData(this.scriptBlock) as ScriptBlockData;

        // check should have parent
        const shouldHaveParent = blockData.shouldHaveParent;
        if (shouldHaveParent) {
            if (!this.parent) {
                const parentBlocks = blockData?.parents?.join(", ") || "unknown";
                this.diagnostic(
                    DiagnosticType.missingParentBlock,
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
                    DiagnosticType.hasParentBlock,
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
                    DiagnosticType.wrongParentBlock,
                    { scriptBlock: this.scriptBlock, parentBlock: parentType, parentBlocks: validParents.join(", ") },
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
                        DiagnosticType.missingChildBlock,
                        { scriptBlock: this.scriptBlock, childBlocks: validChildren.join(", ") },
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
                    DiagnosticType.hasID,
                    { scriptBlock: this.scriptBlock }, 
                    this.headerStart
                )
                return false;
            }
            return true;
        
        // check if ID is required
        }

        // used to check if the parent block requires an ID for this subblock
        const validParentBlocks = IDData.parents;
        let shouldHaveIDfromParent = true;
        if (validParentBlocks && this.parent) {
            if (!validParentBlocks.includes(this.parent.scriptBlock)) {
                shouldHaveIDfromParent = false;
            }
        }

        // should have an ID
        if (!hasID && shouldHaveIDfromParent) {
            this.diagnostic(
                DiagnosticType.missingID,
                { scriptBlock: this.scriptBlock }, 
                this.headerStart
            )
            return false;
        }

        if (hasID) {
            if (!shouldHaveIDfromParent) {
                this.diagnostic(
                    DiagnosticType.hasIDinParent,
                    { 
                        scriptBlock: this.scriptBlock, 
                        parentBlock: this.parent ? this.parent.scriptBlock : "unknown", 
                        validParentBlocks: validParentBlocks ? validParentBlocks.join(", ") : "unknown" }, 
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
                        DiagnosticType.invalidID,
                        { scriptBlock: this.scriptBlock, id: id, validIDs: validIDs.join(", ") },
                        this.headerStart
                    )
                    return false;
                }

                // consider the ID as part of the script block type
                // this means it will be a script block in itself with its own data
                if (IDData.asType) {
                    this.scriptBlock = this.scriptBlock + " " + id;
                    this.id = null; // reset ID to null
                }
            }
        }
        
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
 * A ScriptBlock that represents the entire document. This is more a convenience class to handle everything easily.
 */
export class DocumentBlock extends ScriptBlock {
    constructor(document: TextDocument, diagnostics: Diagnostic[]) {
        // Only document is provided
        const parent = null;
        const type = "_DOCUMENT";
        const name = null;
        const start = 0;
        const end = document.getText().length;
        super(document, diagnostics, parent, type, name, start, end, start);
    }

    // overwrite validates for this class since the rules aren't the same
    protected validateBlock(): boolean { return true; }
    protected validateChildren(): boolean { return true; }
    protected validateID(): boolean { return true; }
}