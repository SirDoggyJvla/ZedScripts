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

// import { SCRIPT_FILE_REGEX } from "./models/regexPatterns";
import { LANGUAGE_FILE_REGEX } from "./models/regexPatterns"; // DEPRECATED

import { testForScriptRootFile } from "./scriptsBlocks/scriptsBlocksData";

function handleOpenTextDocument(document: vscode.TextDocument) {
    // console.debug(`Handling opened document: ${document.fileName} with languageId: ${document.languageId}`);
    if (
        document.languageId === LANG_ZEDSCRIPTS
        || document.languageId === LANG_TRANSLATIONSCRIPTS
    ) { return; }

    const filePath = path.posix.normalize(document.fileName);

    if (testForScriptRootFile(filePath)) {
        // console.debug(`The opened file is identified as a script file: `, filePath);
        
        // set the file to ZedScripts
        vscode.languages.setTextDocumentLanguage(document, LANG_ZEDSCRIPTS);

    // DEPRECATED
    } else if (LANGUAGE_FILE_REGEX.test(filePath)) {
        // console.debug(`The opened file is identified as a translation file: `, filePath);
        
        // set the file to TranslationScripts
        vscode.languages.setTextDocumentLanguage(document, LANG_TRANSLATIONSCRIPTS);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.debug('Activating extension "pz-syntax-extension"...');

    const activeEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
        // console.debug(`Active editor changed: ${editor?.document.fileName}`);
        if (!editor) { return; }
        handleOpenTextDocument(editor.document);
    });

    const openDocumentDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
        // console.debug(`Document opened: ${document.fileName}`);
        handleOpenTextDocument(document);
    });

    // handle the initially active document on startup
    if (vscode.window.activeTextEditor) {
        // console.debug(`Active editor found on startup: ${vscode.window.activeTextEditor.document.fileName}`);
        handleOpenTextDocument(vscode.window.activeTextEditor.document);
    }

    // try to fetch the latest scriptBlocks.json from the GitHub repository
    await fetchData(context);


    // add a force reset cache function
    const resetScriptCacheCommand = vscode.commands.registerCommand(
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


    const diagnosticProvider = new DiagnosticProvider();
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.txt");
    watcher.onDidChange((uri) => {
        itemCache.clearForFile(uri.fsPath);
        console.debug(`Invalidated cache for : ${uri.fsPath}`);
    });
    
    watcher.onDidDelete((uri) => {
        itemCache.clearForFile(uri.fsPath);
        console.debug(`Invalidated cache for : ${uri.fsPath}`);
    });
    if (vscode.window.activeTextEditor) {
        diagnosticProvider.updateDiagnostics(
            vscode.window.activeTextEditor.document
        );
    }
    
    context.subscriptions.push(
        activeEditorChangeDisposable,
        openDocumentDisposable,
        resetScriptCacheCommand,
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

    console.log('Extension "pz-syntax-extension" is now active!');
}

export function deactivate() {
    console.debug('Extension "pz-syntax-extension" is now deactivated.');
}
