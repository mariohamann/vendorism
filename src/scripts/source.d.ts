export function setSource(config: {
    source: {
        hooks?: {
            before?: string;
            after?: string;
        };
        url?: string;
        path: string;
        downloadConfig?: any;
    };
}): Promise<void>;
