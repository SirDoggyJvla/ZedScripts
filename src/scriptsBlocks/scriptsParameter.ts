import * as vscode from 'vscode';
import { MarkdownString, TextDocument, Diagnostic } from "vscode";
import { ScriptBlock } from "./scriptsBlocks";
import { 
    ThemeColorType, 
    DiagnosticType, 
    DefaultText, 
    diagnostic,
    WIKI_LINK,
    formatText
} from '../models/enums';
import { 
    getScriptBlockData, 
    ScriptBlockParameter, 
    IndexRange, 
    InputAnalysisProperty,
    InputParameterData
} from './scriptsData';
import { getColor, getFontStyle } from "../utils/themeColors";
import { colorText } from '../utils/htmlFormat';
import { inputsOutputsRegex } from '../models/regexPatterns';

export class ScriptParameter {
// MEMBERS
    // extra
    document: TextDocument;
    diagnostics: Diagnostic[];
    
    // param data
    parent: ScriptBlock;
    parameter: string;
    value: string;
    comma: string;
    isDuplicate: boolean;

    // positions
    parameterRange: IndexRange;
    valueRange: IndexRange;

// CONSTRUCTOR
    constructor(
        document: TextDocument,
        parent: ScriptBlock,
        diagnostics: Diagnostic[],
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

    private color(txt: string, colorType: ThemeColorType = ThemeColorType.PARAMETER): string {
        const color = getColor(colorType);
        const fontStyle = getFontStyle(colorType);
        return colorText(txt, color, fontStyle);
    }

    private getTree(): string {
        let parameter = "**" + this.color(this.parameter) + "**";
        const parameterData = this.getParameterData();
        if (parameterData) {
            const type = parameterData.type
            if (type) {
                const operator = `${this.color(":", ThemeColorType.OPERATOR)}`;
                const typeColored = `${this.color(type, ThemeColorType.TYPE)}`;
                parameter += ` ${operator} ${typeColored}`;
            }
            const defaultValue = parameterData.default;
            if (defaultValue !== undefined) {
                const operator = `${this.color("=", ThemeColorType.OPERATOR)}`;
                let text;
                if (type) {
                    let colorType = ThemeColorType.STRING;
                    // determine color based on type
                    switch (type) {
                        case "int":
                        case "float":
                            text = this.color(String(defaultValue), ThemeColorType.NUMBER);
                            break;
                        case "boolean":
                            text = this.color(String(defaultValue), ThemeColorType.BOOLEAN);
                            break;
                        case "array":
                            // color array elements first
                            if (Array.isArray(defaultValue) && defaultValue.length > 1) {
                                const coloredElements = (defaultValue as string[]).map(elem => this.color(elem, ThemeColorType.STRING));
                                text = (coloredElements as string[]).join("; ")
                            }
                            break;
                    }
                    text = text || this.color(String(defaultValue), colorType);
                
                // default color as string if no type provided
                } else {
                    text = this.color(String(defaultValue), ThemeColorType.STRING)
                }
                const defaultValueColored = `${text}`;
                parameter += ` ${operator} ${defaultValueColored}`;
            }
        }
        const parents = this.parent.getTree(true);
        return parents + " → " + parameter;
    }

    private getWikiPage(): string {
        return WIKI_LINK + this.parameter + '_(' + this.parent.scriptBlock + '_parameter)';
    }

    public getHoverText(): MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true; // needed for html rendering

        // retrieve tree and description
        const tree = this.getTree();
        const desc = this.getDescription();

        // assemble the hover content
        markdown.appendMarkdown(`${tree}  \n`);
        markdown.appendMarkdown('\n\n---\n\n');
        markdown.appendMarkdown(desc);
        markdown.appendMarkdown('\n\n' + formatText(
            DefaultText.MORE_INFORMATION, 
            { wikiPage: this.getWikiPage() }
        ));
        
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
        return parameterData?.description || DefaultText.SCRIPT_BLOCK_DESCRIPTION;
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
                this.parameterRange.start
            );
        }

        // check for duplicate
        if (this.isDuplicate && !this.canBeDuplicate()) {
            this.diagnosticDuplicate();
            return false;
        }

        // check if value is missing
        if (this.value === "" && !this.canBeEmpty()) {
            const lineEnd = this.getLineEnd();
            this.diagnostic(
                DiagnosticType.MISSING_VALUE,
                { parameter: name },
                this.valueRange.start,
                lineEnd,
                vscode.DiagnosticSeverity.Hint
            );
            return false;
        }

        // verify if parameter has accepted value
        if (this.value !== "" && !this.hasAcceptedValue()) {
            const parameterData = this.getParameterData();
            const values = parameterData?.values;
            if (values) {
                this.diagnostic(
                    DiagnosticType.WRONG_VALUE,
                    { value: this.value, parameter: name, validValues: values.map(p => `'${p}'`).join(", ") },
                    this.valueRange.start,
                    this.valueRange.end
                );
                return false;
            }
        }

        // check if missing comma at the end
        if (this.comma === "") {
            this.diagnostic(
                DiagnosticType.MISSING_COMMA,
                {},
                this.parameterRange.start,
                this.valueRange.end
            );
            return false;
        } else if (this.comma !== ",") {
            this.diagnostic(
                DiagnosticType.INVALID_COMMA,
                {},
                this.parameterRange.start,
                this.valueRange.end + this.comma.length
            );
            return false;
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

    private diagnosticDuplicate(): void {
        this.diagnostic(
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
    ): void {
        diagnostic(
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




export class InputsParameter {
// MEMBERS
    // extra
    document: TextDocument;
    diagnostics: Diagnostic[];
    
    // param data
    parent: ScriptBlock;
    parameter: string;
    values: string;
    comma: string;
    amount: number;

    // positions
    parameterRange: IndexRange;
    amountRange: IndexRange;
    valuesRange: IndexRange;

    properties: Record<string, InputAnalysisProperty> = {};

// CONSTRUCTOR
    constructor(
        document: TextDocument,
        parent: ScriptBlock,
        diagnostics: Diagnostic[],
        parameter: string,
        values: string,
        amount: string,
        parameterRange: IndexRange,
        amountRange: IndexRange,
        valuesRange: IndexRange,
        comma: string,
    ) {
        this.document = document;
        this.parent = parent;
        this.diagnostics = diagnostics;
        
        this.parameter = parameter;
        this.values = values;
        this.comma = comma;

        this.parameterRange = parameterRange;
        this.amountRange = amountRange;
        this.valuesRange = valuesRange;

        this.amount = -1;
    }


// INFORMATION

    public getParameterData(parameter: string): InputParameterData | null {
        const blockData = getScriptBlockData(this.parent.scriptBlock);
        const properties = blockData.properties;
        if (properties) {
            const parameterData = properties[parameter];
            if (parameterData) {
                return parameterData;
            }
        }
        return null;
    }


// INITIALIZERS

    protected handleAmount(value: string): number {
        return -1;
    }

    /**
     * We identify the different subparameters in the values string with regex 
     */
    protected getParameterInformation(values: string): void {
        // properties starting position in document
        const valueStart = this.valuesRange.start;

        for (const key in this.properties) {
            // retrieve the matches for this property
            const property = this.properties[key];
            const matches = this.findMatches(
                property.regex,
                values,
                valueStart
            );
            if (matches.length > 0) {
                // check for duplicate properties
                if (matches.length > 1) {
                    for (let i = 0; i < matches.length; i++) {
                        diagnostic(
                            this.document,
                            this.diagnostics,
                            DiagnosticType.DUPLICATE_PROPERTY,
                            { property: key },
                            matches[i].range.start,
                            matches[i].range.end,
                            vscode.DiagnosticSeverity.Warning
                        );
                        const line = this.document.positionAt(matches[i].range.start).line;
                        console.debug(`Duplicate subparameter '${key}' at line ${line + 1}`);
                    }
                }

                // find the value of the property
                const match = matches[0];
                const propValue = match.match.groups?.value;
                if (propValue !== undefined) {
                    switch (property.type) {
                        case 'array':
                            property.value = propValue.split(";");
                            break;
                        case 'boolean':
                            property.value = !property.value; // invert boolean
                            break;
                        case 'string':
                            property.value = propValue;
                            break;
                    }
                    property.source = match.match[0];
                    property.range = match.range;
                }
            }
        }
    }

// CHECKERS

    protected validateOneOf(parameterData: InputParameterData): boolean {
        const oneOf = parameterData.oneOf;
        if (oneOf) {
            // check if at least one of the required properties is provided
            let hasOne = false;
            for (const prop of oneOf) {
                const property = this.properties[prop];
                if (!property) { continue; }

                // check based on type
                switch (property.type) {
                    case 'array':
                        if (Array.isArray(property.value) && property.value.length > 0) {
                            hasOne = true;
                        }
                        break;
                    case 'boolean':
                        if (property.value === true) {
                            hasOne = true;
                        }
                        break;
                    case 'string':
                        if (typeof property.value === 'string' && property.value !== "") {
                            hasOne = true;
                        }
                        break;
                }
            }
            if (!hasOne) {
                diagnostic(
                    this.document,
                    this.diagnostics,
                    DiagnosticType.MISSING_ONEOF_PROPERTY,
                    { type: this.parameter, properties: oneOf.join(", ") },
                    this.valuesRange.start,
                    this.valuesRange.end,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }
        }
        
        return true;
    }

    protected validateValues(parameterData: InputParameterData): boolean {
        for (const key in this.properties) {
            const property = this.properties[key];
            const propData = parameterData.properties[key];
            const values = propData.values;
            if (!values) { continue; }

            // try based on type
            const value = property.value;
            let pass = true;
            let params = {};
            switch (property.type) {
                case 'array':
                    for (const val of value as string[]) {
                        if (!values.includes(val)) {
                            pass = false;
                            params = { value: val, property: key, validValues: values.join(", ") };
                        }
                    }
                    break;
                case 'string':
                    if (!values.includes(value as string)) {
                        pass = false;
                        params = { value: value as string, property: key, validValues: values.join(", ") };
                    }
                    break;
            }

            // report invalid value
            if (!pass) {
                diagnostic(
                    this.document,
                    this.diagnostics,
                    DiagnosticType.INVALID_VALUE,
                    params,
                    property.range.start,
                    property.range.end,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }

        }
        return true;
    }

// UTILITY
    protected findMatches(
        regex: RegExp,
        text: string,
        offset: number
    ): {match: RegExpExecArray, range: IndexRange}[] {
        regex.lastIndex = 0; // reset regex state

        const matches: {match: RegExpExecArray, range: IndexRange}[] = [];
        let searchPos = 0;
        while (searchPos < text.length) {
            let match = regex.exec(text);
            if (!match) { break; }

            // find match position in document
            const fullMatch = match[0];
            const matchStart = offset + text.indexOf(fullMatch);
            const matchEnd = matchStart + fullMatch.length;
            matches.push({match: match, range: {start: matchStart, end: matchEnd}});

            searchPos = regex.lastIndex;
        }
        return matches;
    }
}


/**
 * Handles the `item` parameter of inputs block.
 */
export class InputsItemParameter extends InputsParameter {
// MEMBERS
    // properties
    properties: Record<string, InputAnalysisProperty> = {
        itemList: {
            source: "",
            value: [] as string[], 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.itemList,
            type: 'array', },
        mode: { 
            source: "",
            value: "destroy" as string, 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.mode,
            type: 'string', },
        tags: {
            source: "",
            value: [] as string[], 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.tags,
            type: 'array', },
        flags: { 
            source: "",
            value: [] as string[], 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.flags,
            type: 'array', },
        mappers: { 
            source: "",
            value: [] as string[], 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.mappers,
            type: 'array', },
        overlayMapper: { 
            source: "",
            value: false as boolean, 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.overlayMapper,
            type: 'boolean', },
    };

// CONSTRUCTOR
    constructor(
        document: TextDocument,
        parent: ScriptBlock,
        diagnostics: Diagnostic[],
        parameter: string,
        values: string,
        amount: string,
        parameterRange: IndexRange,
        amountRange: IndexRange,
        valuesRange: IndexRange,
        comma: string,
    ) {
        super(
            document,
            parent,
            diagnostics,
            parameter,
            values,
            amount,
            parameterRange,
            amountRange,
            valuesRange,
            comma
        );
        this.amount = this.handleAmount(amount);
        this.getParameterInformation(values);

        this.validateProperties();
    }

// INITIALIZERS
    /**
     * The amount for the iteùs parameter should be an integer.
     */
    protected handleAmount(amount: string): number {
        // transform into a number
        const num = parseFloat(amount);
        if (isNaN(num) || num < 0) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.INVALID_AMOUNT,
                { amount: amount, type: this.parameter },
                this.amountRange.start,
                this.amountRange.end,
                vscode.DiagnosticSeverity.Error
            );
            return -1;
        }

        // verify if integer
        if (!Number.isInteger(num)) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.INTEGER_AMOUNT,
                { amount: amount, type: this.parameter },
                this.amountRange.start,
                this.amountRange.end,
                vscode.DiagnosticSeverity.Warning
            );
            return -1;
        }

        return num;
    }

// CHECKERS

    protected validateProperties(): boolean {
        const parameterData = this.getParameterData(this.parameter);
        if (!parameterData) {
            return false; // that would be weird if we got there with an invalid parameter
        }

        // check one of
        const oneOf = this.validateOneOf(parameterData);
        if (!oneOf) {
            return false;
        }

        // check values
        const values = this.validateValues(parameterData);
        if (!values) {
            return false;
        }

        // check itemList format
        const itemListProperty = this.properties['itemList'];
        const propertyRange = itemListProperty.range;
        const itemCount = itemListProperty.value.length;
        for (const item of itemListProperty.value) {
            // get item positions
            const itemStart = propertyRange.start + itemListProperty.source.indexOf(item);
            const itemEnd = itemStart + item.length;

            // check value is *, don't allow for other values
            if (item === "*") {
                if (itemCount > 1) {
                    diagnostic(
                        this.document,
                        this.diagnostics,
                        DiagnosticType.ALL_WITH_OTHERS,
                        {},
                        itemStart,
                        itemEnd,
                        vscode.DiagnosticSeverity.Error
                    );
                    return false;
                }
                break; // no need to check other items, only need to correct that one
            }
            
            // verify the item isn't empty
            if (item.trim() === "") {
                diagnostic(
                    this.document,
                    this.diagnostics,
                    DiagnosticType.MISSING_VALUE,
                    {},
                    itemStart,
                    itemEnd,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }

            // verify the item doesn't have spaces in its module.id
            if (item.includes(" ")) {
                diagnostic(
                    this.document,
                    this.diagnostics,
                    DiagnosticType.SPACES_IN_ITEM,
                    { value: item },
                    itemStart,
                    itemEnd,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }
            
            // verify the item doesn't have dots in its ID
            const splittedItem = item.split(".");
            if (splittedItem.length > 2) {
                diagnostic(
                    this.document,
                    this.diagnostics,
                    DiagnosticType.NO_DOTS_ITEM,
                    { value: item },
                    itemStart,
                    itemEnd,
                    vscode.DiagnosticSeverity.Error
                );
                return false;

            // verify the item has a module part
            } else if (splittedItem.length === 1) {
                diagnostic(
                    this.document,
                    this.diagnostics,
                    DiagnosticType.MISSING_MODULE,
                    { value: item },
                    itemStart,
                    itemEnd,
                    vscode.DiagnosticSeverity.Error
                );
                return false;
            }
        }
        
        return true;
    }
}


/**
 * Handles the `+fluid` and `-fluid` parameters of inputs block.
 */
export class InputsFluidParameter extends InputsParameter {
// MEMBERS
    // properties
    properties: Record<string, InputAnalysisProperty> = {
        fluidList: {
            source: "",
            value: [] as string[],
            range: {start: -1, end: -1} as IndexRange,
            regex: inputsOutputsRegex.itemList,
            type: 'array', },
        // singleValue: { // that one is only for +fluid
        //     source: "",
        //     value: "" as string,
        //     range: {start: -1, end: -1} as IndexRange,
        //     regex: inputsOutputsRegex.singleValue,
        //     type: 'string', },
        categories: {
            source: "",
            value: [] as string[],
            range: {start: -1, end: -1} as IndexRange,
            regex: inputsOutputsRegex.categories,
            type: 'array', },
        flags: {
            source: "",
            value: [] as string[],
            range: {start: -1, end: -1} as IndexRange,
            regex: inputsOutputsRegex.flags,
            type: 'array', },
        mode: { 
            source: "",
            value: "anything" as string, 
            range: {start: -1, end: -1} as IndexRange, 
            regex: inputsOutputsRegex.mode,
            type: 'string', },
    };

// CONSTRUCTOR
    constructor(
        document: TextDocument,
        parent: ScriptBlock,
        diagnostics: Diagnostic[],
        parameter: string,
        values: string,
        amount: string,
        parameterRange: IndexRange,
        amountRange: IndexRange,
        valuesRange: IndexRange,
        comma: string,
    ) {
        super(
            document,
            parent,
            diagnostics,
            parameter,
            values,
            amount,
            parameterRange,
            amountRange,
            valuesRange,
            comma
        );
        this.amount = this.handleAmount(amount);
        this.getParameterInformation(values);

        this.validateProperties();
    }

// INITIALIZERS
    protected handleAmount(amount: string): number {
        // transform into a number
        const num = parseFloat(amount);
        if (isNaN(num) || num < 0) {
            diagnostic(
                this.document,
                this.diagnostics,
                DiagnosticType.INVALID_AMOUNT,
                { amount: amount, type: this.parameter },
                this.valuesRange.start,
                this.valuesRange.end,
                vscode.DiagnosticSeverity.Error
            );
            return -1;
        }

        return num;
    }

// CHECKERS

    protected validateProperties(): boolean {
        const parameterData = this.getParameterData(this.parameter);
        if (!parameterData) {
            return false; // that would be weird if we got there with an invalid parameter
        }

        // check one of
        const oneOf = this.validateOneOf(parameterData);
        if (!oneOf) {
            return false;
        }

        // check values
        const values = this.validateValues(parameterData);
        if (!values) {
            return false;
        }
        
        return true;
    }
}
