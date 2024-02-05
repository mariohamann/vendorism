import { globby } from 'globby';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import dependencyTree from 'dependency-tree';
import { optimizePathForWindows } from './helpers.js';

/**
 * Default values for the set configuration.
 * 
 * @type {Object}
 * 
 * @property {string} head - The default head content to prepend to target files.
 */
export const defaults = {
  head: `// ---------------------------------------------------------------------\n// 🔒 AUTOGENERATED BY VENDORISM\n// Removing this comment will prevent it from being managed by it.\n// ---------------------------------------------------------------------\n`,
};

/**
 * Retrieves the dependencies of the specified included files based on the provided configuration.
 * 
 * This function performs the following steps:
 * - Iterates through the specified included files.
 * - Lists the dependencies of each file using `dependencyTree`.
 * - Filters out dependencies located within the node_modules directory.
 * - Converts the absolute path of each dependency to a relative one.
 * 
 * @async
 * @param {Array.<string>} includedFiles - The list of included files for which dependencies should be retrieved.
 * @param {Object} config - The configuration object.
 * @param {Object} config.get - The source configuration containing the path.
 * 
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of dependencies.
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
async function getDependenciesForIncludedFiles(includedFiles, config) {
  let allDeps = new Set();

  for (const file of includedFiles) {
    const list = await dependencyTree.toList({
      filename: path.join(config.get.path, file),
      directory: config.get.path,
      filter: path => path.indexOf('node_modules') === -1,
      noTypeDefinitions: true
    });

    list.forEach(dep => {
      // Convert the absolute path to a relative one
      const relativePath = optimizePathForWindows(path.relative(config.get.path, dep).replace('../', ''));
      allDeps.add(relativePath);
    });
  }

  return Array.from(allDeps);
}

/**
 * Removes vendor files based on the provided configuration.
 * 
 * This function performs the following steps:
 * - Retrieves files from the target path.
 * - Checks if the file content starts with the specified head.
 * - Removes files that have the specified head.
 * - Removes empty directories recursively.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {string} config.set.head - The head content to match for removal.
 * @param {Object} [config.set.removeVendors] - Configuration for removing vendors.
 * @param {Object} [config.set.removeVendors.globby] - Globby configuration for file pattern matching.
 * 
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of overridden paths.
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
export async function removeVendors(config) {
  const files = await globby(`${config.set.path}/**/*`, config.set.removeVendors?.globby || { gitignore: true }); // adjust the pattern as needed

  let overriden = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.startsWith(config.set.head)) {
      // Remove file
      fs.unlinkSync(file);
      overriden.push(optimizePathForWindows(file));
      let currentDir = path.dirname(file);

      // Remove empty directories
      while (currentDir !== config.set.path) {
        if (fs.readdirSync(currentDir).length === 0) {
          fs.rmdirSync(currentDir);
          currentDir = path.dirname(currentDir);
        } else {
          break;
        }
      }
    }
  }

  return overriden;
}
/**
 * Creates vendors based on the provided configuration.
 * 
 * This function performs the following steps:
 * - Retrieves dependencies or includes files based on the excludeDependencies configuration.
 * - Reads content from the source path.
 * - Applies transforms to content and target path if they exist.
 * - Skips copying if target file already exists.
 * - Writes the file to the target path with the appropriate head.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.get - The source configuration.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {Array.<string>} config.set.includes - List of files or globs to include.
 * @param {Array.<function>} [config.set.transforms] - List of transform functions.
 * @param {boolean} [config.set.excludeDependencies=false] - Specifies whether to exclude dependencies.
 * @param {string} [config.set.head] - The head content to prepend to target files.
 * 
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of overridden paths.
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
export async function createVendors(config) {
  // Resolve files from the glob patterns in includes
  const includedFiles = await globby(config.set.includes, { cwd: config.get.path });

  // If excludeDependencies is false, get the dependencies for each file resolved from the globs.
  const dependencies = !config.set.excludeDependencies
    ? await getDependenciesForIncludedFiles(includedFiles, config)
    : [];

  // Merge included files and their dependencies
  const files = [...new Set([...includedFiles, ...dependencies])];

  let overriden = [];
  for (const file of files) {
    const getPath = path.join(config.get.path, file);
    let setPath = path.join(config.set.path, file);  // Initialize the variable to store the possibly transformed path

    // Read source content
    let content = fs.readFileSync(getPath, 'utf8');

    // Apply transforms if they exist
    if (config.set.transforms && Array.isArray(config.set.transforms)) {
      for (const transform of config.set.transforms) {
        const transformed = transform(setPath, content); // Apply the transform function

        if (transformed && transformed.path && transformed.content) {
          // Update content and path with transformed values
          content = transformed.content;
          setPath = transformed.path;
        }
      }
    }

    // Check if target file already exists
    if (fs.existsSync(setPath)) {
      continue; // skip copying
    }

    const contentWithHead = config.set.head + "\n" + content;

    fs.mkdirSync(path.dirname(setPath), { recursive: true });
    fs.writeFileSync(setPath, contentWithHead, 'utf8');

    overriden.push(optimizePathForWindows(setPath));
  }
  return overriden;
}

/**
 * Sets up the target based on the provided configuration.
 * 
 * This function performs the following steps:
 * 1. Executes the before hook if provided.
 * 2. Assigns a default head to the target if none is provided.
 * 3. If a target path is provided, the function:
 *    - Removes vendors based on the configuration.
 *    - Creates new vendors, with potential path and content transformations.
 *    - If specified in the config, updates VS Code settings for read-only files.
 * 4. Executes the after hook if provided.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {string} [config.set.head] - The head content to prepend to target files. Uses a default if not provided.
 * @param {Object} [config.set.hooks] - Hooks to be executed before and after target processing.
 * @param {string} [config.set.hooks.before] - Command to be executed before target processing.
 * @param {string} [config.set.hooks.after] - Command to be executed after target processing.
 * @param {Function[]} [config.set.transforms] - An array of transform functions that can modify content and file paths. Each function takes in the current path and content and returns an object with potentially modified path and content.
 * 
 * @returns {Promise<{removedFiles: string[], newFiles: string[]}>}
 * 
 * @throws {Error} Throws an error if any step in the function fails.
 */
export async function set(config) {
  const output = {};
  if (config.set.hooks?.before) {
    await execSync(config.set.hooks.before, { stdio: 'inherit' });
  }

  if (!config.set.head) {
    config.set.head = defaults.head;
  }

  if (config.set?.path) {
    output.removedFiles = await removeVendors(config);
    output.newFiles = await createVendors(config);
  }

  if (config.set.hooks?.after) {
    await execSync(config.set.hooks.after, { stdio: 'inherit' });
  }
  return output;
}
