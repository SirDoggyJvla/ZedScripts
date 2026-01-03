import {
    TextDocument,
    Position,
    CompletionItem,
    CompletionItemKind,
} from "vscode";
import * as vscode from "vscode";
import { BLOCK_NAMES, getBlockType, getScriptBlockData } from "../scripts/scriptData";
import { DocumentBlock } from "../scripts/scriptBlocks";

export class PZCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: TextDocument,
        position: Position
    ): vscode.ProviderResult<CompletionItem[]> {
        const linePrefix = document
        .lineAt(position)
        .text.substr(0, position.character);

        const completion: CompletionItem[] = [];

        // the document has been diagnosed and parsed
        const documentBlock = DocumentBlock.getDocumentBlock(document);
        if (documentBlock) {
            // retrieve the block at the position of the word
            const block = documentBlock.getBlock(document.offsetAt(position));
            if (block) {
                // parameter completion
                const blockData = getScriptBlockData(block.scriptBlock);
                for (const paramName in blockData.parameters) {
                    const param = blockData.parameters[paramName];
                    const canDuplicate = param.allowedDuplicate || false;
                    if (canDuplicate || !block.isParameterOf(paramName)) {
                        const item = new CompletionItem(paramName, CompletionItemKind.Field);
                        item.detail = param.description;
                        completion.push(item);
                    }
                }
            }
        }

        // script block completion
        if (/^\s*$/.test(linePrefix)) {
            for (const blockName of BLOCK_NAMES) {
                const item = new CompletionItem(blockName, CompletionItemKind.Keyword);
                const blockData = getScriptBlockData(blockName);
                item.detail = blockData.description;
                completion.push(item);
            }
        }
        
        return completion;
    }
}
