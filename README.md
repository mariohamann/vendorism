# Vendorism

This library provides utilities for managing vendor files, hooks, and dependencies.

## Functions

### `setSource`

This function is responsible for setting up the source based on a given configuration.

#### Parameters:

-   `config`: The configuration object.
    -   `source`: The source configuration.
        -   `url` (optional): The URL from which files should be downloaded.
        -   `path`: The directory to which files should be extracted.
        -   `hooks` (optional): Hooks to run before and after the main process.
            -   `before` (optional): A command to run before the main process.
            -   `after` (optional): A command to run after the main process.

#### Usage:

```javascript
await setSource({
	source: {
		url: "https://example.com/source.zip",
		path: "./path/to/extract",
		hooks: {
			before: "echo Setting up source...",
			after: "echo Source setup complete.",
		},
	},
});
```

### `setTarget`

This function sets up the target based on the provided configuration.

#### Parameters:

-   `config`: The configuration object.
    -   `target`: The target configuration.
        -   `path`: The path for the target.
        -   `head` (optional): The header content to prepend to target files. Uses a default if not provided.
        -   `lockFilesForVsCode` (optional): Specifies whether to lock files for VS Code. Can be a boolean or a custom path to VS Code settings.
        -   `hooks` (optional): Hooks to be executed before and after target processing.
            -   `before` (optional): Command to be executed before target processing.
            -   `after` (optional): Command to be executed after target processing.
        -   `transforms` (optional): An array of transform functions that can modify content and file paths. Each transform function takes the current file path and content as parameters and returns an object with potentially modified path and content.

#### Usage:

```javascript
await setTarget({
	target: {
		path: "./path/to/target",
		head: "/* Custom Header */",
		lockFilesForVsCode: true,
		hooks: {
			before: "echo Setting up target...",
			after: "echo Target setup complete.",
		},
		transforms: [
			(path, content) => {
				return {
					path: path.replaceAll(
						"dependency.js",
						"transformed-dependency.js"
					),
					content: content.replaceAll(
						"./dependency",
						"./transformed-dependency"
					),
				};
			},
		],
	},
});
```

### Examples:

#### Transforming Content

Using `transforms`, you can modify file content:

```javascript
const localConfig = {
	target: {
		// ... other config options
		transforms: [
			(path, content) => {
				return { path, content: content.replace("Hello", "Goodbye") };
			},
			(path, content) => {
				return { path, content: content.replace("World", "Someone") };
			},
		],
	},
};
```

#### Transforming File Paths

Similarly, you can also modify file paths:

```javascript
const localConfig = {
	target: {
		// ... other config options
		transforms: [
			(path, content) => {
				return {
					path: path.replaceAll(
						"dependency.js",
						"transformed-dependency.js"
					),
					content: content.replaceAll(
						"./dependency",
						"./transformed-dependency"
					),
				};
			},
		],
	},
};
```

### `ejectFile`

This function allows you to eject a file from being managed by the system. Ejecting involves removing a specific header from a file and optionally updating Visual Studio Code's read-only settings for the file.

#### Parameters:

-   `config`: The configuration object.
    -   `target`: The target configuration.
        -   `head` (optional): The header content that should be removed from the target file. Uses a default if not provided.
        -   `lockFilesForVsCode` (optional): Specifies whether to update files for Visual Studio Code read-only settings. Can be a boolean or a custom path to Visual Studio Code settings.
-   `file`: The path to the file that should be ejected.

#### Usage:

```javascript
await ejectFile(
	{
		target: {
			head: "/* Custom Header */",
			lockFilesForVsCode: true,
		},
	},
	"./path/to/target/file.js"
);
```

This will remove the custom header (or the default header if not provided) from the specified file. If `lockFilesForVsCode` is set, the file's read-only status in Visual Studio Code settings will also be updated.
