import { globby } from "globby";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import dependencyTree from "dependency-tree";
import { optimizePathForWindows } from "./helpers.js";
import {
  tag as bannerTag,
  transform as bannerTransform,
} from "./transforms/banner.js";
// @ts-ignore
import("./configTypes.js").Config;
import { temporaryFile } from "tempy";

// In-memory cache for transforms
const transformCache = new Map();

/**
 * Retrieves the dependencies of the specified included files based on the provided configuration.
 *
 * @async
 * @param {Array.<string>} includedFiles - The list of included files for which dependencies should be retrieved.
 * @param {Config} config - The configuration object.
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of dependencies.
 */
async function getDependenciesForIncludedFiles(includedFiles, config) {
  let allDeps = new Set();

  for (const file of includedFiles) {
    const list = await dependencyTree.toList({
      filename: path.join(config.get.path, file),
      directory: config.get.path,
      filter: (path) => path.indexOf("node_modules") === -1,
      noTypeDefinitions: true,
    });

    list.forEach((dep) => {
      const relativePath = optimizePathForWindows(
        path.relative(config.get.path, dep).replace("../", "")
      );
      allDeps.add(relativePath);
    });
  }

  return Array.from(allDeps);
}

/**
 * Removes vendor files based on the provided configuration.
 *
 * @async
 * @param {Config} config - The configuration object.
 * @returns {Promise<Array.<string>>} A promise that resolves with a list of removed paths.
 */
export async function removeVendors(config) {
  const files = await globby(
    `${config.set.path}/**/*`,
    config.set.removeVendors?.globby || { gitignore: true, dot: true }
  );

  let removed = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
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
 * Loads transforms from a given folder.
 *
 * @param {string} transformFolder - The folder containing transform definitions.
 * @returns {Promise<Array>} A promise that resolves with a list of loaded transform functions.
 */
async function loadTransforms(transformFolder) {
  const transformFiles = await globby(
    `${transformFolder}/**/*.vendorism.js`,
    { gitignore: true, dot: true }
  );
  const transforms = [];

  for (const file of transformFiles) {
    const absolutePath = path.resolve(file);

    // If the file is cached, remove it from cache before re-importing
    if (transformCache.has(absolutePath)) {
      transformCache.delete(absolutePath);
    }

    // Dynamically import the fresh version of the transform file
    const module = await import(absolutePath + `?cache-bust=${Date.now()}`); // Force reload with a cache-busting string
    const transform = module.default || module; // Handle default export or named export

    // Cache the transform
    transformCache.set(absolutePath, transform);

    transforms.push({ transform, path: file });
  }

  return transforms;
}

/**
 * Handles the transformation result.
 *
 * @param {string} transformedContent - The current transformed content.
 * @param {string} transformedPath - The current transformed path.
 * @param {any} result - The result from a transformation.
 * @returns {{content: string, path: string}} - The updated content and path after applying the transformation.
 */
function handleTransformationResult(
  transformedContent,
  transformedPath,
  result
) {
  if (typeof result === "object") {
    return {
      content: result.content || transformedContent,
      path: result.path || transformedPath,
    };
  } else {
    return {
      content: result || transformedContent,
      path: transformedPath,
    };
  }
}

/**
 * Creates a diff between the transformed file and the manually edited file.
 * Saves the diff in the patch folder.
 *
 * @param {string} filePath - The path of the file to create a diff for.
 * @param {Config} config - The configuration object.
 */
export async function createDiff(filePath, config) {
  const originalPath = path.join(config.set.path, filePath);

  if (config.set.patchFolder === undefined) {
    console.error("❌ Patch folder not defined in configuration.");
    return;
  }

  if (!fs.existsSync(originalPath)) {
    console.error(`❌ File to be patched not found: ${originalPath}`);
    return;
  }

  // Load global and file-specific transforms
  const globalTransforms = config.set.globalTransformFolder
    ? await loadTransforms(config.set.globalTransformFolder)
    : [];
  const fileSpecificTransforms = config.set.fileTransformFolder
    ? await loadTransforms(config.set.fileTransformFolder)
    : [];

  // Apply transformations using applyAllTransforms
  const transformed = await applyAllTransforms(
    filePath,
    config,
    globalTransforms,
    fileSpecificTransforms,
    true
  );

  if (!transformed) {
    return;
  }

  const tempPath = temporaryFile({ name: path.basename(filePath) });
  fs.writeFileSync(tempPath, transformed.content, 'utf8');

  const patchFileName = filePath.replace(/\//g, ":") + ".vendorism.patch";
  const patchFilePath = path.join(config.set.patchFolder, patchFileName);
  try {
    execSync(
      `git diff --no-index -- ${tempPath} ${originalPath} > "${patchFilePath}" || true`
    );

    // Read the patch file and replace the temporary file path with the original path
    let patchContent = fs.readFileSync(patchFilePath, 'utf8');
    const tempFileName = tempPath.replace(/\\/g, '/'); // Replace backslashes in Windows paths
    patchContent = patchContent.replace(new RegExp(tempFileName, 'g'), '/' + originalPath);

    // Write the modified patch back to disk
    fs.writeFileSync(patchFilePath, patchContent, 'utf8');

    console.log(`✅ Patch created: ${patchFilePath}`);
  } catch (error) {
    console.error(`❌ Failed to create patch: ${patchFilePath}`, error);
  }

  // Clean up the temp file
  fs.unlinkSync(tempPath);
}

/**
 * Applies all relevant transformations to the given file (excluding patches).
 *
 * @async
 * @param {string} file - The path to the file being transformed.
 * @param {Config} config - The configuration object.
 * @param {Array} globalTransforms - List of global transform functions.
 * @param {Array} fileSpecificTransforms - List of file-specific transform functions.
 * @returns {Promise<{content: string, path: string}|undefined>} A promise that resolves with the content and path of the transformed file.
 */
async function applyAllTransforms(
  file,
  config,
  globalTransforms,
  fileSpecificTransforms,
  skipCheck = false
) {
  let getPath = path.join(config.get.path, file);

  let transformedPath = path.join(config.set.path, file);
  let transformedContent = fs.readFileSync(getPath, "utf8");

  // Apply inline transforms defined in config.set.transforms
  if (!skipCheck && fs.existsSync(transformedPath)) {
    return;
  }
  if (config.set.transforms && Array.isArray(config.set.transforms)) {
    for (const inlineTransform of config.set.transforms) {
      const result = inlineTransform(
        transformedContent,
        transformedPath
      );
      ({ content: transformedContent, path: transformedPath } =
        handleTransformationResult(
          transformedContent,
          transformedPath,
          result
        ));
    }
  }

  // Apply global transforms
  for (const { transform } of globalTransforms) {
    const result = transform.transform(transformedContent, transformedPath);
    ({ content: transformedContent, path: transformedPath } =
      handleTransformationResult(
        transformedContent,
        transformedPath,
        result
      ));
  }

  // Apply file-specific transforms
  for (const { transform, path: transformPath } of fileSpecificTransforms) {
    const strippedPath = transformPath
      .split(config.set.fileTransformFolder)[1]
      .slice(0, -13); // remove '.js'
    const relevantFilePath = path.join(config.set.path, strippedPath);

    if (relevantFilePath === transformedPath) {
      const result = transform.transform(transformedContent);
      ({ content: transformedContent, path: transformedPath } =
        handleTransformationResult(
          transformedContent,
          transformedPath,
          result
        ));
    }
  }

  // Apply banner transform last
  transformedContent = bannerTransform(transformedContent, transformedPath);

  return { content: transformedContent, path: transformedPath };
}

/**
 * Applies a single patch file to the specified file.
 *
 * @param {string} filePath - The file to which the patch should be applied.
 * @param {Config} config - The configuration object.
 */
async function applyPatch(filePath, config) {
  if (!config.set.patchFolder) {
    return;
  }

  const patchFileName =
    filePath
      .replace(config.set.path, "")
      .replace(/\\/g, "/")
      .replace(/^\//, "")
      .replace(/\//g, ":") + ".vendorism.patch";
  const patchFilePath = path.join(config.set.patchFolder, patchFileName);

  if (fs.existsSync(patchFilePath)) {
    try {
      console.log(`Applying patch: ${patchFilePath}`);
      execSync(`git apply --whitespace=fix "${patchFilePath}"`, {
        stdio: "inherit",
      });
      console.log(`✅ Patch applied: ${patchFilePath}`);
    } catch (error) {
      console.error(`❌ Failed to apply patch: ${patchFilePath}`, error);
    }
  }
}

/**
 * Sets up the target based on the provided configuration.
 *
 * @async
 * @param {Config} config - The configuration object.
 * @returns {Promise<{removedFiles: string[], newFiles: string[]}>} A promise that resolves with a list of removed and new files.
 */
export async function set(config) {
  const output = {
    removedFiles: [],
    newFiles: [],
  };

  // Run before hook if available
  if (config.set.hooks?.before) {
    await execSync(config.set.hooks.before, { stdio: "inherit" });
  }

  if (config.set?.path) {
    // Remove vendors
    // @ts-ignore
    output.removedFiles = await removeVendors(config);

    // Get all relevant files and dependencies
    const includedFiles = await globby(config.set.includes, {
      cwd: config.get.path,
    });
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

    for (const file of files) {
      const transformed = await applyAllTransforms(
        file,
        config,
        globalTransforms,
        fileSpecificTransforms
      );

      if (transformed) {
        // Save the transformed content
        fs.mkdirSync(path.dirname(transformed.path), {
          recursive: true,
        });
        fs.writeFileSync(transformed.path, transformed.content, "utf8");

        // Apply patch after saving the transformed content
        await applyPatch(transformed.path, config);

        // @ts-ignore
        output.newFiles.push(optimizePathForWindows(transformed.path));
      }
    }
  }

  // Run after hook if available
  if (config.set.hooks?.after) {
    await execSync(config.set.hooks.after, { stdio: "inherit" });
  }

  return output;
}

/**
 * Removes the file if it contains the banner and applies all transformations.
 *
 * @param {string} filePath - The path to the file being transformed.
 * @param {Config} config - The configuration object.
 * @returns {Promise<void>} A promise that resolves after the file has been processed.
 */
export async function setFile(config, filePath) {
  const fullPath = path.join(config.set.path, filePath);

  // Remove the file if it contains the banner (head)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    if (content.includes(bannerTag)) {
      fs.unlinkSync(fullPath);
    }
  }

  // Load global and file-specific transforms
  const globalTransforms = config.set.globalTransformFolder
    ? await loadTransforms(config.set.globalTransformFolder)
    : [];
  const fileSpecificTransforms = config.set.fileTransformFolder
    ? await loadTransforms(config.set.fileTransformFolder)
    : [];

  // Apply transformations using applyAllTransforms
  const transformed = await applyAllTransforms(
    filePath,
    config,
    globalTransforms,
    fileSpecificTransforms
  );

  if (!transformed) {
    return;
  }

  // Save the transformed content to the target path
  fs.mkdirSync(path.dirname(transformed.path), { recursive: true });
  fs.writeFileSync(transformed.path, transformed.content, "utf8");

  // Apply the patch if it exists
  await applyPatch(transformed.path, config);
}
