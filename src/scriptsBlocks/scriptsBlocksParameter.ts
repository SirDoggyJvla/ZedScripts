import * as vscode from 'vscode';
import { ScriptBlock } from "./scriptsBlocks";
import { 
    ThemeColorType, 
    DiagnosticType, 
    DefaultText, 
    WIKI_LINK,
    formatText,
    formatList
} from '../models/enums';
import { diagnostic } from '../providers/diagnostic';
import { 
    ScriptBlockParameter, 
    VALUE_TYPES
} from './scriptsBlocksData';
import { getScriptBlockData, getMainVariant } from "./scriptsBlocksUtility";
import { color } from "../utils/themeColors";
import { IndexRange } from '../utils/positions';

export class ScriptParameter {
// MEMBERS
    // extra
    document: vscode.TextDocument;
    diagnostics: vscode.Diagnostic[];
    
    // param data
    parent: ScriptBlock;
    parameter: string;
    value: string;
    comma: string;
    isDuplicate: boolean;

    // positions
    parameterRange: IndexRange;
    valueRange: IndexRange;

    colorCode: ThemeColorType = ThemeColorType.PARAMETER;

// CONSTRUCTOR
    constructor(
        document: vscode.TextDocument,
        parent: ScriptBlock,
        diagnostics: vscode.Diagnostic[],
        name: string,
        value: string,
        parameterRange: IndexRange,
        valueRange: IndexRange,
        comma: string,
        isDuplicate: boolean
    ) {
        this.document = document;
        this.parent = parent;
        this.diagnostics = diagnostics;

        this.parameter = name;
        this.value = value;
        this.comma = comma;
        this.isDuplicate = isDuplicate;

        this.parameterRange = parameterRange;
        this.valueRange = valueRange;
    
        this.validateParameter();

        // this.highlightPositions();
    }

    private getLineEnd(): number {
        const line = this.document.positionAt(this.valueRange.end).line;
        const lineEndPosition = this.document.lineAt(line).range.end;
        return this.document.offsetAt(lineEndPosition);
    }

// INFORMATION

    private getTree(): string {
        let parameter = "**" + color(this.parameter, this.colorCode) + "**";
        const parameterData = this.getParameterData();
        if (parameterData) {
            const type = parameterData.type
            if (type) {
                const operator = `${color(":", ThemeColorType.OPERATOR)}`;
                const typeColored = `${color(type, ThemeColorType.TYPE)}`;
                parameter += ` ${operator} ${typeColored}`;
            }
            const defaultValue = parameterData.default;
            if (defaultValue !== undefined) {
                const operator = `${color("=", ThemeColorType.OPERATOR)}`;
                let text;
                if (type) {
                    let colorType = ThemeColorType.STRING;
                    // determine color based on type
                    switch (type) {
                        case "int":
                        case "float":
                            text = color(String(defaultValue), ThemeColorType.NUMBER);
                            break;
                        case "boolean":
                            text = color(String(defaultValue), ThemeColorType.BOOLEAN);
                            break;
                        case "array":
                            // color array elements first
                            if (Array.isArray(defaultValue) && defaultValue.length > 1) {
                                const coloredElements = (defaultValue as string[]).map(elem => color(elem, ThemeColorType.STRING));
                                text = formatList(coloredElements, "; ");
                            }
                            break;
                    }
                    text = text || color(String(defaultValue), colorType);
                
                // default color as string if no type provided
                } else {
                    text = color(String(defaultValue), ThemeColorType.STRING)
                }
                const defaultValueColored = `${text}`;
                parameter += ` ${operator} ${defaultValueColored}`;
            }
        }
        const parents = this.parent.getTree(true);
        return parents + " → " + parameter;
    }

    protected getWikiPage(): string {
        const mainVariant = getMainVariant(this.parent.scriptBlock);
        return WIKI_LINK + this.parameter + '_(' + mainVariant.replace(' ', '_') + '_parameter)';
    }

    protected getScriptsDocPage(): string {
        return this.parent.getScriptsDocPage();
    }

    public getHoverText(): vscode.MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true; // needed for html rendering

        // retrieve tree and description
        const tree = this.getTree();
        const desc = this.getDescription();

        // assemble the hover content
        markdown.appendMarkdown(`${tree}  \n`);

        // show description only if that's a valid parameter
        if (this.parent.canHaveParameter(this.parameter)) {
            markdown.appendMarkdown('\n\n---\n\n');
            markdown.appendMarkdown(desc);
            markdown.appendMarkdown('\n\n' + formatText(
                DefaultText.MORE_INFORMATION, 
                { 
                    wikiPage: this.getWikiPage(),
                    scriptsDoc: this.getScriptsDocPage()
                }
            ));
        }
        
        return markdown;
    }


// DATA

    public getParameterData(): ScriptBlockParameter | null {
        const blockData = getScriptBlockData(this.parent.scriptBlock);
        const parameters = blockData.parameters;
        const name = this.parameter;
        const lowerName = name.toLowerCase();

        if (parameters) {
            const parameterData = parameters[lowerName];
            if (parameterData) {
                return parameterData;
            }
        }
        
        return null;
    }

    public getDescription(): string {
        const parameterData = this.getParameterData();
        return parameterData?.description || DefaultText.PARAMETER_DESCRIPTION;
    }

    public getTypeOfValue(): string {
        const expectedType = this.getParameterData()?.type;

        // I don't know how I feel about that lol 
        // but that's kind of the problem with scripts
        if (expectedType === VALUE_TYPES.ARRAY) {
            return VALUE_TYPES.ARRAY;
        }

        // find the most fitting type
        const value = this.value;
        let type = undefined;

        // check if boolean
        if (value === "true" || value === "false") {
            type = VALUE_TYPES.BOOLEAN;

        // check if number
        } else if (!isNaN(Number(value))) {
            if (value.includes(".")) {
                type = VALUE_TYPES.FLOAT;
            
            // if int, output a float anyway if expected is float
            // done for easier handling of diagnostics later down the line
            } else if (expectedType === VALUE_TYPES.FLOAT) {
                type = VALUE_TYPES.FLOAT;
            } else {
                type = VALUE_TYPES.INT;
            }

        // default to string
        } else {
            type = VALUE_TYPES.STRING;
        }

        return type;
    }

    public canBeDuplicate(): boolean {
        const parameterData = this.getParameterData();
        if (parameterData) {
            return parameterData.allowedDuplicate === true;
        }
        return false;
    }

    public canBeEmpty(): boolean {
        const parameterData = this.getParameterData();
        if (parameterData) {
            return parameterData.canBeEmpty === true;
        }
        return false;
    }

    public isDeprecated(): boolean {
        const parameterData = this.getParameterData();
        if (parameterData) {
            return parameterData.deprecated === true;
        }
        return false;
    }

    public hasAcceptedValue(): boolean {
        const parameterData = this.getParameterData();
        if (parameterData && parameterData.values) {
            const acceptedValues = parameterData.values;
            return acceptedValues.includes(this.value);
        }
        return false;
    }


// CHECKERS

    protected validateParameter(): boolean {
        const name = this.parameter;

        // check if parameter exists in this block
        if (!this.parent.canHaveParameter(name)) {
            this.diagnostic(
                DiagnosticType.UNKNOWN_PARAMETER,
                { parameter: name, scriptBlock: this.parent.scriptBlock },
                this.parameterRange.start,
                this.parameterRange.end,
                vscode.DiagnosticSeverity.Hint
            );
            // return false;
        }

        // verify if parameter is deprecated
        if (this.isDeprecated()) {
            this.diagnostic(
                DiagnosticType.DEPRECATED_PARAMETER,
                { parameter: name, scriptBlock: this.parent.scriptBlock },
                this.parameterRange.start, this.parameterRange.end,
                vscode.DiagnosticSeverity.Warning
            );
        }

        // check for duplicate
        if (this.isDuplicate && !this.canBeDuplicate()) {
            if (this.diagnosticDuplicate()) {
                return false;
            }
        }

        // check if value is missing
        if (this.value === "" && !this.canBeEmpty()) {
            const lineEnd = this.getLineEnd();
            if (this.diagnostic(
                DiagnosticType.MISSING_VALUE,
                { parameter: name },
                this.valueRange.start,
                lineEnd,
                vscode.DiagnosticSeverity.Hint
            )) {
                return false;
            }
        }

        // verify if parameter has accepted value
        if (this.value !== "" && !this.hasAcceptedValue()) {
            const parameterData = this.getParameterData();
            const values = parameterData?.values;
            if (values) {
                if (this.diagnostic(
                    DiagnosticType.WRONG_VALUE,
                    { value: this.value, parameter: name, validValues: formatList(values) },
                    this.valueRange.start,
                    this.valueRange.end
                )) {
                    return false;
                }
            }
        }

        // check if missing comma at the end
        if (this.parent.shouldParameterHaveComma()) {
            if (this.comma === "") {
                if (this.diagnostic(
                    DiagnosticType.MISSING_COMMA,
                    {},
                    this.parameterRange.start,
                    this.valueRange.end
                )) {
                    return false;
                }
            } 
            if (this.comma !== ",") {
                if (this.diagnostic(
                    DiagnosticType.INVALID_COMMA,
                    {},
                    this.parameterRange.start,
                    this.valueRange.end + this.comma.length
                )) {
                    return false;
                }
            }
        }

        // validate dependent parameters based on 'needs' property
        const parameterData = this.getParameterData();
        if (parameterData && parameterData.needs) {
            const needs = parameterData.needs;
            for (const need of needs) {
                const name = need.name;
                
                // verify the block has the dependent parameter
                const dependentParameter = this.parent.getParameter(name);
                if (!dependentParameter) {
                    this.diagnostic(
                        DiagnosticType.MISSING_DEPENDENT_PARAMETER,
                        { parameter: name, scriptBlock: this.parent.scriptBlock },
                        this.parameterRange.start,
                        this.valueRange.end,
                        vscode.DiagnosticSeverity.Error
                    );
                } else {
                    const values = need.values;
                    const valueToType = need.valueToType;

                    // check if the dependent parameter needs a specific value
                    if (values && !values.includes(dependentParameter.value)) {
                        this.diagnostic(
                            DiagnosticType.DEPENDENT_PARAMETER_WRONG_VALUE,
                            { 
                                parameter: name, 
                                dependentParameter: dependentParameter.parameter,
                                scriptBlock: this.parent.scriptBlock, 
                                value: dependentParameter.value, 
                                validValues: formatList(values)
                            },
                            this.parameterRange.start,
                            this.valueRange.end,
                            vscode.DiagnosticSeverity.Error
                        );

                    // the parameter can be of different type based on the value of the dependent parameter
                    } else if (valueToType) {
                        const expectedType = valueToType[dependentParameter.value];
                        const actualType = this.getTypeOfValue();
                        if (expectedType && actualType !== expectedType) {
                            this.diagnostic(
                                DiagnosticType.INVALID_TYPE_FOR_VALUE,
                                {
                                    parameter: this.parameter,
                                    scriptBlock: this.parent.scriptBlock,
                                    value: this.value,
                                    expectedType: expectedType,
                                    type: actualType? actualType : "undefined",
                                },
                                this.parameterRange.start,
                                this.valueRange.end,
                                vscode.DiagnosticSeverity.Error
                            );
                        }
                    }
                }
            }
        }

        // verify the type
        if (parameterData && parameterData.type) {
            const expectedType = parameterData.type;
            const actualType = this.getTypeOfValue();
            const isValidType = actualType === expectedType;
            if (!isValidType) {
                this.diagnostic(
                    DiagnosticType.INVALID_TYPE_FOR_VALUE,
                    {
                        parameter: this.parameter,
                        scriptBlock: this.parent.scriptBlock,
                        value: this.value,
                        expectedType: expectedType,
                        type: actualType,
                    },
                    this.parameterRange.start,
                    this.valueRange.end,
                    vscode.DiagnosticSeverity.Error
                );
            }
        }

        return true;
    }



// DIAGNOSTICS HELPERS

    public setAsDuplicate(): void {
        if (!this.isDuplicate && !this.canBeDuplicate()) {
            this.isDuplicate = true;
            this.diagnosticDuplicate();
        }
    }

    private diagnosticDuplicate(): boolean {
        return this.diagnostic(
            DiagnosticType.DUPLICATE_PARAMETER,
            { parameter: this.parameter, scriptBlock: this.parent.scriptBlock },
            this.parameterRange.start,
            this.parameterRange.end,
            vscode.DiagnosticSeverity.Warning
        );
    }

    private diagnostic(
        type: DiagnosticType,
        params: Record<string, string>,
        index_start: number,index_end?: number,
        severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
    ): boolean {
        return diagnostic(
            this.document,
            this.diagnostics,
            type,
            params,
            index_start,
            index_end,
            severity
        );
    }
}
