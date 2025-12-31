import { blockNames } from '../scripts/scriptData';

// Modification pour capturer item avec ses éventuels sous-blocs component et Fluids
export const itemBlockRegex = /\s*item\s+(\w+)\s*\{((?:[^{}]*|\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\})*)\}/g;

// Pour les propriétés de base du item (en excluant les sous-blocs)
// Modifié pour capturer la virgule (ou son absence) à la fin
export const itemPropertiesRegex = /\s*(?!.*component\s+)(\w+)\s*=\s*([^,\r\n]+)(,\s*$|[^,\s]?\s*$)/gm;

// Pour capturer le sous-bloc component avec son nom et son éventuel bloc Fluids
export const componentBlockRegex = /\s*component\s+(\w+)\s*\{\s*((?:[^{}]*|\{[^{}]*\})*)\s*\}/g;

// Pour les propriétés dans component (en excluant le bloc Fluids)
export const componentPropertiesRegex = /\s*(\w+)\s*=\\s*([^,\r\n{}]+)/gm;

// Pour capturer le bloc Fluids dans component
export const fluidsBlockRegex = /(?:\r\n|\n)\s*Fluids\s*{([^}]*)}/gm;

// Pour les propriétés dans Fluids
export const fluidsPropertiesRegex = /^\s*(\w+)\s*=\s*([^,\r\n]+)/gm;

export const fixingBlockRegex = /\s*fixing\s+([^{]+){([^}]*)}/g;

// Pour capturer les propriétés à l'intérieur du bloc fixing
// Modifié pour capturer la virgule (ou son absence) à la fin
export const fixingPropertiesRegex = /\s*(\w+)\s*:\s*([^,\n]+)(,\s*$|[^,\s]?\s*$)/g;

// Modification du regex pour craftRecipe pour capturer l'ensemble du bloc y compris les sous-blocs
export const craftRecipeBlockRegex = /\s*craftRecipe\s+(\w+)\s*{([^]*?)(?:(?:\s*inputs\s*{[^}]*})|(?:\s*outputs\s*{[^}]*})|(?:\s*itemMapper\s+\w+\s*{[^}]*}))*\s*}/g;

// Pour les propriétés de base du craftRecipe (en excluant les sous-blocs)
// Modifié pour capturer la virgule (ou son absence) à la fin
export const craftRecipePropertiesRegex = /^\s*(?!inputs|outputs|itemMapper)(\w+)\s*=\s*([^,\n]+)(,\s*$|[^,\s]?\s*$)/gm;

// Pour capturer les sous-blocs inputs/outputs dans le contexte d'un craftRecipe
export const inputsOutputsBlockRegex = /\s*(inputs|outputs)\s*{([^}]*)}/g;

// Pour capturer les entrées dans inputs/outputs
export const inputsOutputsEntriesRegex = /\s*item\s+(\d+)\s+(?:\[(.*?)\]|tags\[(.*?)\])(?:\s+(?:mode:(\w+)|flags\[(.*?)\]))*\s*/g;

// Pour le sous-bloc itemMapper dans le contexte d'un craftRecipe
export const itemMapperBlockRegex = /\s*itemMapper\s+(\w+)\s*{([^}]*)}/g;

// Pour les entrées dans itemMapper
export const itemMapperEntriesRegex = /\s*([^=\s]+)\s*=\s*([^,\n]+)/g;






/**
 * Matches script block headers.
 * 
 * @example
 * ```ts
 * module Example {
 * ```
 * @example
 * ```ts
 * module Example
 * {
 * ```
 * @example
 * ```ts
 * module
 * {
 * ```
 */
export const scriptBlockRegex = /^\s*(?<type>\w+)\s+(?<name>[^\r\n]*?)\s*{/gm;


// NOTE(aoqia): I am not sure if the game ignores whitespace at the end of values.
//   For example: "Icon = EngineParts ," the value could either be "EngineParts" OR "EngineParts "
//   If its the last one, just remove the last \s* (before the comma) in the pattern below
/**
 * Matches script block parameters.
 *
 * @example
 * ```ts
 * Tags = Epic;New,
 * ```
 */
export const parameterRegex = /(?<name>\S+?)\s*=[^\S\r\n]*(?<value>[^\r\n,]*)\s*?(?<comma>,*)/g;
