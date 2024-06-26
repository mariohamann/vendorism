import fs from 'fs';
import { defaults } from './set.js';

/**
 * Ejects a file from the control of the system by removing its header and updating VS Code settings.
 * 
 * @async
 * @param {string} file - The path to the file that should be ejected.
 * @param {Object} [config] - The configuration object.
 * @param {Object} [config.set] - The target configuration.
 * @param {string} [config.set.head] - The head content that should be removed from the target file. Uses a default if not provided.
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} Throws an error if the function fails to eject the file.
 */
export const eject = async (file, config) => {
  const head = config?.set?.head || defaults.head;

  const fileContent = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, fileContent.replace(head, ''));
}
