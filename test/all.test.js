import { test, afterEach, beforeEach } from 'vitest';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { get, set, setFile } from '../src/index.js';
import { removeVendors } from '../src/scripts/set.js';
import { deletePathRecursively } from '../src/scripts/helpers.js'
import { banners, tag as bannerTag, description as bannerDescription } from '../src/scripts/transforms/banner.js';

/**
 * Defaults
 */

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

/**
 * Tests
 */

/* Hooks */

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

/* File removing */

await test('files with default banner are removed', async (t) => {
  await fs.writeFileSync('./test/target/without-banner.js', 'console.log("Hello World");', 'utf8');
  await fs.writeFileSync('./test/target/with-banner.js', banners.default + 'console.log("Hello World");', 'utf8');

  const localConfig = getConfig();

  await removeVendors(localConfig);

  assert(await checkIfFileExists('./test/target/without-banner.js'));
  assert(!await checkIfFileExists('./test/target/with-banner.js'));
});

await test('files with default banner and empty folders are removed recursively', async (t) => {
  await fs.mkdirSync('./test/target/sub', { recursive: true });
  await fs.writeFileSync('./test/target/sub/with-banner.js', banners.default + 'console.log("Hello World");', 'utf8');

  const localConfig = getConfig();

  await removeVendors(localConfig);

  assert(!await checkIfDirExists('./test/target/sub'));
});

/* Included files */

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

/* Dependencies */

await test('dependencies of included file are copied', async (t) => {
  await get(getConfig());
  await set(getConfig());

  assert(await checkIfFileExists('./test/target/dependency.js'));
});

await test('dependencies of included file are not copied when excluded', async (t) => {
  await get(getConfig());

  const localConfig = getConfig();
  localConfig.set.excludeDependencies = true;
  await set(localConfig);

  assert(!await checkIfFileExists('./test/target/dependency.js'));
});

/* Banners */

await test('included file is copied with default banner', async (t) => {
  await get(getConfig());
  await set(getConfig());

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.startsWith(banners.default));
});

await test('only files with banner are transformed', async (t) => {
  await get(getConfig());
  await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

  await set(getConfig());

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await !content.includes(bannerTag));
});

await test('banners are set according to their extension', async (t) => {
  const localConfig = getConfig();
  localConfig.set.includes = ['extensions/*'];

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/extensions/example.js'));
  assert(await checkIfFileExists('./test/target/extensions/example.unknown'));
  assert(await checkIfFileExists('./test/target/extensions/example.html'));
  assert(await checkIfFileExists('./test/target/extensions/example.njk'));
  assert(await checkIfFileExists('./test/target/extensions/example.hbs'));
  assert(await checkIfFileExists('./test/target/extensions/example.md'));
  assert(await checkIfFileExists('./test/target/extensions/example-with-frontmatter.md'));

  const js = fs.readFileSync('./test/target/extensions/example.js', 'utf8');
  const unknown = fs.readFileSync('./test/target/extensions/example.unknown', 'utf8');
  const html = fs.readFileSync('./test/target/extensions/example.html', 'utf8');
  const njk = fs.readFileSync('./test/target/extensions/example.njk', 'utf8');
  const hbs = fs.readFileSync('./test/target/extensions/example.hbs', 'utf8');
  const md = fs.readFileSync('./test/target/extensions/example.md', 'utf8');
  const mdWithFrontmatter = fs.readFileSync('./test/target/extensions/example-with-frontmatter.md', 'utf8');

  assert(await js.startsWith(banners.default));
  assert(await unknown.startsWith(banners.default));
  assert(await html.startsWith(banners.html));
  assert(await njk.startsWith(banners.jinja2));
  assert(await hbs.startsWith(banners.handlebars));
  assert(await md.startsWith(banners.html));
  assert(await mdWithFrontmatter.includes(banners.frontmatter));
});

await test('banner are not set if it already exists by custom transform', async (t) => {
  const localConfig = getConfig();

  localConfig.set.transforms = [
    (content) => {
      return `// ${bannerTag}\n\n${content}`;
    },
  ];

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await content.includes(bannerTag));
  assert(await !content.includes(bannerDescription));
});

/* Output */

await test('vendored files are returned as output.newFiles', async (t) => {
  await get(getConfig());

  const target = await set(getConfig());

  assert(await target.newFiles.includes('test/target/index.js'));
  assert(await target.newFiles.includes('test/target/dependency.js'));
});

await test('not vendored files are not returned as output.newFiles', async (t) => {
  await get(getConfig());
  await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

  const target = await set(getConfig());

  assert(await !target.newFiles.includes('test/target/index.js'));
  assert(await target.newFiles.includes('test/target/dependency.js'));
});

await test('removed files are returned as output.newFiles', async (t) => {
  await get(getConfig());
  await fs.writeFileSync('./test/target/with-banner.js', banners.default + 'console.log("Hello World");', 'utf8');

  const target = await set(getConfig());

  assert(await target.removedFiles.includes('test/target/with-banner.js'));
});

/* Transforms */

await test('content transforms are applied when only string is returned', async (t) => {
  const localConfig = getConfig();

  localConfig.set.transforms = [
    (content) => {
      return content.replace('Hello', 'Goodbye');
    },
    (content) => {
      return content.replace('World', 'Someone');
    }
  ];

  await get(localConfig);
  await set(localConfig);

  assert(await checkIfFileExists('./test/target/index.js'));

  assert(await checkIfFileExists('./test/target/dependency.js'));

  const content = fs.readFileSync('./test/target/dependency.js', 'utf8');

  assert(await content.includes('Goodbye Someone'));
});

await test('content transforms are applied', async (t) => {
  const localConfig = getConfig();

  localConfig.set.transforms = [
    (content, path) => {
      return { path, content: content.replace('Hello', 'Goodbye') };
    },
    (content, path) => {
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
    (content, path) => {
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

/* Transforms folders */

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

/* Single file transforms */

await test('setFile transforms are applied', async (t) => {
  const localConfig = getConfig();
  const filePath = './index.js';

  localConfig.set.transforms = [
    (content) => content.replace('log', 'error'),
  ];

  await setFile(localConfig, filePath);

  assert(await checkIfFileExists('./test/target/index.js'));

  const content = fs.readFileSync('./test/target/index.js', 'utf8');
  assert(content.includes('console.error'));
});

await test('only files with banner are transformed in setFile', async (t) => {
  await get(getConfig());
  await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

  await setFile(getConfig(), 'index.js');

  const content = fs.readFileSync('./test/target/index.js', 'utf8');

  assert(await !content.includes(bannerTag));
});
