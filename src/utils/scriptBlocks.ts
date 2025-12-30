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
        this.validateID();
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
                this.diagnosticBlockBraces(blockType, id ?? null, headerStart);
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
            this.diagnosticNotValidBlock(type, this.id, this.headerStart);
            return false;
        }

        // verify parent block
        if (!this.validateParent()) {
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
                this.diagnosticNoParentBlock(this.scriptBlock, this.id, this.headerStart);
                return false;
            }
        
        // shouldn't have parent
        } else {
            // but has one when shouldn't
            if (this.parent && this.parent.scriptBlock !== "_DOCUMENT") {
                this.diagnosticHasParentBlock(this.scriptBlock, this.id, this.headerStart);
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
                this.diagnosticWrongParentBlock(this.scriptBlock, this.id, parentType, this.headerStart);
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
                    this.diagnosticMissingChildBlock(this.scriptBlock, this.id, this.headerStart);
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
                this.diagnosticHasID(this.scriptBlock, this.headerStart);
                return false;
            }
            return true;
        
        // check if ID is required
        } else {
            if (!hasID) {
                this.diagnosticMissingID(this.scriptBlock, this.headerStart);
                return false;
            }
        }

        // check if the ID has a valid value
        const validIDs = IDData.values;
        if (validIDs && id) {
            if (!validIDs.includes(id)) {
                this.diagnosticInvalidID(this.scriptBlock, id, validIDs, this.headerStart);
                return false;
            }
        }
        
        return true;
    }


// DIAGNOSTICS HELPERS

    private diagnosticBlockBraces(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.unmatchedBrace, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticNotValidBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.notValidBlock, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticNoParentBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const blockData = getScriptBlockData(block);
        const parentBlocks = blockData?.parents?.join(", ") || "unknown";
        const message = formatDiagnostic(DiagnosticType.missingParentBlock, { scriptBlock: `${block}`, parentBlocks: parentBlocks });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticHasParentBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.hasParentBlock, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticWrongParentBlock(block: string, id: string | null, parentBlock: string, index: number): void {
        const position = this.document.positionAt(index);
        const blockData = getScriptBlockData(block);
        const parentBlocks = blockData?.parents?.join(", ") || "unknown";
        const message = formatDiagnostic(DiagnosticType.wrongParentBlock, { scriptBlock: `${block}`, parentBlock: parentBlock, parentBlocks: parentBlocks });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticMissingChildBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const blockData = getScriptBlockData(block);
        const childBlocks = blockData?.needsChildren?.join(", ") || "unknown";
        const message = formatDiagnostic(DiagnosticType.missingChildBlock, { scriptBlock: `${block}`, childBlocks: childBlocks });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticMissingID(block: string, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.missingID, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticHasID(block: string, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.hasID, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticInvalidID(block: string, id: string, validIDs: string[], index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.invalidID, { scriptBlock: `${block}`, id: id, validIDs: validIDs.join(", ") });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
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