/**
 * Removes vendor files based on the provided configuration.
 *
 * @async
 * @param {Config} config - The configuration object.
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of removed paths.
 */
export function removeVendors(config: Config): Promise<Array<string>>;
/**
 * Creates a diff between the transformed file and the manually edited file.
 * Saves the diff in the patch folder.
 *
 * @param {string} filePath - The path of the file to create a diff for.
 * @param {Config} config - The configuration object.
 */
export function createDiff(filePath: string, config: Config): Promise<void>;
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
