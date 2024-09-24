/**
 * Class representing a string replacer with flexible replacement capabilities.
 */
export class StringReplacer {
    /**
     * Create a StringReplacer instance.
     * @param {string} value - The initial string value.
     */
    constructor(value: string);
    value: string;
    /**
     * Replaces a section of text within the string using delimiters or an exact match.
     *
     * @param {string | string[]} target - The delimiters array or exact match string.
     * @param {string} replacement - The replacement string.
     * @returns {StringReplacer} - The modified StringReplacer instance.
     */
    replace(target: string | string[], replacement: string): StringReplacer;
    /**
     * Replaces all occurrences of a section of text within the string using delimiters or an exact match.
     *
     * @param {string | string[]} target - The delimiters array or exact match string.
     * @param {string} replacement - The replacement string.
     * @returns {StringReplacer} - The modified StringReplacer instance.
     */
    replaceAll(target: string | string[], replacement: string): StringReplacer;
    /**
     * Escapes special characters for use in a regular expression.
     *
     * @param {string} string - The string to escape.
     * @returns {string} - The escaped string.
     */
    escapeRegExp(string: string): string;
    /**
     * Converts the instance back to string.
     * @returns {string} - The string value.
     */
    toString(): string;
}
