import { download } from '@guoyunhe/downloader';
import { execSync } from 'child_process';

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
 * @param {Object} config.get - The source configuration.
 * @param {Object} [config.get.hooks] - Collection of hooks to run before and after the main process.
 * @param {string} [config.get.hooks.before] - A hook command to run before the main process.
 * @param {string} [config.get.hooks.after] - A hook command to run after the main process.
 * @param {string} [config.get.url] - The URL from which files should be downloaded.
 * @param {string} config.get.path - The directory to which files should be extracted.
 * @param {Object} [config.get.downloadConfig] - The configuration object for the download process.
 * 
 * @returns {Promise<void>} A promise indicating completion of the function.
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
export const get = async (config) => {
  if (config.get.hooks?.before) {
    await execSync(config.get.hooks.before, { stdio: 'inherit' });
  }

  if (config.get.url) {
    await download(config.get.url, config.get.path, { ...config.get.downloadConfig, extract: true });
  }

  if (config.get.hooks?.after) {
    await execSync(config.get.hooks.after, { stdio: 'inherit' });
  }

  return Promise.resolve();
}
