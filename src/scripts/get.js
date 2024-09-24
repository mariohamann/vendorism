import { download } from '@guoyunhe/downloader';
import { execSync } from 'child_process';// @ts-ignore
import('./configTypes.js').Config;

/**
 * Sets the source based on the provided configuration.
 * 
 * This function will:
 * - Execute the 'before' hook if provided.
 * - Download and extract files from a specified URL to a target path.
 * - Execute the 'after' hook if provided.
 * 
 * @async
 * @param {Config} config - The configuration object.
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
