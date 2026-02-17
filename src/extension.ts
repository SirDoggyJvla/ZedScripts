import * as vscode from "vscode";
import * as path from "path";
import { DiagnosticProvider } from "./providers/diagnostic";
import { provideDefinition } from "./providers/definition";
import { provideDocumentFormattingEdits } from "./providers/editing";
import { PZCompletionItemProvider } from "./providers/completion";
import { PZHoverProvider } from "./providers/hover";
import { itemCache } from "./providers/cache";
import { fetchData } from "./utils/fetchData";
import { DefaultText, LANG_ZEDSCRIPTS, LANG_TRANSLATIONSCRIPTS } from "./models/enums";

import { SCRIPT_FILE_REGEX } from "./models/regexPatterns";
import { LANGUAGE_FILE_REGEX } from "./models/regexPatterns";

function handleOpenTextDocument(editor: vscode.TextEditor) {
    if (!editor || editor.document.languageId === LANG_ZEDSCRIPTS) { return; }
    const document = editor.document;
    const filePath = path.posix.normalize(document.fileName);

    if (SCRIPT_FILE_REGEX.test(filePath)) {
        console.debug(`The opened file is identified as a script file: `, filePath);
        
        // set the file to ZedScripts
        vscode.languages.setTextDocumentLanguage(document, LANG_ZEDSCRIPTS);
    } else if (LANGUAGE_FILE_REGEX.test(filePath)) {
        console.debug(`The opened file is identified as a translation file: `, filePath);
        
        // set the file to TranslationScripts
        vscode.languages.setTextDocumentLanguage(document, LANG_TRANSLATIONSCRIPTS);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // handle the initially active document on startup
    if (vscode.window.activeTextEditor) {
        const editor = vscode.window.activeTextEditor;
        // if (
        //     !editor 
        //     || editor.document.languageId === LANG_ZEDSCRIPTS
        //     || editor.document.languageId === LANG_TRANSLATIONSCRIPTS
        // ) { return; }
        handleOpenTextDocument(editor);
    }

    // handle newly opened documents
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (
            !editor 
            // || editor.document.languageId === LANG_ZEDSCRIPTS
            // || editor.document.languageId === LANG_TRANSLATIONSCRIPTS
        ) { return; }
        handleOpenTextDocument(editor);
    });

    // try to fetch the latest scriptBlocks.json from the GitHub repository
    await fetchData(context);


    // add a force reset cache function
    vscode.commands.registerCommand(
        "ZedScripts.resetScriptCache",
        async () => {
            const result = await fetchData(context, true);
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

        // diagnostics
        vscode.workspace.onDidOpenTextDocument((document) => {
            diagnosticProvider.updateDiagnostics(document);
        }),
        vscode.workspace.onDidChangeTextDocument((event) => {
            diagnosticProvider.updateDiagnostics(event.document);
        }),


        // extra handlers
        vscode.languages.registerCompletionItemProvider(
            LANG_ZEDSCRIPTS,
            new PZCompletionItemProvider(),
            ".",
            " ",
            "\t" // Déclencheurs de complétion
        ),

        // handle mouse hover words
        vscode.languages.registerHoverProvider(
            LANG_ZEDSCRIPTS,
            new PZHoverProvider()
        ),
        
        // format document with right click > Format document
        vscode.languages.registerDocumentFormattingEditProvider(
            LANG_ZEDSCRIPTS, 
            {provideDocumentFormattingEdits,}
        ),
        
        // apparently used when ctrl + click something
        vscode.languages.registerDefinitionProvider(LANG_ZEDSCRIPTS, {
            provideDefinition,
        })
    );
}

export function deactivate() {
    console.debug('Extension "pz-syntax-extension" is now deactivated.');
}
