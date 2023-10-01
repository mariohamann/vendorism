import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { deletePathRecursively, setSource } from '../src/scripts/source.js';

const config = {
  "source": {
    "path": "./test/source",
    "hooks": {
      "before": "mkdir -p ./test/source && cp -r ./test/example ./test/source"
    }
  }
};

function checkIfFileExists(filepath) {
  const fullpath = path.resolve(filepath);
  return fs.existsSync(fullpath) && !fs.lstatSync(fullpath).isSymbolicLink();
}

function checkIfDirExists(dirpath) {
  const fullpath = path.resolve(dirpath);
  return fs.existsSync(fullpath) && fs.lstatSync(fullpath).isDirectory();
}

test('before hook is working', async (t) => {
  await setSource(config);

  assert(await checkIfDirExists('./test/source/example'));

  assert(await checkIfFileExists('./test/source/example/index.js'));

  assert(await checkIfFileExists('./test/source/example/index.js'));

  // Clean up
  deletePathRecursively('./test/source');
});

test('after hook is working', async (t) => {
  const overridenConfig = config;
  overridenConfig.source.hooks.after = "rm -rf ./test/source";

  await setSource(overridenConfig);

  assert(!await checkIfDirExists('./test/source/example'));
});
