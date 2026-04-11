import * as vscode from 'vscode';
import { ScriptBlock, DocumentBlock } from "./scriptsBlocks";
import { 
    ThemeColorType, 
    DiagnosticType, 
    DefaultText, 
    WIKI_LINK,
    formatText,
    formatList
} from '../models/enums';
import { diagnostic } from '../providers/diagnostic';
import { registerActionTextReplace } from '../providers/actions';
import { 
    DeprecatedInfo,
    ScriptBlockParameter, 
    ScriptBlockValue, 
    VALUE_TYPES
} from './scriptsBlocksData';
import { getScriptBlockData, getMainVariant } from "./scriptsBlocksUtility";
import { color } from "../utils/themeColors";
import { IndexRange } from '../utils/positions'; 

export class ScriptParameter {
// MEMBERS
    // extra
    document: vscode.TextDocument;
    diagnostics: vscode.Diagnostic[] | undefined;
    actions: vscode.CodeAction[] = [];
    
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
        diagnostics: vscode.Diagnostic[] | undefined,
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
        const depr = this.getDeprecated();
        let parameter = color(this.parameter, this.colorCode);

        if (depr) {
            parameter = "~~" + parameter + "~~";
            const replacement = depr.replacedBy ? "**" + color(depr.replacedBy, ThemeColorType.PARAMETER) + "**" : null;
            if (replacement) {
                parameter += ` ${replacement}`;
            }
        } else {
            parameter = "**" + parameter + "**";
        }

        const parameterData = this.getParameterData();
        if (parameterData) {
            const type = parameterData.type
            if (type) {
                const operator = `${color(":", ThemeColorType.OPERATOR)}`;
                const typeColored = `${color(type, ThemeColorType.TYPE)}`;
                parameter += ` ${operator} ${typeColored}`;
            }
            const defaultValue = parameterData.default;
            if (defaultValue) {
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

    public getBlockTypeOfValue(): [string | null, string] | null {
        const value = this.value;

        let module: string;
        let block: string;

        // split by . to separate module and block
        const parts = value.split(".");
        if (parts.length === 2) {
            [module, block] = parts;
            return [module, block];
        } else if (parts.length === 1) {
            block = parts[0];

            // verify it's not an empty value
            if (block === "") {
                return null;
            }
            return [null, block];
        }
        
        // if we reach here, it means there's no value provided and the split did nothing
        return null;
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

    public getDeprecated(): DeprecatedInfo | null {
        const parameterData = this.getParameterData();
        if (parameterData) {
            return parameterData.deprecated || null;
        }
        return null;
    }

    public getDeprecatedInformation(deprecatedInfo: DeprecatedInfo): string {
        const replacement = deprecatedInfo.replacedBy
        const description = deprecatedInfo.description;
        const version = deprecatedInfo.version;
        
        // format deprecation based on available information
        let txt = "";
        if (replacement && version) {
            txt = formatText(DefaultText.DEPRECATION_REPLACEMENT_VERSION, { replacement, version });
        } else if (replacement) {
            txt = formatText(DefaultText.DEPRECATION_REPLACEMENT, { replacement });
        } else if (version) {
            txt = formatText(DefaultText.DEPRECATION_VERSION, { version });
        } else {
            txt = "This parameter is deprecated.";
        }

        // add description if provided
        if (description) {
            txt += " " + description;
        }
        return txt;
    }

    /**
     * Considers that the value are simply a list, and if no value is present then it returns null.
     * This is used in combination with the accepted values list to verify if the provided value/values are correct.
     */
    public getValues(): ScriptBlockValue[] | null {
        const parameterData = this.getParameterData();
        const type = this.getTypeOfValue();

        // handle array case
        if (type === VALUE_TYPES.ARRAY) {
            const separator = parameterData?.separator || ";";
            const values = this.value.split(separator).map(v => v.trim());
            return values;

        // simple value case
        } else if (this.value !== "") {
            return [this.value];
        }
        return null;
    }

    /**
     * This function is used to retrieve the values of the parameter-value pair that are invalid. 
    */
    public getForbiddenValues(): ScriptBlockValue[] {
        const values: ScriptBlockValue[] = this.getValues() || [];
        const parameterData = this.getParameterData();
        if (parameterData && parameterData.values) {
            const acceptedValues = parameterData.values;
            const forbiddenValues = values.filter(value => !acceptedValues.includes(value));
            return forbiddenValues;
        }
        return values;
    }

    /**
     * Verifies if the provided value is a valid value.
     */
    public isAcceptedValue(value: string): boolean {
        const parameterData = this.getParameterData();
        if (parameterData && parameterData.values) {
            const acceptedValues = parameterData.values;
            return acceptedValues.includes(value);
        }
        return false;
    }


// CHECKERS

    /**
     * This function will validate the parameter-value pair by verifying different conditions.
     * If something is wrong, it adds a diagnostic and, if possible, a quick fix to solve the issue.
     */
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
        const depr = this.getDeprecated();
        if (depr) {
            const txt = this.getDeprecatedInformation(depr);
            const diagnosticOutput = this.diagnostic(
                txt,
                {},
                this.parameterRange.start, this.parameterRange.end,
                vscode.DiagnosticSeverity.Warning
            );

            // provide deprecation replacement fix if available
            if (diagnosticOutput && depr.replacedBy) {
                const fix = registerActionTextReplace(
                    this.document,
                    new vscode.Range(
                        this.document.positionAt(this.parameterRange.start),
                        this.document.positionAt(this.parameterRange.end)
                    ),
                    depr.replacedBy,
                    `Replace deprecated parameter '${name}' with '${depr.replacedBy}'`
                );
                this.registerFix(fix, diagnosticOutput, new vscode.Range(
                    this.document.positionAt(this.parameterRange.start),
                    this.document.positionAt(this.valueRange.end)
                ));
            }
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
        const forbiddenValues = this.getForbiddenValues();
        if (forbiddenValues.length > 0) {
            const parameterData = this.getParameterData();
            const values = parameterData?.values;
            if (values) {
                if (this.diagnostic(
                    DiagnosticType.WRONG_VALUES,
                    {
                        invalidValues: formatList(forbiddenValues),
                        parameter: name, 
                        validValues: formatList(values) 
                    },
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
                const diagnostic = this.diagnostic(
                    DiagnosticType.MISSING_COMMA,
                    {},
                    this.parameterRange.start,
                    this.valueRange.end
                );

                // provide quick fix by replacing the value with the value + comma
                if (diagnostic) {
                    const fix = registerActionTextReplace(
                        this.document,
                        new vscode.Range(
                            this.document.positionAt(this.valueRange.start),
                            this.document.positionAt(this.valueRange.end)
                        ),
                        this.value + ",",
                        `Add missing comma for parameter-value pair`
                    );
                    this.registerFix(fix, diagnostic, new vscode.Range(
                        this.document.positionAt(this.parameterRange.start),
                        this.document.positionAt(this.valueRange.end)
                    ));
                    return false;
                }
            } 
            if (this.comma !== ",") {
                const diagnostic = this.diagnostic(
                    DiagnosticType.INVALID_COMMA,
                    {},
                    this.parameterRange.start,
                    this.valueRange.end + this.comma.length
                );
                if (diagnostic) {
                    // provide quick fix by replacing the invalid comma with a correct one
                    const fix = registerActionTextReplace(
                        this.document,
                        new vscode.Range(
                            this.document.positionAt(this.valueRange.end),
                            this.document.positionAt(this.valueRange.end + this.comma.length)
                        ),
                        ",",
                        `Replace invalid comma with a correct one`
                    );
                    this.registerFix(fix, diagnostic, new vscode.Range(
                        this.document.positionAt(this.parameterRange.start),
                        this.document.positionAt(this.valueRange.end + this.comma.length)
                    ));
                    return false;
                }
            }
        }

        // verify the type
        const parameterData = this.getParameterData();
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

    public validateLater(): boolean {
        const parameterData = this.getParameterData();

        // verify the block reference if any
        // this needs to be ran after all blocks from libs have been
        if (parameterData && parameterData.blockType) {
            // try to access to the module and block from the value
            const blockTypeOfValue = this.getBlockTypeOfValue();
            if (!blockTypeOfValue) {
                this.diagnostic(
                    DiagnosticType.NO_BLOCK_REF,
                    { value: this.value, parameter: this.parameter },
                    this.valueRange.start,
                    this.valueRange.end,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }
            const blockType = parameterData.blockType;
            const canFullType = blockType.fullType;
            
            let [module, block] = blockTypeOfValue;

            // if full type is not allowed, then module should be null
            // this usually means the game considers it as Base by default
            if (!canFullType && module !== null) {
                this.diagnostic(
                    DiagnosticType.CANNOT_PROVIDE_MODULE,
                    { parameter: this.parameter },
                    this.valueRange.start,
                    this.valueRange.end,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }

            if (block === "") {
                this.diagnostic(
                    DiagnosticType.NO_BLOCK_REF,
                    { value: this.value, parameter: this.parameter },
                    this.valueRange.start,
                    this.valueRange.end,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }

            // set default module to Base if not provided
            module = module || "Base";

            const expectedBlock = blockType.block;
            const refBlock = DocumentBlock.findBlockFromFullType(expectedBlock, [module, block]);
            if (!refBlock) {
                console.debug('')
            }
        }

        // validate dependent parameters based on 'needs' property
        if (parameterData && parameterData.needs) {
            const needs = parameterData.needs;
            for (const need of needs) {
                const name = need.name;
                if (!name) { continue; }

                // verify the block has the dependent parameter
                const dependentParameter = this.parent.getParameter(name);
                if (!dependentParameter) {
                    this.diagnostic(
                        DiagnosticType.MISSING_DEPENDENT_PARAMETER,
                        { 
                            parameter: name, 
                            scriptBlock: this.parent.scriptBlock,
                            dependentParameter: name
                        },
                        this.parameterRange.start,
                        this.valueRange.end,
                        vscode.DiagnosticSeverity.Error
                    );
                } else {
                    const values = need.values;
                    const valueToType = need.valueToType;

                    // check if the dependent parameter needs a specific value
                    if (values) {
                        // make sure the value of the dependent parameter is among the accepted values
                        if (!values.includes(dependentParameter.value)) {
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
                        }
                    } 

                    // the parameter can be of different type based on the value of the dependent parameter
                    if (valueToType) {
                        // verify the type of the parameter based on the value of the dependent parameter
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

        return true;
    }



// DIAGNOSTICS HELPERS

    public setAsDuplicate(): void {
        if (!this.isDuplicate && !this.canBeDuplicate()) {
            this.isDuplicate = true;
            this.diagnosticDuplicate();
        }
    }

    private diagnosticDuplicate(): vscode.Diagnostic | false {
        return this.diagnostic(
            DiagnosticType.DUPLICATE_PARAMETER,
            { parameter: this.parameter, scriptBlock: this.parent.scriptBlock },
            this.parameterRange.start,
            this.parameterRange.end,
            vscode.DiagnosticSeverity.Warning
        );
    }

    private diagnostic(
        type: DiagnosticType | string,
        params: Record<string, string>,
        index_start: number,index_end?: number,
        severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
    ): vscode.Diagnostic | false {
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

    private registerFix(
        fix: vscode.CodeAction, diagnostic: vscode.Diagnostic, range: vscode.Range
    ): void {
        const documentBlock = DocumentBlock.getDocumentBlock(this.document);
        documentBlock?.addAction(range, diagnostic, fix);
    }
}
