import { globby } from 'globby';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import dependencyTree from 'dependency-tree';
import { optimizePathForWindows } from './helpers.js';
import { tag as bannerTag, transform as bannerTransform } from './transforms/banner.js';

/**
 * Retrieves the dependencies of the specified included files based on the provided configuration.
 * 
 * @async
 * @param {Array.<string>} includedFiles - The list of included files for which dependencies should be retrieved.
 * @param {Object} config - The configuration object.
 * @param {Object} config.get - The source configuration containing the path.
 * 
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of dependencies.
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
      const relativePath = optimizePathForWindows(path.relative(config.get.path, dep).replace('../', ''));
      allDeps.add(relativePath);
    });
  }

  return Array.from(allDeps);
}

/**
 * Removes vendor files based on the provided configuration.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * @param {Object} config.set - The target configuration.
 * @param {string} config.set.path - The path for the target.
 * @param {string} [config.set.head] - The head content to match for removal.
 * @param {Object} [config.set.removeVendors] - Configuration for removing vendors.
 * 
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of removed paths.
 */
export async function removeVendors(config) {
  const files = await globby(`${config.set.path}/**/*`, config.set.removeVendors?.globby || { gitignore: true });

  let removed = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(bannerTag)) {
      fs.unlinkSync(file);
      removed.push(optimizePathForWindows(file));
      let currentDir = path.dirname(file);

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

  return removed;
}

/**
 * Load transforms from a given folder.
 * 
 * @param {string} transformFolder - The folder containing transform definitions.
 * @returns {Promise<Array>} - A list of loaded transform functions.
 */
async function loadTransforms(transformFolder) {
  const transformFiles = await globby(`${transformFolder}/**/*.js`, { gitignore: true });
  const transforms = [];

  for (const file of transformFiles) {
    const transform = await import(path.resolve(file));
    transforms.push({ transform, path: file });
  }

  return transforms;
}

/**
 * Applies all relevant transformations to the given file.
 * 
 * @param {string} filePath - The path to the file being transformed.
 * @param {string} content - The content of the file.
 * @param {Object} config - The configuration object.
 * @param {Array} globalTransforms - List of global transform functions.
 * @param {Array} fileSpecificTransforms - List of file-specific transform functions.
 * 
 * @returns {Promise<Object>} - Promise containing the transformed content and new path (if transformed).
 */
async function applyAllTransforms(filePath, content, config, globalTransforms, fileSpecificTransforms) {
  let transformedContent = content;
  let transformedPath = filePath;

  // Apply global transforms
  for (const { transform } of globalTransforms) {
    const result = transform.transform(transformedContent, transformedPath);
    if (typeof result === 'object') {
      transformedContent = result.content || transformedContent;
      transformedPath = result.path || transformedPath;
    }
    else {
      transformedContent = result;
    }
  }

  // Apply file-specific transforms
  for (const { transform, path: transformPath } of fileSpecificTransforms) {
    const strippedPath = transformPath.split(config.set.fileTransformFolder)[1].slice(0, -3); // remove '.js'
    const relevantFilePath = path.join(config.set.path, strippedPath);

    if (relevantFilePath === transformedPath) {
      transformedContent = transform.transform(transformedContent);
    }
  }

  // Apply inline transforms defined in config.set.transforms
  if (config.set.transforms && Array.isArray(config.set.transforms)) {
    for (const inlineTransform of config.set.transforms) {
      const result = inlineTransform(transformedContent, transformedPath);
      if (typeof result === 'object') {
        transformedContent = result.content || transformedContent;
        transformedPath = result.path || transformedPath;
      }
      else {
        transformedContent = result || transformedContent;
      }
    }
  }

  // Apply banner transform last
  transformedContent = bannerTransform(transformedContent, transformedPath);

  return { content: transformedContent, path: transformedPath };
}

/**
 * Sets up the target based on the provided configuration.
 * 
 * @async
 * @param {Object} config - The configuration object.
 * 
 * @returns {Promise<{removedFiles: string[], newFiles: string[]}>}
 */
export async function set(config) {
  const output = {};

  // Run before hook if available
  if (config.set.hooks?.before) {
    await execSync(config.set.hooks.before, { stdio: 'inherit' });
  }

  if (config.set?.path) {
    // Remove vendors
    output.removedFiles = await removeVendors(config);

    // Get all relevant files and dependencies
    const includedFiles = await globby(config.set.includes, { cwd: config.get.path });
    const dependencies = !config.set.excludeDependencies
      ? await getDependenciesForIncludedFiles(includedFiles, config)
      : [];
    const files = [...new Set([...includedFiles, ...dependencies])];

    // Load global and file-specific transforms once
    const globalTransforms = config.set.globalTransformFolder
      ? await loadTransforms(config.set.globalTransformFolder)
      : [];
    const fileSpecificTransforms = config.set.fileTransformFolder
      ? await loadTransforms(config.set.fileTransformFolder)
      : [];

    let transformed = [];
    for (const file of files) {
      const getPath = path.join(config.get.path, file);
      const setPath = path.join(config.set.path, file);

      let content = fs.readFileSync(getPath, 'utf8');

      // Apply all relevant transforms (global, file-specific, inline)
      const { content: transformedContent, path: transformedPath } = await applyAllTransforms(
        setPath,
        content,
        config,
        globalTransforms,
        fileSpecificTransforms
      );

      // Write content only once and handle path changes if needed
      if (!fs.existsSync(transformedPath)) {
        fs.mkdirSync(path.dirname(transformedPath), { recursive: true });
        fs.writeFileSync(transformedPath, transformedContent, 'utf8');
        transformed.push(optimizePathForWindows(transformedPath));
      }
    }

    output.newFiles = transformed;
  }

  // Run after hook if available
  if (config.set.hooks?.after) {
    await execSync(config.set.hooks.after, { stdio: 'inherit' });
  }

  return output;
}
