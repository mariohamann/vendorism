export function eject(config: {
    target: {
        head?: string;
        lockFilesForVsCode?: boolean | string;
    };
}, file: string): Promise<void>;
