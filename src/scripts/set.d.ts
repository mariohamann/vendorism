/**
 * Removes vendor files based on the provided configuration.
 *
 * @async
 * @param {Config} config - The configuration object.
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of removed paths.
 */
export function removeVendors(config: Config): Promise<Array<string>>;
/**
 * Sets up the target based on the provided configuration.
 *
 * @async
 * @param {Config} config - The configuration object.
 * @returns {Promise<{removedFiles: string[], newFiles: string[]}>} A promise that resolves with a list of removed and new files.
 */
export function set(config: Config): Promise<{
    removedFiles: string[];
    newFiles: string[];
}>;
/**
 * Removes the file if it contains the banner and applies all transformations.
 *
 * @param {string} filePath - The path to the file being transformed.
 * @param {Config} config - The configuration object.
 * @returns {Promise<void>} A promise that resolves after the file has been processed.
 */
export function setFile(config: Config, filePath: string): Promise<void>;
