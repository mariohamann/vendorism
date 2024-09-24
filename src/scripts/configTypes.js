/**
 * @typedef {Object} Hooks
 * @property {string} [before] - Command to execute before processing.
 * @property {string} [after] - Command to execute after processing.
 */

/**
 * @typedef {Object} GetConfig
 * @property {string} path - The base path of the source files.
 * @property {string} [url] - The URL from which files should be downloaded.
 * @property {Hooks} [hooks] - Hooks to execute before and after processing.
 * @property {Object} [downloadConfig] - Configuration for the download process.
 */

/**
 * @typedef {Object} SetConfig
 * @property {string} path - The base path of the target files.
 * @property {string[]} includes - The list of files to include in the target.
 * @property {boolean} [excludeDependencies] - Whether to exclude dependencies from the target.
 * @property {Function[]} [transforms] - An array of transform functions that modify file content and paths.
 * @property {Object} [globalTransformFolder] - The folder containing global transform definitions.
 * @property {Object} [fileTransformFolder] - The folder containing file-specific transform definitions.
 * @property {Hooks} [hooks] - Hooks to execute before and after processing.
 * @property {Object} [removeVendors] - Configuration for removing vendors.
 * @property {Object} [removeVendors.globby] - Globby configuration for vendor removal.
 */

/**
 * @typedef {Object} Config
 * @property {GetConfig} get - Configuration for downloading and extracting files.
 * @property {SetConfig} set - Configuration for handling target files.
 */
