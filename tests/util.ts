/**
 * Returns a new regex without the global flag because we don't want to keep state between tests.
 *
 * @param r the regex to use
 * @returns the regex with no global flag
 */
export function getRegex(r: RegExp) {
    return new RegExp(r.source, r.flags.replace("g", ""));
}
