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

