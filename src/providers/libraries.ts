import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { DiagnosticProvider } from './diagnostic';


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
            
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                diagnosticProvider.updateDiagnostics(document);
                // console.debug(`Loaded library file: ${file.fsPath}`);
            }
        } catch (error) {
            console.error(`Error with directory ${dir}:`, error);
        }
        console.debug(`Finished loading libraries from directory: ${dir}`);
    }
}