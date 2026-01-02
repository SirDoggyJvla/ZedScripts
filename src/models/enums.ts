export enum ThemeColorType {
    ID = "entity.name.class",
    SCRIPT_BLOCK = "keyword.control",
    BOOLEAN = "constant.language.boolean",
    PARAMETER = "variable.parameter",
    NUMBER = "constant.numeric.pz",
    FULLTYPE = 'support.type.property-name',
}

export enum DefaultText {
    SCRIPT_BLOCK_DESCRIPTION = "No description available for this script block.",
    PARAMETER_DESCRIPTION = "No description available for this parameter.",
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
    MISSING_CHILD_BLOCK = "'{scriptBlock}' block must have child blocks: {childBlocks}.",
   
    // ID related diagnostics
    MISSING_ID = "'{scriptBlock}' block is missing an ID.",
    HAS_ID = "'{scriptBlock}' block cannot have an ID.",
    INVALID_ID = "'{scriptBlock}' block has an invalid ID '{id}'. Valid IDs are: {validIDs}.",
    HAS_ID_IN_PARENT = "'{scriptBlock}' block cannot have an ID when inside parent block '{parentBlock}', only for: {invalidBlocks}.",

    // parameter related diagnostics
    UNKNOWN_PARAMETER = "'{parameter}' is an unknown parameter for '{scriptBlock}' block. [WIP: not every parameters are documented yet]",
    MISSING_PARAMETER = "'{scriptBlock}' block is missing required parameter(s): {parameters}.",
    MISSING_VALUE = "Missing a value.",
    INVALID_PARAMETER_VALUE = "'{parameter}' has an invalid value '{value}'.",
    DUPLICATE_PARAMETER = "'{parameter}' is defined multiple times in '{scriptBlock}' block.",
}

// Helper function to format
export function formatDiagnostic(message: string, params: Record<string, string>): string {
    return message.replace(/{(\w+)}/g, (_, key) => params[key] ?? "");
}