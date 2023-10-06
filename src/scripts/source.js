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
 * @param {Object} config.source - The source configuration.
 * @param {Object} [config.source.hooks] - Collection of hooks to run before and after the main process.
 * @param {string} [config.source.hooks.before] - A hook command to run before the main process.
 * @param {string} [config.source.hooks.after] - A hook command to run after the main process.
 * @param {string} [config.source.url] - The URL from which files should be downloaded.
 * @param {string} config.source.path - The directory to which files should be extracted.
 * @param {Object} [config.downloadConfig] - The configuration object for the download process.
 * 
 * @returns {Promise<void>} A promise indicating completion of the function.
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
export const setSource = async (config) => {
  if (config.source.hooks?.before) {
    await execSync(config.source.hooks.before, { stdio: 'inherit' });
  }

  if (config.source.url) {
    await download(config.source.url, config.source.path, { ...config.downloadConfig, extract: true });
  }

  if (config.source.hooks?.after) {
    await execSync(config.source.hooks.after, { stdio: 'inherit' });
  }

  return Promise.resolve();
}
