import { expect, test, afterEach } from 'vitest';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { get } from '../src/scripts/get.js';
import { defaults, set, removeVendors } from '../src/scripts/set.js';
import { deletePathRecursively } from '../src/scripts/helpers.js'
import { eject } from '../src/scripts/eject.js';

const getConfig = () => ({
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
    "hooks": {
      "before": "mkdir -p ./test/target",
      "after": ""
    }
  }
});

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
})

await test('before source hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.source.hooks.after = "";

  await get(localConfig);

  assert(await checkIfDirExists('./test/source/example'));
  assert(await checkIfFileExists('./test/source/example/index.js'));
});

await test('after source hook is working', async (t) => {
  await get(getConfig());
  assert(!await checkIfDirExists('./test/source/example'));
  assert(await checkIfDirExists('./test/source'));
  assert(await checkIfFileExists('./test/source/index.js'));
  assert(!await checkIfFileExists('./test/source/example/index.js'));
});

await test('before target hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.target.path = "";

  await set(localConfig);

  assert(await checkIfDirExists('./test/target'));
});

await test('after target hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.target.path = "";
  localConfig.target.hooks.after = "rm -rf ./test/target";

  await set(localConfig);

  assert(!await checkIfDirExists('./test/target'));
});

await test('files with default head are removed', async (t) => {
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/without-head.js', 'console.log("Hello World");', 'utf8');
  await fs.writeFileSync('./test/target/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  const localConfig = getConfig();
  localConfig.target.head = defaults.head;

  await removeVendors(localConfig);

  assert(await checkIfFileExists('./test/target/without-head.js'));
  assert(!await checkIfFileExists('./test/target/with-head.js'));
});

await test('files with default head and empty folders are removed recursively', async (t) => {
  await fs.mkdirSync('./test/target/sub', { recursive: true });
  await fs.writeFileSync('./test/target/sub/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  const localConfig = getConfig();
  localConfig.target.head = defaults.head;

  await removeVendors(localConfig);

  assert(!await checkIfDirExists('./test/target/sub'));
});

await test('included file is copied', async (t) => {
  await get(getConfig());
  await set(getConfig());

  assert(await checkIfFileExists('./test/target/index.js'));
});

await test('included glob is copied', async (t) => {
  const localConfig = getConfig();
  localConfig.target.includes = ['index.*'];
  localConfig.target.excludeDependencies = true;

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));
  assert(!await checkIfFileExists('./test/target/dependency.js'));
});


await test('included glob is copied without dependencies', async (t) => {
  const localConfig = getConfig();
  localConfig.target.includes = ['*.js'];
  localConfig.target.excludeDependencies = true;

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));
  assert(await checkIfFileExists('./test/target/dependency.js'));

});

await test('included file is copied with custom head', async (t) => {
  const localConfig = getConfig();
  localConfig.target.head = '/* Custom Head */\n';

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');
  assert(await content.startsWith(localConfig.target.head));
});

await test('included file is copied with default head', async (t) => {
  await get(getConfig());
  await set(getConfig());

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.startsWith(defaults.head));
});

await test('only files with head are overriden', async (t) => {
  await get(getConfig());
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

  await set(getConfig());

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await !content.startsWith(defaults.head));
});

await test('dependencies of included file are copied', async (t) => {
  await get(getConfig());
  await set(getConfig());

  assert(await checkIfFileExists('./test/target/dependency.js'));
});

await test('vendored files are returned as output.newFiles', async (t) => {
  await get(getConfig());
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

  const target = await set(getConfig());

  assert(await !target.newFiles.includes('test/target/index.js'));
  assert(await target.newFiles.includes('test/target/dependency.js'));
});


await test('removed files are returned as output.newFiles', async (t) => {
  await get(getConfig());
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  const target = await set(getConfig());

  assert(await target.removedFiles.includes('test/target/with-head.js'));
});

await test('dependencies of included file are not copied when excluded', async (t) => {
  await get(getConfig());

  const localConfig = getConfig();
  localConfig.target.excludeDependencies = true;
  await set(localConfig);

  assert(!await checkIfFileExists('./test/target/dependency.js'));
});

await test('ejecting removes head from files', async (t) => {
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  let content = fs.readFileSync('./test/target/with-head.js', 'utf8');
  assert(await content.startsWith(defaults.head));

  eject(getConfig(), './test/target/with-head.js');

  content = fs.readFileSync('./test/target/with-head.js', 'utf8');
  assert(await checkIfFileExists('./test/target/with-head.js'));
  assert(await content === 'console.log("Hello World");');
});

await test('content transforms are applied', async (t) => {
  const localConfig = getConfig();

  localConfig.target.transforms = [
    (path, content) => {
      return { path, content: content.replace('Hello', 'Goodbye') };
    },
    (path, content) => {
      return { path, content: content.replace('World', 'Someone') };
    }
  ];

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));

  assert(await checkIfFileExists('./test/target/dependency.js'));

  const content = fs.readFileSync('./test/target/dependency.js', 'utf8');

  assert(await content.includes('Goodbye Someone'));
});


await test('file path transforms are applied', async (t) => {
  const localConfig = getConfig();

  localConfig.target.transforms = [
    (path, content) => {
      return { path: path.replaceAll('dependency.js', 'transformed-dependency.js'), content: content.replaceAll('./dependency', './transformed-dependency') };
    }
  ];

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));

  assert(await checkIfFileExists('./test/target/transformed-dependency.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.includes('./transformed-dependency'));
});
