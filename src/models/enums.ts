import { TextDocument, DiagnosticSeverity, Diagnostic, Range } from "vscode";
import * as path from "path";

export const EXTENSION_LANGUAGE = "ZedScripts";
export const DOCUMENT_IDENTIFIER = "_DOCUMENT";

export const SCRIPT_DATA_LINK = "https://raw.githubusercontent.com/SirDoggyJvla/pz-scripts-data/refs/heads/main/data/scriptBlocks.json";
export const TRANSLATION_FILES_DATA_LINK = "https://raw.githubusercontent.com/SirDoggyJvla/pz-scripts-data/refs/heads/main/data/translationFiles.json";
export const LANGUAGE_CODES_DATA_LINK = "https://raw.githubusercontent.com/SirDoggyJvla/pz-scripts-data/refs/heads/main/data/languageCodes.json";

export const DEFAULT_DIR = path.normalize(
    "C:/Program Files (x86)/Steam/steamapps/common/ProjectZomboid/media/scripts/"
);

const CACHE_DURATION_HOURS = 12;
export const CACHE_DURATION_MS = CACHE_DURATION_HOURS * 60 * 60 * 1000; // in milliseconds
export const WIKI_LINK = "https://pzwiki.net/wiki/";

export enum ThemeColorType {
    ID = "entity.name.class",
    SCRIPT_BLOCK = "keyword.control",
    BOOLEAN = "constant.language.boolean",
    PARAMETER = "variable.parameter",
    NUMBER = "constant.numeric",
    STRING = "string.quoted.double",
    FULLTYPE = "string.quoted.double",
    TYPE = "support.type.property-name",
    OPERATOR = "keyword.operator.assignment",
}

export enum DefaultText {
    SCRIPT_BLOCK_DESCRIPTION = "No description available for this script block.",
    PARAMETER_DESCRIPTION = "No description available for this parameter.",
    MORE_INFORMATION = "*For more information, visit the [wiki page]({wikiPage}).*",

    CACHE_RESET = "Script data cache has been reset.",
    CACHE_RESET_FAILED = "Project Zomboid Scripts Data fetch failed, using cached or default extension data. Information might be outdated.",
}

export enum CompletionText {
    BLOCK = `{scriptBlock} {id}{\n`,
    // MIDDLE = '',
    END = '}',
    ID = `\${{level}:id} `,

    PARAMETER_AUTO = `{parameter} = \${1:value},`,
    PARAMETER = `\t{parameter} = {value},\n`,
}

export enum DiagnosticType {
    // formatting related diagnostics
    MISSING_COMMA = "Missing comma.",
    INVALID_COMMA = "Invalid comma.",
    UNMATCHED_BRACE = "Missing closing bracket '}' for '{scriptBlock}' block.",
    NOT_VALID_BLOCK = "'{scriptBlock}' is an unknown script block.",
    
    // parent/child block related diagnostics
    MISSING_PARENT_BLOCK = "'{scriptBlock}' block must be inside a valid parent block: {parentBlocks}.",
    HAS_PARENT_BLOCK = "'{scriptBlock}' block cannot be inside any parent block.",
    WRONG_PARENT_BLOCK = "'{scriptBlock}' block cannot be inside parent block '{parentBlock}'. Valid parent blocks are: {parentBlocks}.",
    MISSING_CHILD_BLOCK = "'{scriptBlock}' block must have child blocks: {childBlocks}. This might be intentional for soft overrides of an existing block.", // TODO: add data regarding which blocks can get such soft overrides to properly diagnostic missing child blocks

    // ID related diagnostics
    MISSING_ID = "'{scriptBlock}' block is missing an ID.",
    HAS_ID = "'{scriptBlock}' block cannot have an ID.",
    INVALID_ID = "'{scriptBlock}' block has an invalid ID '{id}'. Valid IDs are: {validIDs}.",
    HAS_ID_IN_PARENT = "'{scriptBlock}' block cannot have an ID when inside parent block '{parentBlock}', only for: {invalidBlocks}.",

    // parameter related diagnostics
    UNKNOWN_PARAMETER = "'{parameter}' is an unknown parameter for '{scriptBlock}' block. [WIP: not every parameters are documented yet]",
    MISSING_PARAMETER = "'{scriptBlock}' block is missing required parameter(s): {parameters}.",
    DUPLICATE_PARAMETER = "'{parameter}' is defined multiple times in '{scriptBlock}' block.",
    MISSING_VALUE = "Missing a value.",
    INVALID_PARAMETER_VALUE = "'{parameter}' has an invalid value '{value}'.",
    DEPRECATED_PARAMETER = "'{parameter}' parameter in '{scriptBlock}' block is deprecated.",
    WRONG_VALUE = "'{value}' is not a valid value for parameter '{parameter}'. Valid values are: {validValues}.",

    // craftRecipe related diagnostics
    INVALID_AMOUNT = "'{amount}' is not a valid amount for '{type}'.",
    INTEGER_AMOUNT = "'{amount}' should be an integer for '{type}'.",
    DUPLICATE_PROPERTY = "'{property}' is provided multiple times.",
    MISSING_ONEOF_PROPERTY = "'{type}' is missing at least one of the following properties: {properties}.",

    NO_DOTS_ITEM = "An item type (ID) cannot have dots '.' in its name. ({value})",
    MISSING_MODULE = "The provided item type (ID) is missing its module part: 'module.type'. ({value})",
    ALL_WITH_OTHERS = "'*' was provided along with other item types. '*' must be used alone.",
    SPACES_IN_ITEM = "An item full type (module and ID) cannot contain spaces. ({value})",
    INVALID_VALUE = "'{value}' is not a valid value for '{property}'. Valid values are: {validValues}.",

    // translations diagnostics
    UNMATCHED_CODE = "Unmatched language code between folder name '{folderCode}' and file name '{fileCode}'. They should be the same.",
    NON_EXISTENT_CODE = "The language code '{code}' does not exist. Valid codes are: {validCodes}.",
    IN_FIRST_LINE = "Translation key-value pairs cannot be in the first line of the file as it is not parsed.",
    UNECESSARY_COMMA = "Unnecessary comma. Translation files do not need a comma compared to script files.",
    INVALID_FILE_PREFIX = "The file '{filePrefix}' is not a valid translation file prefix. Valid prefixes are: {validPrefixes}.",
    MISSING_QUOTES = "Missing quotes around value.",

    _DEBUG = "This is a debug diagnostic with value: {value}.",
}







// Diagnostic helpers
export function formatText(message: string, params: Record<string, string>): string {
    return message.replace(/{(\w+)}/g, (_, key) => params[key] ?? "");
}

export function diagnostic(
    document: TextDocument,
    diagnostics: Diagnostic[],
    type: DiagnosticType,
    params: Record<string, string>,
    index_start: number, index_end: number = index_start,
    severity: DiagnosticSeverity = DiagnosticSeverity.Error
): void {
    const positionStart = document.positionAt(index_start);
    const positionEnd = document.positionAt(index_end);
    const message = formatText(type, params);
    const diagnostic = new Diagnostic(
        new Range(positionStart, positionEnd),
        message,
        severity
    );
    diagnostics.push(diagnostic);
    // console.warn(message);
}