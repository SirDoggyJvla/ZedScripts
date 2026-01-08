import * as vscode from "vscode";
import * as path from "path";
import { DiagnosticProvider } from "./providers/diagnostic";
import { provideDefinition } from "./providers/definition";
import { provideDocumentFormattingEdits } from "./providers/editing";
import { PZCompletionItemProvider } from "./providers/completion";
import { PZHoverProvider } from "./providers/hover";
import { itemCache } from "./providers/cache";
import { initScriptBlocks } from "./scripts/scriptData";

function handleOpenTextDocument(document: vscode.TextDocument) {
    if (document.languageId === "pz-scripts") {
        const config = vscode.workspace.getConfiguration("pzSyntaxExtension");
        const pzFilenames = config.get<string[]>("pzFilenames", []);
        console.debug(pzFilenames);
        
        // Vérification du nom de fichier avec regex
        const fileName = path.basename(document.fileName);
        const matchesPattern = pzFilenames.some(pattern => {
            try {
                const regex = new RegExp(pattern);
                return regex.test(fileName);
            } catch (e) {
                // Si le pattern n'est pas une regex valide, faire une comparaison exacte
                return pattern === fileName;
            }
        });
        
        if (matchesPattern) {
            console.debug(
                `Fichier ${document.fileName} détecté comme un fichier de script PZ (par pattern).`
            );
            vscode.languages.setTextDocumentLanguage(document, "pz-scripts");
            return;
        }
        
        // Vérification de la première ligne (existante)
        const firstLine = document.lineAt(0).text;
        const pattern = /^\s*module\s+\w+\s*\{?/;
        
        if (pattern.test(firstLine)) {
            console.debug(
                `Fichier ${document.fileName} détecté comme un fichier de script PZ (par module).`
            );
            vscode.languages.setTextDocumentLanguage(document, "pz-scripts");
        }
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // let documentLanguage = vscode.window.activeTextEditor?.document.languageId;
    // console.debug(`Document language on activation: ${documentLanguage}`);

    // vscode.workspace.onDidOpenTextDocument(handleOpenTextDocument);
    
    // documentLanguage = vscode.window.activeTextEditor?.document.languageId;
    // console.debug(`Document language on activation: ${documentLanguage}`);

    // if (documentLanguage === "plaintext") {
    //     return;
    // }

    // access the cached script data first

    // try to fetch the latest scriptBlocks.json from the GitHub repository
    await initScriptBlocks(context);

    console.log('Extension "pz-syntax-extension" is now active!');
    const diagnosticProvider = new DiagnosticProvider();
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.txt");
    watcher.onDidChange((uri) => {
        itemCache.clearForFile(uri.fsPath);
        console.debug(`Cache invalidé pour : ${uri.fsPath}`);
    });
    
    watcher.onDidDelete((uri) => {
        itemCache.clearForFile(uri.fsPath);
        console.debug(`Cache invalidé pour : ${uri.fsPath}`);
    });
    if (vscode.window.activeTextEditor) {
        diagnosticProvider.updateDiagnostics(
            vscode.window.activeTextEditor.document
        );
    }
    
    context.subscriptions.push(
        watcher,
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === "pz-scripts") {
                diagnosticProvider.updateDiagnostics(document);
            }
        }),
        
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.languageId === "pz-scripts") {
                diagnosticProvider.updateDiagnostics(event.document);
            }
        }),

        vscode.languages.registerCompletionItemProvider(
            "pz-scripts",
            new PZCompletionItemProvider(),
            ".",
            " ",
            "\t" // Déclencheurs de complétion
        ),

        // handle mouse hover words
        vscode.languages.registerHoverProvider(
            "pz-scripts",
            new PZHoverProvider()
        ),
        
        // format document with right click > Format document
        vscode.languages.registerDocumentFormattingEditProvider("pz-scripts", {
            provideDocumentFormattingEdits,
        }),
        
        // apparently used when ctrl + click something
        vscode.languages.registerDefinitionProvider("pz-scripts", {
            provideDefinition,
        })
    );
}

export function deactivate() {
    console.debug('Extension "pz-syntax-extension" is now deactivated.');
}
