import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { DiagnosticProvider } from './diagnostic';
import { DocumentBlock } from '../scriptsBlocks/scriptsBlocks';
import { LANG_ZEDSCRIPTS, LANG_TRANSLATIONSCRIPTS } from '../models/enums';
import { LANGUAGE_FILE_REGEX } from '../models/regexPatterns';
import { testForScriptRootFile } from '../scriptsBlocks/scriptsBlocksData';


export function handleOpenTextDocument(document: vscode.TextDocument): Thenable<vscode.TextDocument> | vscode.TextDocument {
    // console.debug(`Handling opened document: ${document.fileName} with languageId: ${document.languageId}`);
    if (
        document.languageId === LANG_ZEDSCRIPTS
        || document.languageId === LANG_TRANSLATIONSCRIPTS
    ) { return document; }

    const filePath = path.posix.normalize(document.fileName);

    if (testForScriptRootFile(filePath)) {
        // console.debug(`The opened file is identified as a script file: `, filePath);
        
        // set the file to ZedScripts
        return vscode.languages.setTextDocumentLanguage(document, LANG_ZEDSCRIPTS);

    // DEPRECATED
    } else if (LANGUAGE_FILE_REGEX.test(filePath)) {
        // console.debug(`The opened file is identified as a translation file: `, filePath);
        
        // set the file to TranslationScripts
        return vscode.languages.setTextDocumentLanguage(document, LANG_TRANSLATIONSCRIPTS);
    }
    return document;
}

export async function loadLibraries(diagnosticProvider: DiagnosticProvider): Promise<void> {
    console.debug("Loading libraries...");

    const config = vscode.workspace.getConfiguration("ZedScripts");
    const searchDirectories: string[] = config.get("searchDirectories", []);

    // filter by verifying the directory exists and is accessible
    const validDirs: string[] = searchDirectories.filter(dir => {
        const normalizedDir = path.normalize(dir);
        try {
            if (!fs.existsSync(normalizedDir)) {
                console.warn(`Directory does not exist: ${normalizedDir}`);
                return false;
            }
            if (!fs.statSync(normalizedDir).isDirectory()) {
                console.warn(`Path is not a directory: ${normalizedDir}`);
                return false;
            }
            return true;
        } catch {
            console.warn(`Directory does not exist or is not accessible: ${normalizedDir}`);
            return false;
        }
    });
    if (validDirs.length === 0) { return }

    // parse libraries
    for (const dir of validDirs) {
        try {
            // find all .txt files in the directory and subdirectories
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(dir, "**/*.txt")
            );
            
            // parse each file
            let i = 0;
            let lastR = 0;
            const totalFiles = files.length;
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                // handleOpenTextDocument(document);
                const result = handleOpenTextDocument(document);
                const resolvedDocument = result instanceof Promise ? await result : result;
                try {
                    diagnosticProvider.updateDiagnostics(resolvedDocument);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
                    console.error(
                        `Error updating diagnostics for file ${file.fsPath}:\n` +
                        `Message: ${errorMessage}\n` +
                        `Stack: ${errorStack}`
                    );
                }
                // console.debug(`Loaded library file: ${file.fsPath}`);
                i++;
                const r = Math.round((i / totalFiles) * 100);
                if (r > lastR+10) {
                    console.debug(`${r}%`);
                    lastR = r;
                }
            }
        } catch (error) {
            console.error(`Error with directory ${dir}:`, error);
        }
        console.debug(`Finished loading libraries from directory: ${dir}`);
    }

    // run validate later for all docs that were just updated
    DocumentBlock.validateLaterDocuments();
}