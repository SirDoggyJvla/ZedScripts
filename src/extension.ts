import * as vscode from "vscode";
import * as path from "path";
import { DiagnosticProvider } from "./providers/diagnostic";
import { provideDefinition } from "./providers/definition";
import { provideDocumentFormattingEdits } from "./providers/editing";
import { PZCompletionItemProvider } from "./providers/completion";
import { PZHoverProvider } from "./providers/hover";
import { itemCache } from "./providers/cache";
import { initScriptBlocks } from "./scripts/scriptData";
import { DefaultText, EXTENSION_LANGUAGE } from "./models/enums";
import { scriptFileRegex } from "./models/regexPatterns";

function handleOpenTextDocument(editor: vscode.TextEditor) {
    if (!editor || editor.document.languageId === EXTENSION_LANGUAGE) { return; }
    const document = editor.document;
    const filePath = path.posix.normalize(document.fileName);

    if (scriptFileRegex.test(filePath)) {
        console.debug(`The opened file is identified as a script file: `, filePath);
        
        // set the file to ZedScripts
        vscode.languages.setTextDocumentLanguage(document, EXTENSION_LANGUAGE);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // Handle the initially active document on startup
    if (vscode.window.activeTextEditor) {
        handleOpenTextDocument(vscode.window.activeTextEditor);
    }

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor || editor.document.languageId === EXTENSION_LANGUAGE) { return; }
        handleOpenTextDocument(editor);
    });

    // vscode.workspace.onDidOpenTextDocument(handleOpenTextDocument);
    
    // documentLanguage = vscode.window.activeTextEditor?.document.languageId;
    // console.debug(`Document language on activation: ${documentLanguage}`);

    // if (documentLanguage === "plaintext") {
    //     return;
    // }

    // access the cached script data first

    // try to fetch the latest scriptBlocks.json from the GitHub repository
    await initScriptBlocks(context);

    // add a force reset cache function
    vscode.commands.registerCommand(
        "ZedScripts.resetScriptCache",
        async () => {
            const result = await initScriptBlocks(context, true);
            if (result) {
                vscode.window.showInformationMessage(
                    DefaultText.CACHE_RESET
                );
            } else {
                vscode.window.showWarningMessage(
                    DefaultText.CACHE_RESET_FAILED
                );
            }
        }
    )

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
            if (document.languageId === EXTENSION_LANGUAGE) {
                diagnosticProvider.updateDiagnostics(document);
            }
        }),
        
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.languageId === EXTENSION_LANGUAGE) {
                diagnosticProvider.updateDiagnostics(event.document);
            }
        }),

        vscode.languages.registerCompletionItemProvider(
            EXTENSION_LANGUAGE,
            new PZCompletionItemProvider(),
            ".",
            " ",
            "\t" // Déclencheurs de complétion
        ),

        // handle mouse hover words
        vscode.languages.registerHoverProvider(
            EXTENSION_LANGUAGE,
            new PZHoverProvider()
        ),
        
        // format document with right click > Format document
        vscode.languages.registerDocumentFormattingEditProvider(EXTENSION_LANGUAGE, {
            provideDocumentFormattingEdits,
        }),
        
        // apparently used when ctrl + click something
        vscode.languages.registerDefinitionProvider(EXTENSION_LANGUAGE, {
            provideDefinition,
        })
    );
}

export function deactivate() {
    console.debug('Extension "pz-syntax-extension" is now deactivated.');
}
