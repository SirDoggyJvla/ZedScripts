import * as vscode from "vscode";

export function provideDocumentFormattingEdits(
    document: vscode.TextDocument
): vscode.TextEdit[] {
    const formattedText = formatText(document.getText());
    
    // Créer un TextEdit pour remplacer tout le document
    const firstLine = document.lineAt(0);
    const lastLine = document.lineAt(document.lineCount - 1);
    const textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
    
    return [vscode.TextEdit.replace(textRange, formattedText)];
}

function formatText(text: string): string {
    const lines = text.split("\n");
    let formattedLines: string[] = [];
    let indentLevel = 0;
    let inCommentBlock = false;
    let commentNestingLevel = 0; // Compteur pour les commentaires imbriqués
    let blockLines: string[] = [];
    let nestedBlockIndentLevel = 0;
    let currentBlockType: string | null = null; // "fixing", "item", "craftRecipe", etc.
    let pendingBlockType: string | null = null;
    
    for (let line of lines) {
        const trimmed = line.trim();
        
        // Détecter la ligne d'en-tête de bloc s'il s'agit de fixing, item ou craftRecipe
        if (!pendingBlockType) {
            const headerMatch = trimmed.match(/^(fixing|item|craftRecipe)\b/i);
            if (headerMatch) {
                pendingBlockType = headerMatch[1].toLowerCase();
            }
        }
        
        // Si la ligne est uniquement "{" et qu'un header a été détecté, démarrer le bloc
        if (trimmed === "{" && pendingBlockType) {
            currentBlockType = pendingBlockType;
            pendingBlockType = null;
        }
        
        // Gestion des commentaires imbriqués
        if (trimmed.includes("/*")) {
            commentNestingLevel += (trimmed.match(/\/\*/g) || []).length;
            inCommentBlock = true;
        }
        if (trimmed.includes("*/")) {
            commentNestingLevel -= (trimmed.match(/\*\//g) || []).length;
            if (commentNestingLevel <= 0) {
                inCommentBlock = false;
                commentNestingLevel = 0;
            }
        }
        if (inCommentBlock || commentNestingLevel > 0) {
            formattedLines.push(trimmed);
            continue;
        }
        if (trimmed.startsWith("//")) {
            formattedLines.push(trimmed);
            continue;
        }
        
        // Gestion des blocs
        if (trimmed.endsWith("{")) {
            // Avant de démarrer un nouveau bloc, formater les lignes accumulées
            if (blockLines.length > 0) {
                if (currentBlockType === "fixing") {
                    formattedLines.push(...alignColon(blockLines, indentLevel));
                } else {
                    formattedLines.push(...alignEquals(blockLines, indentLevel));
                }
                blockLines = [];
            }
            formattedLines.push(" ".repeat(indentLevel * 4) + trimmed);
            indentLevel++;
            nestedBlockIndentLevel = indentLevel;
            continue;
        } else if (trimmed.endsWith("}")) {
            // Avant de fermer le bloc, formater les lignes accumulées
            if (blockLines.length > 0) {
                if (currentBlockType === "fixing") {
                    formattedLines.push(...alignColon(blockLines, nestedBlockIndentLevel - 1));
                } else if (currentBlockType === "item" || currentBlockType === "craftrecipe") {
                    formattedLines.push(...alignEquals(blockLines, nestedBlockIndentLevel - 1));
                }
                blockLines = [];
            }
            indentLevel--;
            formattedLines.push(" ".repeat(indentLevel * 4) + trimmed);
            currentBlockType = null; // Fin du bloc
            continue;
        } else {
            // Vérifier si la ligne doit être alignée en fonction du séparateur attendu
            if (currentBlockType === "fixing" && trimmed.includes(":")) {
                blockLines.push(trimmed);
                continue;
            } else if ((currentBlockType === "item" || currentBlockType === "craftrecipe") && trimmed.includes("=")) {
                blockLines.push(trimmed);
                continue;
            } else {
                // S'il y a des lignes accumulées, les formater avant de traiter la ligne courante
                if (blockLines.length > 0) {
                    if (currentBlockType === "fixing") {
                        formattedLines.push(...alignColon(blockLines, nestedBlockIndentLevel - 1));
                    } else {
                        formattedLines.push(...alignEquals(blockLines, nestedBlockIndentLevel - 1));
                    }
                    blockLines = [];
                }
                formattedLines.push(" ".repeat(indentLevel * 4) + trimmed);
            }
        }
    }
    
    return formattedLines.join("\n");
}

function alignEquals(lines: string[], indentLevel: number): string[] {
    const maxKeyLength = Math.max(
        ...lines.map((line) => line.split("=")[0].trim().length)
    );
    return lines.map((line) => {
        const [key, ...rest] = line.split("=");
        const value = rest.join("=").trim();
        return " ".repeat((indentLevel + 1) * 4) + key.trim().padEnd(maxKeyLength) + " = " + value;
    });
}

function alignColon(lines: string[], indentLevel: number): string[] {
    const maxKeyLength = Math.max(
        ...lines.map((line) => line.split(":")[0].trim().length)
    );
    return lines.map((line) => {
        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        return " ".repeat((indentLevel + 1) * 4) + key.trim().padEnd(maxKeyLength) + " : " + value;
    });
}
