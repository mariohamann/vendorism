type Hooks = {
    /**
     * - Command to execute before processing.
     */
    before?: string;
    /**
     * - Command to execute after processing.
     */
    after?: string;
};
type GetConfig = {
    /**
     * - The base path of the source files.
     */
    path: string;
    /**
     * - The URL from which files should be downloaded.
     */
    url?: string;
    /**
     * - Hooks to execute before and after processing.
     */
    hooks?: Hooks;
    /**
     * - Configuration for the download process.
     */
    downloadConfig?: any;
};
type SetConfig = {
    /**
     * - The base path of the target files.
     */
    path: string;
    /**
     * - The list of files to include in the target.
     */
    includes: string[];
    /**
     * - Whether to exclude dependencies from the target.
     */
    excludeDependencies?: boolean;
    /**
     * - An array of transform functions that modify file content and paths.
     */
    transforms?: Function[];
    /**
     * - The folder containing global transform definitions.
     */
    globalTransformFolder?: string;
    /**
     * - The folder containing file-specific transform definitions.
     */
    fileTransformFolder?: string;
    /**
     * - The folder containing patches to apply to files.
     */
    patchFolder?: string;
    /**
     * - Hooks to execute before and after processing.
     */
    hooks?: Hooks;
    /**
     * - Configuration for removing vendors.
     */
    removeVendors?: {
        globby?: any;
    };
};
type Config = {
    /**
     * - Configuration for downloading and extracting files.
     */
    get: GetConfig;
    /**
     * - Configuration for handling target files.
     */
    set: SetConfig;
};
