import {
    TextDocument,
    Position,
    CompletionItem,
    CompletionItemKind,
} from "vscode";
import * as vscode from "vscode";
import { PROPERTY_DESCRIPTIONS } from "../models/scriptData";

export class PZCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: TextDocument,
        position: Position
    ): vscode.ProviderResult<CompletionItem[]> {
        const linePrefix = document
        .lineAt(position)
        .text.substr(0, position.character);
        
        // Complétion dans les blocs d'items
        if (this.isInsideItemBlock(document, position)) {
            return Object.keys(PROPERTY_DESCRIPTIONS).map((prop) => {
                const item = new CompletionItem(prop, CompletionItemKind.Property);
                item.detail = PROPERTY_DESCRIPTIONS[prop];
                return item;
            });
        }
        
        // Complétion pour les mots-clés principaux
        if (/^\s*$/.test(linePrefix)) {
            return [
                new CompletionItem("item", CompletionItemKind.Keyword),
                new CompletionItem("craftRecipe", CompletionItemKind.Keyword),
                new CompletionItem("module", CompletionItemKind.Keyword),
            ];
        }
        
        return [];
    }
    
    private isInsideItemBlock(
        document: TextDocument,
        position: Position
    ): boolean {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // Trouver le dernier bloc item avant la position actuelle
        const itemBlockRegex = /item\s+\w+/g;
        let match: RegExpExecArray | null;
        let lastItemStart = -1;
        
        while ((match = itemBlockRegex.exec(text)) !== null) {
            if (match.index < offset) {
                lastItemStart = match.index;
            } else {
                break;
            }
        }
        
        // Vérifier si nous sommes à l'intérieur des accolades
        if (lastItemStart > -1) {
            const blockEnd = text.indexOf("}", lastItemStart);
            return offset > lastItemStart && (blockEnd === -1 || offset < blockEnd);
        }
        
        return false;
    }
}
