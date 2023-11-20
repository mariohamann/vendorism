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
export function deletePathRecursively(directory: string): void;
export function optimizePathForWindows(path: any): any;
