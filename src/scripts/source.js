import fs from 'fs';
import path from 'path';
import { download } from '@guoyunhe/downloader';
import { execSync } from 'child_process';

export function deletePathRecursively(directory) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach(file => {
      const curPath = path.join(directory, file);
      fs.lstatSync(curPath).isDirectory() ? deletePathRecursively(curPath) : fs.unlinkSync(curPath);
    });
    fs.rmdirSync(directory);
  }
}

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
