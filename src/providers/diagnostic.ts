import * as vscode from "vscode";
import { VALID_KEYWORDS, isScriptBlock } from "../models/scriptData";
import {
    itemBlockRegex,
    itemPropertiesRegex,
    fixingBlockRegex,
    fixingPropertiesRegex,
    craftRecipeBlockRegex,
    craftRecipePropertiesRegex,
    inputsOutputsBlockRegex,
    itemMapperBlockRegex,
    itemMapperEntriesRegex,
    inputsOutputsEntriesRegex,
    componentBlockRegex,
    componentPropertiesRegex,
    fluidsPropertiesRegex,
    fluidsBlockRegex
} from '../models/regexPatterns';
import { DocumentBlock } from "../utils/scriptBlocks";


export class DiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection("pz-scripts");
    }
    
    public updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        
        const documentBlock = new DocumentBlock(document, diagnostics);
        
        this.diagnosticCollection.set(document.uri, diagnostics);
        
        
        return;
        
        // const diagnostics: vscode.Diagnostic[] = [];
        const content = document.getText();
        
        // Validation des blocs item
        const itemBlocks = Array.from(content.matchAll(itemBlockRegex));
        itemBlocks.forEach(match => {
            this.validateItemBlock(match, document, diagnostics);
        });
        
        // Validation des blocs craftRecipe
        const craftBlocks = Array.from(content.matchAll(craftRecipeBlockRegex));
        craftBlocks.forEach(match => {
            this.validateCraftRecipeBlock(match, document, diagnostics);
        });
        
        // Validation des blocs fixing
        const fixingBlocks = Array.from(content.matchAll(fixingBlockRegex));
        fixingBlocks.forEach(match => {
            this.validateFixingBlock(match, document, diagnostics);
        });
        
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    
    
    
    private validateItemBlock(match: RegExpMatchArray, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const blockContent = match[2];
        const itemStart = match.index!;
        const cleanedContent = blockContent.replace(/component\s+\w+\s*\{[\s\S]*?\}/g, '');
        
        // Validation des propriétés de l'item
        const properties = Array.from(cleanedContent.matchAll(itemPropertiesRegex));
        properties.forEach(prop => {
            const propName = prop[1];
            const hasComma = prop[3].trim().startsWith(',');
            
            // Validation du mot-clé
            if (!this.isValidKeyword(propName, 'item')) {
                const propStart = document.positionAt(itemStart + match[0].indexOf(prop[1]));
                const range = new vscode.Range(
                    propStart,
                    propStart.translate(0, propName.length)
                );
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Unknown keyword: ${propName} in item block`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Validation de la virgule
            if (!hasComma) {
                const valueEnd = document.positionAt(itemStart + match[0].indexOf(prop[0]) + prop[0].length);
                const range = new vscode.Range(
                    valueEnd.translate(0, -1),
                    valueEnd
                );
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Missing comma after value in item block`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
        });
        
        // Validation des sous-blocs (component, Fluids, etc.)
        this.validateComponents(blockContent, itemStart, document, diagnostics);
    }
    
    private validateCraftRecipeBlock(match: RegExpMatchArray, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const blockContent = match[2];
        const craftRecipeStart = match.index!;
        
        console.debug('Validating craftRecipe block: ', match);
        
        // Validation of main craftRecipe properties
        const properties = Array.from(blockContent.matchAll(craftRecipePropertiesRegex));
        console.debug('CraftRecipe properties found: ', properties);
        properties.forEach(prop => {
            const propName = prop[1];
            const hasComma = prop[3].trim().startsWith(',');
            
            // Validation of the keyword
            if (!this.isValidKeyword(propName, 'craftRecipe')) {
                const propStart = document.positionAt(craftRecipeStart + match[0].indexOf(prop[0]));
                const range = new vscode.Range(
                    propStart,
                    propStart.translate(0, propName.length)
                );
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Unknown keyword: ${propName} in craftRecipe block`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Validation de la virgule
            if (!hasComma) {
                const valueEnd = document.positionAt(craftRecipeStart + match[0].indexOf(prop[0]) + prop[0].length);
                const range = new vscode.Range(
                    valueEnd.translate(0, -1),
                    valueEnd
                );
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Missing comma after value in craftRecipe block`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
        });
        
        // Validation des sous-blocs inputs/outputs
        const inputsOutputs = Array.from(blockContent.matchAll(inputsOutputsBlockRegex));
        inputsOutputs.forEach(ioBlock => {
            const ioContent = ioBlock[2];
            const entries = Array.from(ioContent.matchAll(inputsOutputsEntriesRegex));
            entries.forEach(entry => {
                // Validation spécifique pour les entrées inputs/outputs
                this.validateInputOutputEntry(entry, document, craftRecipeStart + match[0].indexOf(entry[0]), diagnostics);
            });
        });
        
        // Validation des mappers
        const itemMappers = Array.from(blockContent.matchAll(itemMapperBlockRegex));
        itemMappers.forEach(mapperBlock => {
            const mapperContent = mapperBlock[2];
            const entries = Array.from(mapperContent.matchAll(itemMapperEntriesRegex));
            entries.forEach(entry => {
                // Validation spécifique pour les entrées itemMapper
                this.validateMapperEntry(entry, document, craftRecipeStart + match[0].indexOf(entry[0]), diagnostics);
            });
        });
    }
    
    private validateFixingBlock(match: RegExpMatchArray, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const blockContent = match[2];
        const fixingStart = match.index!;
        
        // Validation des propriétés dans le bloc fixing
        const properties = Array.from(blockContent.matchAll(fixingPropertiesRegex));
        properties.forEach(prop => {
            const propName = prop[1];
            const hasComma = prop[3].trim().startsWith(',');
            
            // Validation du mot-clé
            if (!this.isValidKeyword(propName, 'fixing')) {
                const propStart = document.positionAt(fixingStart + match[0].indexOf(propName));
                const range = new vscode.Range(
                    propStart,
                    propStart.translate(0, propName.length)
                );
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Unknown keyword: ${propName} in fixing block`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            // Validation de la virgule
            if (!hasComma) {
                const valueEnd = document.positionAt(fixingStart + match[0].indexOf(prop[0]) + prop[0].length);
                const range = new vscode.Range(
                    valueEnd.translate(0, -1),
                    valueEnd
                );
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Missing comma after value in fixing block`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
        });
    }
    
    private isValidKeyword(word: string, block: string): boolean {
        if (/^[{},\[\]"0-9]+$/.test(word) || word.includes('"')) {
            return true;
        }
        
        if (isScriptBlock(word)) {
            return true;
        }
        
        if (word.startsWith("Base.") || word.includes("tags[")) {
            return true;
        }
        
        const keywords = VALID_KEYWORDS[block as keyof typeof VALID_KEYWORDS];
        return keywords ? keywords.some(k => k.toLowerCase() === word.toLowerCase()) : true;
    }
    
    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
    
    private validateComponents(blockContent: string, blockStart: number, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        // Validation des blocs component
        const components = Array.from(blockContent.matchAll(componentBlockRegex));
        components.forEach(componentBlock => {
            const componentName = componentBlock[1]; // Capture du nom du component
            const componentContent = componentBlock[2]; // Contenu du component
            const componentStart = blockStart + blockContent.indexOf(componentBlock[0]);
            
            const withoutBraces = componentContent.replace(/\{[^}]*\}/g, '');
            
            // Validation des propriétés du component
            const componentEntries = Array.from(withoutBraces.matchAll(componentPropertiesRegex));
            componentEntries.forEach(entry => {
                const propName = entry[1];
                if (!this.isValidKeyword(propName, `component.${componentName}`)) {
                    const propStart = document.positionAt(componentStart + componentContent.indexOf(entry[0]));
                    const range = new vscode.Range(
                        propStart,
                        propStart.translate(0, propName.length)
                    );
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Unknown keyword: ${propName} in component block`,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            });
            
            // Validation des blocs Fluids
            const fluidsBlocks = Array.from(componentContent.matchAll(fluidsBlockRegex));
            fluidsBlocks.forEach(fluidsBlock => {
                const fluidsContent = fluidsBlock[1];
                const fluidsStart = componentStart + componentContent.indexOf(fluidsBlock[0]);
                
                const entries = Array.from(fluidsContent.matchAll(fluidsPropertiesRegex));
                entries.forEach(entry => {
                    const propName = entry[1];
                    if (!this.isValidKeyword(propName, 'Fluids')) {
                        const propStart = document.positionAt(fluidsStart + fluidsContent.indexOf(entry[0]));
                        const range = new vscode.Range(
                            propStart,
                            propStart.translate(0, propName.length)
                        );
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Unknown keyword: ${propName} in Fluids block`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                });
            });
        });
    }
    
    private validateMapperEntry(entry: RegExpMatchArray, document: vscode.TextDocument, startOffset: number, diagnostics: vscode.Diagnostic[]): void {
        const propName = entry[1];
        if (!this.isValidKeyword(propName, 'itemMapper')) {
            const propStart = document.positionAt(startOffset);
            const range = new vscode.Range(
                propStart,
                propStart.translate(0, propName.length)
            );
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Unknown keyword: ${propName} in itemMapper`,
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }
    
    private validateInputOutputEntry(entry: RegExpMatchArray, document: vscode.TextDocument, startOffset: number, diagnostics: vscode.Diagnostic[]): void {
        const propName = entry[1];
        if (!this.isValidKeyword(propName, 'inputsOutputs')) {
            const propStart = document.positionAt(startOffset);
            const range = new vscode.Range(
                propStart,
                propStart.translate(0, propName.length)
            );
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Unknown keyword: ${propName} in inputs/outputs`,
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }
    
}
