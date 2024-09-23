import { test, afterEach, beforeEach } from 'vitest';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { get } from '../src/scripts/get.js';
import { defaults, set, removeVendors } from '../src/scripts/set.js';
import { deletePathRecursively } from '../src/scripts/helpers.js'
import { eject } from '../src/scripts/eject.js';

const getConfig = () => ({
  "get": {
    "path": "test/source",
  },
  "set": {
    "path": "test/target",
    "includes": [
      "index.js"
    ],
    "excludeDependencies": false
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

beforeEach(async () => {
  fs.mkdirSync('./test/target', { recursive: true });
  fs.cpSync('./test/example/source', './test/source', { recursive: true });
  fs.cpSync('./test/example/transforms', './test/transforms', { recursive: true });
});

afterEach(async () => {
  deletePathRecursively('./test/source');
  deletePathRecursively('./test/target');
  deletePathRecursively('./test/transforms');
})

await test('before source hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.get['hooks'] = { before: "echo 'Hello World' > ./test/source/before.txt" };

  await get(localConfig);

  assert(await checkIfFileExists('./test/source/before.txt'));
});

await test('after source hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.get['hooks'] = { after: "echo 'Hello World' > ./test/source/after.txt" };

  await get(localConfig);

  assert(await checkIfFileExists('./test/source/after.txt'));
});

await test('before target hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.set['hooks'] = { before: "echo 'Hello World' > ./test/target/before.txt" };

  await set(localConfig);

  assert(await checkIfFileExists('./test/target/before.txt'));
});

await test('after target hook is working', async (t) => {
  const localConfig = getConfig();
  localConfig.set['hooks'] = { after: "echo 'Hello World' > ./test/target/after.txt" };

  await set(localConfig);

  assert(await checkIfFileExists('./test/target/after.txt'));
});

await test('files with default head are removed', async (t) => {
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/without-head.js', 'console.log("Hello World");', 'utf8');
  await fs.writeFileSync('./test/target/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  const localConfig = getConfig();
  localConfig.set.head = defaults.head;

  await removeVendors(localConfig);

  assert(await checkIfFileExists('./test/target/without-head.js'));
  assert(!await checkIfFileExists('./test/target/with-head.js'));
});

await test('files with default head and empty folders are removed recursively', async (t) => {
  await fs.mkdirSync('./test/target/sub', { recursive: true });
  await fs.writeFileSync('./test/target/sub/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  const localConfig = getConfig();
  localConfig.set.head = defaults.head;

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
  localConfig.set.includes = ['index.*'];
  localConfig.set.excludeDependencies = true;

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));
  assert(!await checkIfFileExists('./test/target/dependency.js'));
});


await test('included glob is copied without dependencies', async (t) => {
  const localConfig = getConfig();
  localConfig.set.includes = ['*.js'];
  localConfig.set.excludeDependencies = true;

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));
  assert(await checkIfFileExists('./test/target/dependency.js'));

});

await test('included file is copied with custom head', async (t) => {
  const localConfig = getConfig();
  localConfig.set.head = '/* Custom Head */\n';

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');
  assert(await content.startsWith(localConfig.set.head));
});

await test('included file is copied with default head', async (t) => {
  await get(getConfig());
  await set(getConfig());

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.startsWith(defaults.head));
});

await test('only files with head are transformed', async (t) => {
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
  localConfig.set.excludeDependencies = true;
  await set(localConfig);

  assert(!await checkIfFileExists('./test/target/dependency.js'));
});

await test('ejecting removes default head from files', async (t) => {
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/with-head.js', defaults.head + 'console.log("Hello World");', 'utf8');

  let content = fs.readFileSync('./test/target/with-head.js', 'utf8');
  assert(await content.startsWith(defaults.head));

  eject('./test/target/with-head.js');

  content = fs.readFileSync('./test/target/with-head.js', 'utf8');
  assert(await checkIfFileExists('./test/target/with-head.js'));
  assert(await content === 'console.log("Hello World");');
});

await test('ejecting removes custom head from files', async (t) => {
  const head = '// CUSTOM HEAD';
  await fs.mkdirSync('./test/target', { recursive: true });
  await fs.writeFileSync('./test/target/with-head.js', head + 'console.log("Hello World");', 'utf8');

  let content = fs.readFileSync('./test/target/with-head.js', 'utf8');
  assert(await content.startsWith(head));

  eject('./test/target/with-head.js', { set: { head } });

  content = fs.readFileSync('./test/target/with-head.js', 'utf8');
  assert(await checkIfFileExists('./test/target/with-head.js'));
  assert(await content === 'console.log("Hello World");');
});

await test('content transforms are applied', async (t) => {
  const localConfig = getConfig();

  localConfig.set.transforms = [
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

  localConfig.set.transforms = [
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

await test('global transforms are applied to all files', async (t) => {
  const localConfig = getConfig();
  localConfig.set.globalTransformFolder = './test/transforms/global';

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));
  assert(await checkIfFileExists('./test/target/dependency.js'));

  const index = fs.readFileSync('./test/target/index.js', 'utf8');
  const dependency = fs.readFileSync('./test/target/dependency.js', 'utf8');

  assert(await index.includes('transformedDependency'));
  assert(await index.includes('./dependency'));
  assert(await dependency.includes('transformedDependency'));
});

await test('single transforms are applied to specific files', async (t) => {
  const localConfig = getConfig();
  localConfig.set.fileTransformFolder = './test/transforms/single';

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/dependency.js'));

  const content = fs.readFileSync('./test/target/dependency.js', 'utf8');

  assert(await content.includes('Hi World'));
});
