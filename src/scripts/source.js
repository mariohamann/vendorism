import fs from 'fs';
import path from 'path';
import { download } from '@guoyunhe/downloader';
import { execSync } from 'child_process';

/**
 * Recursively deletes a directory and its contents.
 * 
 * This function will:
 * - Iterate over all files in the directory.
 * - Delete sub-directories recursively.
 * - Delete files.
 * - Delete the main directory.
 * 
 * @param {string} directory - The path of the directory to be deleted.
 * 
 * @throws {Error} Throws an error if deleting a directory or file fails.
 */
export function deletePathRecursively(directory) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach(file => {
      const curPath = path.join(directory, file);
      fs.lstatSync(curPath).isDirectory() ? deletePathRecursively(curPath) : fs.unlinkSync(curPath);
    });
    fs.rmdirSync(directory);
  }
}

/**
 * Sets the source based on the provided configuration.
 * 
 * This function will:
 * - Execute the 'before' hook if provided.
 * - Download and extract files from a specified URL to a target path.
 * - Execute the 'after' hook if provided.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.source - The source configuration.
 * @param {string} [config.source.url] - The URL from which files should be downloaded.
 * @param {string} config.source.path - The directory to which files should be extracted.
 * @param {Object} [config.downloadConfig] - The configuration object for the download process.
 * @param {string} [config.source.hooks.before] - A hook command to run before the main process.
 * @param {string} [config.source.hooks.after] - A hook command to run after the main process.
 * 
 * @returns {Promise<void>} A promise indicating completion of the function.
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
export const setSource = async (config) => {
  if (config.source.hooks?.before) {
    await execSync(config.source.hooks.before);
  }

  if (config.source.url) {
    await download(config.source.url, config.source.path, { ...config.downloadConfig, extract: true });
  }

  if (config.source.hooks?.after) {
    await execSync(config.source.hooks.after);
  }
}
