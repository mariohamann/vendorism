/**
 * Class representing a string replacer with flexible replacement capabilities.
 */
export class StringReplacer {
  /**
   * Create a StringReplacer instance.
   * @param {string} value - The initial string value.
   */
  constructor(value) {
    this.value = value;
  }

  /**
   * Replaces a section of text within the string using delimiters or an exact match.
   *
   * @param {string | string[]} target - The delimiters array or exact match string.
   * @param {string} replacement - The replacement string.
   * @returns {StringReplacer} - The modified StringReplacer instance.
   */
  replace(target, replacement) {
    if (Array.isArray(target)) {
      const [start, end] = target.map(this.escapeRegExp);
      const regex = new RegExp(`${start}[\\s\\S]*?${end}`, 'g');
      this.value = this.value.replace(regex, replacement);
    } else {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      this.value = this.value.replace(regex, replacement);
    }
    return this;
  }

  /**
   * Replaces all occurrences of a section of text within the string using delimiters or an exact match.
   *
   * @param {string | string[]} target - The delimiters array or exact match string.
   * @param {string} replacement - The replacement string.
   * @returns {StringReplacer} - The modified StringReplacer instance.
   */
  replaceAll(target, replacement) {
    if (Array.isArray(target)) {
      const [start, end] = target.map(this.escapeRegExp);
      const regex = new RegExp(`${start}[\\s\\S]*?${end}`, 'g');
      this.value = this.value.replace(regex, replacement);
    } else {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      this.value = this.value.replace(regex, replacement);
    }
    return this;
  }

  /**
   * Escapes special characters for use in a regular expression.
   *
   * @param {string} string - The string to escape.
   * @returns {string} - The escaped string.
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Converts the instance back to string.
   * @returns {string} - The string value.
   */
  toString() {
    return this.value;
  }
}
