/**
 * @param {String} path 
 * @returns {String}
 */
export function optimizePathForWindows(path) {
  return path.replace(/\\/g, "/");
}
