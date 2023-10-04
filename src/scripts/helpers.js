import fs from 'fs';
import path from 'path';

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

export async function updateVsCodeReadOnlyFiles(remove, add, settingsPath = '.vscode/settings.json') {
  try {
    // Default settings object
    let settings = {};

    // If settings.json exists, read and parse it
    if (fs.existsSync(settingsPath)) {
      const rawData = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(rawData);
    }

    // Remove files from files.readonlyInclude
    for (const file of remove) {
      if (!settings['files.readonlyInclude'][file]) return;
      delete settings['files.readonlyInclude'][file];
    }

    const readonlyFiles = {};
    for (const file of add) {
      readonlyFiles[file] = true;
    }

    // Override files.readonlyInclude with the provided files object
    settings['files.readonlyInclude'] = { ...readonlyFiles, ...settings['files.readonlyInclude'] };

    // Write the updated settings back to settings.json
    await fs.mkdirSync(settingsPath.split('/').slice(0, -1).join('/'), { recursive: true });
    await fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
  } catch (error) {
    console.error('An error occurred while updating settings:', error);
  }
}

export function optimizePathForWindows(path) {
  return path.replace(/\\/g, "/");
}
