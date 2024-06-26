/**
 * Removes vendor files based on the provided configuration.
 *
 * This function performs the following steps:
 * - Retrieves files from the target path.
 * - Checks if the file content starts with the specified head.
 * - Removes files that have the specified head.
 * - Removes empty directories recursively.
 *
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {string} [config.set.head] - The head content to match for removal.
 * @param {Object} [config.set.removeVendors] - Configuration for removing vendors.
 * @param {Object} [config.set.removeVendors.globby] - Globby configuration for file pattern matching.
 *
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of overridden paths.
 *
 * @throws {Error} Throws an error if any step in the function fails.
 */
export function removeVendors(config: {
    set: {
        path: string;
        head?: string;
        removeVendors?: {
            globby?: any;
        };
    };
}): Promise<Array<string>>;
/**
 * Creates vendors based on the provided configuration.
 *
 * This function performs the following steps:
 * - Retrieves dependencies or includes files based on the excludeDependencies configuration.
 * - Reads content from the source path.
 * - Applies transforms to content and target path if they exist.
 * - Skips copying if target file already exists.
 * - Writes the file to the target path with the appropriate head.
 *
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.get - The source configuration.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {Array.<string>} config.set.includes - List of files or globs to include.
 * @param {Array.<function>} [config.set.transforms] - List of transform functions.
 * @param {boolean} [config.set.excludeDependencies=false] - Specifies whether to exclude dependencies.
 * @param {string} [config.set.head] - The head content to prepend to target files.
 *
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of overridden paths.
 *
 * @throws {Error} Throws an error if any step in the function fails.
 */
export function createVendors(config: {
    get: any;
    set: {
        path: string;
        includes: Array<string>;
        transforms?: Array<Function>;
        excludeDependencies?: boolean;
        head?: string;
    };
}): Promise<Array<string>>;
/**
 * Sets up the target based on the provided configuration.
 *
 * This function performs the following steps:
 * 1. Executes the before hook if provided.
 * 2. Assigns a default head to the target if none is provided.
 * 3. If a target path is provided, the function:
 *    - Removes vendors based on the configuration.
 *    - Creates new vendors, with potential path and content transformations.
 *    - If specified in the config, updates VS Code settings for read-only files.
 * 4. Executes the after hook if provided.
 *
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {string} [config.set.head] - The head content to prepend to target files. Uses a default if not provided.
 * @param {Object} [config.set.hooks] - Hooks to be executed before and after target processing.
 * @param {string} [config.set.hooks.before] - Command to be executed before target processing.
 * @param {string} [config.set.hooks.after] - Command to be executed after target processing.
 * @param {Function[]} [config.set.transforms] - An array of transform functions that can modify content and file paths. Each function takes in the current path and content and returns an object with potentially modified path and content.
 *
 * @returns {Promise<{removedFiles: string[], newFiles: string[]}>}
 *
 * @throws {Error} Throws an error if any step in the function fails.
 */
export function set(config: {
    set: {
        path: string;
        head?: string;
        hooks?: {
            before?: string;
            after?: string;
        };
        transforms?: Function[];
    };
}): Promise<{
    removedFiles: string[];
    newFiles: string[];
}>;
/**
 * Default values for the set configuration.
 *
 * @type {Object}
 *
 * @property {string} head - The default head content to prepend to target files.
 */
export const defaults: any;
