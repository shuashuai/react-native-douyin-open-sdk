import type { NativeBridge, Config, Resource, PrepareOptions, MediaRequest, ContactRequest, DailyRequest, ShareOptions, ShareResult } from './types';
export declare class DouyinError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare function validateRequest(request: MediaRequest | ContactRequest, contacts: boolean): void;
export declare function createDouyin(native: NativeBridge): {
    configure(config: Config): Promise<void>;
    isAppInstalled(): Promise<boolean>;
    getCapabilities(): Promise<import("./types").Capabilities>;
    prepareResources(items: Resource[], options: PrepareOptions): Promise<Resource[]>;
    share(request: MediaRequest, options?: ShareOptions): Promise<ShareResult>;
    shareToContacts(request: ContactRequest, options?: ShareOptions): Promise<ShareResult>;
    forwardToDaily(request: DailyRequest, options?: ShareOptions): Promise<ShareResult>;
    cancelPendingShare(): Promise<void>;
};
