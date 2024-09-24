import { describe, it, afterEach, beforeEach } from 'vitest';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { get, set, setFile } from '../src/index.js';
import { removeVendors } from '../src/scripts/set.js';
import { deletePathRecursively } from '../src/scripts/helpers.js';
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
});

/**
 * Tests
 */

describe('Hooks', () => {
  it('should run the before source hook', async () => {
    const localConfig = getConfig();
    localConfig.get['hooks'] = { before: "echo 'Hello World' > ./test/source/before.txt" };

    await get(localConfig);
    assert(await checkIfFileExists('./test/source/before.txt'));
  });

  it('should run the after source hook', async () => {
    const localConfig = getConfig();
    localConfig.get['hooks'] = { after: "echo 'Hello World' > ./test/source/after.txt" };

    await get(localConfig);
    assert(await checkIfFileExists('./test/source/after.txt'));
  });

  it('should run the before target hook', async () => {
    const localConfig = getConfig();
    localConfig.set['hooks'] = { before: "echo 'Hello World' > ./test/target/before.txt" };

    await set(localConfig);
    assert(await checkIfFileExists('./test/target/before.txt'));
  });

  it('should run the after target hook', async () => {
    const localConfig = getConfig();
    localConfig.set['hooks'] = { after: "echo 'Hello World' > ./test/target/after.txt" };

    await set(localConfig);
    assert(await checkIfFileExists('./test/target/after.txt'));
  });
});

describe('File removing', () => {
  it('should remove files with the default banner', async () => {
    await fs.writeFileSync('./test/target/without-banner.js', 'console.log("Hello World");', 'utf8');
    await fs.writeFileSync('./test/target/with-banner.js', banners.default + 'console.log("Hello World");', 'utf8');

    const localConfig = getConfig();
    await removeVendors(localConfig);

    assert(await checkIfFileExists('./test/target/without-banner.js'));
    assert(!await checkIfFileExists('./test/target/with-banner.js'));
  });

  it('should remove files with banner and empty folders recursively', async () => {
    await fs.mkdirSync('./test/target/sub', { recursive: true });
    await fs.writeFileSync('./test/target/sub/with-banner.js', banners.default + 'console.log("Hello World");', 'utf8');

    const localConfig = getConfig();
    await removeVendors(localConfig);

    assert(!await checkIfDirExists('./test/target/sub'));
  });
});

describe('Included files', () => {
  it('should copy the included file', async () => {
    await get(getConfig());
    await set(getConfig());

    assert(await checkIfFileExists('./test/target/index.js'));
  });

  it('should copy the included glob', async () => {
    const localConfig = getConfig();
    localConfig.set.includes = ['index.*'];
    localConfig.set.excludeDependencies = true;

    await get(localConfig);
    await set(localConfig);

    assert(await checkIfFileExists('./test/target/index.js'));
    assert(!await checkIfFileExists('./test/target/dependency.js'));
  });

  it('should copy the included glob without dependencies', async () => {
    const localConfig = getConfig();
    localConfig.set.includes = ['*.js'];
    localConfig.set.excludeDependencies = true;

    await get(localConfig);
    await set(localConfig);

    assert(await checkIfFileExists('./test/target/index.js'));
    assert(await checkIfFileExists('./test/target/dependency.js'));
  });
});

describe('Dependencies', () => {
  it('should copy dependencies of the included file', async () => {
    await get(getConfig());
    await set(getConfig());

    assert(await checkIfFileExists('./test/target/dependency.js'));
  });

  it('should not copy dependencies when excluded', async () => {
    await get(getConfig());

    const localConfig = getConfig();
    localConfig.set.excludeDependencies = true;
    await set(localConfig);

    assert(!await checkIfFileExists('./test/target/dependency.js'));
  });
});

describe('Banners', () => {
  it('should copy the included file with the default banner', async () => {
    await get(getConfig());
    await set(getConfig());

    assert(await checkIfFileExists('./test/target/index.js'));

    const content = fs.readFileSync('./test/target/index.js', 'utf8');
    assert(await content.startsWith(banners.default));
  });

  it('should only transform files with a banner', async () => {
    await get(getConfig());
    await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

    await set(getConfig());

    const content = fs.readFileSync('./test/target/index.js', 'utf8');
    assert(await !content.includes(bannerTag));
  });

  it('should set banners according to their extension', async () => {
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

  it('should not set banners if custom transform already sets them', async () => {
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
});

describe('Output', () => {
  it('should return vendored files as output.newFiles', async () => {
    await get(getConfig());
    const target = await set(getConfig());

    assert(await target.newFiles.includes('test/target/index.js'));
    assert(await target.newFiles.includes('test/target/dependency.js'));
  });

  it('should not return non-vendored files as output.newFiles', async () => {
    await get(getConfig());
    await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

    const target = await set(getConfig());

    assert(await !target.newFiles.includes('test/target/index.js'));
    assert(await target.newFiles.includes('test/target/dependency.js'));
  });

  it('should return removed files as output.removedFiles', async () => {
    await get(getConfig());
    await fs.writeFileSync('./test/target/with-banner.js', banners.default + 'console.log("Hello World");', 'utf8');

    const target = await set(getConfig());
    assert(await target.removedFiles.includes('test/target/with-banner.js'));
  });
});

describe('Transforms', () => {
  it('should apply content transforms when only a string is returned', async () => {
    const localConfig = getConfig();

    localConfig.set.transforms = [
      (content) => content.replace('Hello', 'Goodbye'),
      (content) => content.replace('World', 'Someone'),
    ];

    await get(localConfig);
    await set(localConfig);

    assert(await checkIfFileExists('./test/target/index.js'));
    assert(await checkIfFileExists('./test/target/dependency.js'));

    const content = fs.readFileSync('./test/target/dependency.js', 'utf8');
    assert(await content.includes('Goodbye Someone'));
  });

  it('should apply content transforms when an object is returned', async () => {
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

  it('should apply file path transforms', async () => {
    const localConfig = getConfig();

    localConfig.set.transforms = [
      (content, path) => {
        return {
          path: path.replaceAll('dependency.js', 'transformed-dependency.js'),
          content: content.replaceAll('./dependency', './transformed-dependency')
        };
      }
    ];

    await get(localConfig);
    await set(localConfig);

    assert(await checkIfFileExists('./test/target/index.js'));
    assert(await checkIfFileExists('./test/target/transformed-dependency.js'));

    const content = fs.readFileSync('./test/target/index.js', 'utf8');
    assert(await content.includes('./transformed-dependency'));
  });
});

describe('Transforms folders', () => {
  it('should apply global transforms to all files', async () => {
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

  it('should apply single transforms to specific files', async () => {
    const localConfig = getConfig();
    localConfig.set.fileTransformFolder = './test/transforms/single';

    await get(localConfig);
    await set(localConfig);

    assert(await checkIfFileExists('./test/target/dependency.js'));

    const content = fs.readFileSync('./test/target/dependency.js', 'utf8');
    assert(await content.includes('Hi World'));
  });
});

describe('Single file transforms', () => {
  it('should apply setFile transforms', async () => {
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

  it('should only transform files with a banner in setFile', async () => {
    await get(getConfig());
    await fs.writeFileSync('./test/target/index.js', 'console.log("Hello World");', 'utf8');

    await setFile(getConfig(), 'index.js');

    const content = fs.readFileSync('./test/target/index.js', 'utf8');
    assert(await !content.includes(bannerTag));
  });
});
