export function get(config: {
    get: {
        hooks?: {
            before?: string;
            after?: string;
        };
        url?: string;
        path: string;
        downloadConfig?: any;
    };
}): Promise<void>;
