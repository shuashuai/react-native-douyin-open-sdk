import { DouyinError } from './core';
export * from './types';
export { DouyinError };
export declare const Douyin: {
    configure(config: import("./types").Config): Promise<void>;
    isAppInstalled(): Promise<boolean>;
    getCapabilities(): Promise<import("./types").Capabilities>;
    prepareResources(items: import("./types").Resource[], options: import("./types").PrepareOptions): Promise<import("./types").Resource[]>;
    share(request: import("./types").MediaRequest, options?: import("./types").ShareOptions): Promise<import("./types").ShareResult>;
    shareToContacts(request: import("./types").ContactRequest, options?: import("./types").ShareOptions): Promise<import("./types").ShareResult>;
    cancelPendingShare(): Promise<void>;
};
export default Douyin;
