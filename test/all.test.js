import { expect, test, afterEach } from 'vitest';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { deletePathRecursively, setSource } from '../src/scripts/source.js';
import { defaults, setTarget, removeVendors } from '../src/scripts/target.js';
import { updateVsCodeReadOnlyFiles } from '../src/scripts/update-vs-code-readonly-files.js'

const config = {
  "source": {
    "path": "test/source",
    "hooks": {
      "before": "mkdir -p ./test/source && cp -r ./test/example ./test/source",
      "after": "mv ./test/source/example/* ./test/source && rm -rf ./test/source/example",
    }
  },
  "target": {
    "path": "test/target",
    "includes": [
      "index.js"
    ],
    "excludeDependencies": false,
    "lockFilesForVSCode": false,
    "hooks": {
      "before": "mkdir -p ./test/target", // This could be used to e. g. create files
      "after": "", // This could be used to e. g. delete the source folder in the end
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

afterEach(async () => {
  deletePathRecursively('./test/source');
  deletePathRecursively('./test/target');
  deletePathRecursively('./test/.vscode');
})

await test('before source hook is working', async (t) => {
  const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.source.hooks.after = "";

  await setSource(overridenConfig);

  assert(await checkIfDirExists('./test/source/example'));
  assert(await checkIfFileExists('./test/source/example/index.js'));
});

await test('after source hook is working', async (t) => {
  await setSource(config);
  assert(!await checkIfDirExists('./test/source/example'));
  assert(await checkIfDirExists('./test/source'));
  assert(await checkIfFileExists('./test/source/index.js'));
  assert(!await checkIfFileExists('./test/source/example/index.js'));
});

await test('before target hook is working', async (t) => {
  const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.target.path = "";

  await setTarget(overridenConfig);

  assert(await checkIfDirExists('./test/target'));
});

await test('after target hook is working', async (t) => {
  const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.target.path = "";
  overridenConfig.target.hooks.after = "rm -rf ./test/target";

  await setTarget(overridenConfig);

  assert(!await checkIfDirExists('./test/target'));
});

await test('files with default head are removed', async (t) => {
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/without-head.js', 'console.log("Hello World");', 'utf8');
  await fs.writeFileSync('./test/target/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');
  
  const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.target.head = defaults.head;
  
  await removeVendors(overridenConfig);

  assert(await checkIfFileExists('./test/target/without-head.js'));
  assert(!await checkIfFileExists('./test/target/with-head.js'));
});

await test('files with default head and empty folders are removed recursively', async (t) => {
  await fs.mkdirSync('./test/target/sub', { recursive: true });
  await fs.writeFileSync('./test/target/sub/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.target.head = defaults.head;
  
  await removeVendors(overridenConfig);

  assert(!await checkIfDirExists('./test/target/sub'));
});

await test('included file is copied', async (t) => {
  await setSource(config);
  await setTarget(config);

  assert(await checkIfFileExists('./test/target/index.js'));
});

await test('included file is copied with head', async (t) => {
  await setSource(config);
  await setTarget(config);

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.startsWith(config.target.head));
});

await test('included file is copied with head', async (t) => {
  await setSource(config);
  await setTarget(config);
  
  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.startsWith(config.target.head));
});

await test('only files with head are overriden', async (t) => {
  await setSource(config);
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

  await setTarget(config);

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await !content.startsWith(config.target.head));
});

await test('dependencies of included file are copied', async (t) => {
  await setSource(config);
  await setTarget(config);

  assert(await checkIfFileExists('./test/target/dependency.js'));
});


await test('dependencies of included file are copied', async (t) => {
  await setSource(config);
  
  const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.target.excludeDependencies = true;
  await setTarget(overridenConfig);

  assert(!await checkIfFileExists('./test/target/dependency.js'));
});


await test('VS Code settngs are generated in default', async (t) => {
  await updateVsCodeReadOnlyFiles([], []);

  assert(await checkIfFileExists('.vscode/settings.json'));

  await deletePathRecursively('.vscode');
});

await test('VS Code settngs are generated in alternative directory if not existing', async (t) => {
  await updateVsCodeReadOnlyFiles([], [], './test/.vscode/settings.json');

  assert(await checkIfFileExists('./test/.vscode/settings.json'));
});

await test('files are removed from VS Code settings', async (t) => {
  const oldSettings = {"files.readonlyInclude": {'to-be-removed': true, 'to-stay': true}}
  await fs.mkdirSync('./test/.vscode', { recursive: true });
  await fs.writeFileSync('./test/.vscode/settings.json', JSON.stringify(oldSettings, null, 4), 'utf8');

  await updateVsCodeReadOnlyFiles(['to-be-removed'], [], './test/.vscode/settings.json');

  assert(await checkIfFileExists('./test/.vscode/settings.json'));

  const rawData = fs.readFileSync('./test/.vscode/settings.json', 'utf8');
  const newSettings = JSON.parse(rawData);

  assert(await newSettings['files.readonlyInclude']['to-stay']);
  assert(!await newSettings['files.readonlyInclude']['to-be-removed']);
});

await test('files are added to VS Code settings', async (t) => {
  const oldSettings = {"files.readonlyInclude": {'to-be-removed': true, 'to-stay': true}}
  await fs.mkdirSync('./test/.vscode', { recursive: true });
  await fs.writeFileSync('./test/.vscode/settings.json', JSON.stringify(oldSettings, null, 4), 'utf8');

  await updateVsCodeReadOnlyFiles([], ['to-be-added'], './test/.vscode/settings.json');

  assert(await checkIfFileExists('./test/.vscode/settings.json'));

  const rawData = fs.readFileSync('./test/.vscode/settings.json', 'utf8');
  const newSettings = JSON.parse(rawData);

  assert(await newSettings['files.readonlyInclude']['to-stay']);
  assert(await newSettings['files.readonlyInclude']['to-be-added']);
});


await test('files are added to VS Code settings', async (t) => {
  const oldSettings = {"files.readonlyInclude": {'to-stay': true}}
  await fs.mkdirSync('./test/.vscode', { recursive: true });
  await fs.writeFileSync('./test/.vscode/settings.json', JSON.stringify(oldSettings, null, 4), 'utf8');

  await setSource(config);

    const overridenConfig = JSON.parse(JSON.stringify(config));
  overridenConfig.target.lockFilesForVsCode = './test/.vscode/settings.json';
  await setTarget(overridenConfig);

  const rawData = fs.readFileSync('./test/.vscode/settings.json', 'utf8');
  const newSettings = JSON.parse(rawData);

  console.log(newSettings);

  assert(await newSettings['files.readonlyInclude']['test/target/index.js']);
  assert(await newSettings['files.readonlyInclude']['test/target/dependency.js']);
  assert(await newSettings['files.readonlyInclude']['to-stay']);
});


