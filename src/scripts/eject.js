import fs from 'fs';
import { updateVsCodeReadOnlyFiles } from './update-vs-code-readonly-files.js';
import { defaults } from './target.js';

/**
 * Ejects a file from the control of the system by removing its header and updating VS Code settings.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.target - The target configuration.
 * @param {string} [config.target.head] - The head content that should be removed from the target file. Uses a default if not provided.
 * @param {boolean|string} [config.target.lockFilesForVsCode=false] - Specifies whether to update files for VS Code read-only settings. Can be a boolean or a custom path to VS Code settings.
 * @param {string} file - The path to the file that should be ejected.
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} Throws an error if the function fails to eject the file.
 */
export const ejectFile = async (config, file) => {
  if (!config.target.head) {
    config.target.head = defaults.head;
  }

  const fileContent = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, fileContent.replace(config.target.head, ''));

  if (config.target.lockFilesForVsCode) {
    await updateVsCodeReadOnlyFiles([file], [], config.target.lockFilesForVsCode === true ? undefined : config.target.lockFilesForVsCode);
  }
}
