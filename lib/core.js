"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DouyinError = void 0;
exports.validateRequest = validateRequest;
exports.createDouyin = createDouyin;
class DouyinError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'DouyinError';
    }
}
exports.DouyinError = DouyinError;
function fail(message) { throw new DouyinError('E_INVALID_ARGUMENT', message); }
function object(value, allowed) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail('Expected object');
    for (const key of Object.keys(value))
        if (!allowed.includes(key))
            fail(`Unknown field: ${key}`);
}
function text(value, name) {
    if (typeof value !== 'string' || !value.trim())
        fail(`${name} must be a nonempty string`);
}
function optionalText(value, name) { if (value !== undefined)
    text(value, name); }
function https(value, name) {
    text(value, name);
    try {
        const u = new URL(value);
        if (u.protocol !== 'https:' || !u.hostname || u.username || u.password)
            fail(`${name} must be HTTPS without credentials`);
    }
    catch {
        fail(`${name} must be HTTPS without credentials`);
    }
}
function resources(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 12)
        fail('resources requires 1–12 items (conservative cross-platform limit)');
    for (const r of value) {
        object(r, r?.type === 'file' ? ['type', 'uri'] : ['type', 'localIdentifier']);
        if (r.type === 'file') {
            text(r.uri, 'uri');
            if (!r.uri.startsWith('file:///') && !r.uri.startsWith('content://'))
                fail('Only file:/// and Android content:// resources are accepted');
        }
        else if (r.type === 'photoAsset')
            text(r.localIdentifier, 'localIdentifier');
        else
            fail('Unknown resource type');
    }
}
function validateRequest(request, contacts) {
    object(request, contacts ? ['mediaType', 'resources', 'state', 'link'] : ['mediaType', 'resources', 'state', 'targetPage', 'imageAlbumMode', 'title']);
    optionalText(request.state, 'state');
    if (request.mediaType === 'link') {
        if (!contacts || 'resources' in request)
            fail('Links only support contacts, without resources');
        object(request.link, ['url', 'title', 'description', 'thumbnailUrl']);
        https(request.link.url, 'link.url');
        text(request.link.title, 'link.title');
        text(request.link.description, 'link.description');
        if (request.link.thumbnailUrl !== undefined)
            https(request.link.thumbnailUrl, 'link.thumbnailUrl');
        return;
    }
    if (request.mediaType !== 'image' && request.mediaType !== 'video')
        fail('Unsupported mediaType');
    if ('link' in request)
        fail('Media requests cannot include link');
    resources(request.resources);
    if (contacts && (request.mediaType !== 'image' || request.resources.length !== 1))
        fail('Contacts only support one image or a link');
    if (!contacts) {
        const req = request;
        if (req.targetPage !== undefined && req.targetPage !== 'edit' && req.targetPage !== 'publish')
            fail('Invalid targetPage');
        if (req.targetPage === 'publish' && (req.mediaType !== 'video' || req.resources.length !== 1))
            fail('publish requires one video');
        if (req.imageAlbumMode !== undefined && (typeof req.imageAlbumMode !== 'boolean' || req.mediaType !== 'image'))
            fail('imageAlbumMode requires image media');
        optionalText(req.title, 'title');
    }
}
function createDouyin(native) {
    let configured = false;
    let sequence = 0;
    let pending;
    function ready() { if (!configured)
        throw new DouyinError('E_NOT_CONFIGURED', 'Call configure first'); }
    async function send(request, mode, options = {}) {
        ready();
        if (mode === 'daily') {
            object(request, ['mediaType', 'resources', 'state']);
            validateRequest(request, false);
            if (!('resources' in request) || request.resources.length !== 1)
                fail('Daily forwarding requires one image or video');
        }
        else {
            validateRequest(request, mode === 'contacts');
        }
        object(options, ['timeoutMs']);
        const timeout = options.timeoutMs ?? 120000;
        if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 600000)
            fail('timeoutMs must be 1000–600000');
        if (pending)
            throw new DouyinError('E_BUSY', 'Another share is pending');
        const id = `rn-${Date.now()}-${++sequence}`;
        return new Promise((resolve, reject) => {
            const finish = () => { if (pending?.id !== id)
                return false; clearTimeout(pending.timer); pending = undefined; return true; };
            let cancelling = false;
            const cancel = async (code) => {
                if (pending?.id !== id || cancelling)
                    return;
                cancelling = true;
                // Native cancel clears only local waiting, never cancels an operation in Douyin.
                try {
                    await native.cancelPendingShare(id);
                }
                catch (e) {
                    if (finish())
                        reject(e);
                    return;
                }
                if (finish())
                    reject(new DouyinError(code, 'Stopped waiting; Douyin operation may continue'));
            };
            pending = { id, timer: setTimeout(() => { void cancel('E_TIMEOUT'); }, timeout), cancel: () => cancel('E_CANCELLED') };
            let task;
            try {
                if (mode === 'daily')
                    task = native.forwardToDaily(request, id);
                else if (mode === 'contacts')
                    task = native.shareToContacts(request, id);
                else
                    task = native.share(request, id);
            }
            catch (error) {
                if (finish())
                    reject(error);
                return;
            }
            task.then(result => { if (!cancelling && finish())
                resolve(result); }, error => { if (!cancelling && finish())
                reject(error); });
        });
    }
    return {
        async configure(config) {
            object(config, ['clientKey']);
            text(config.clientKey, 'clientKey');
            if (pending)
                throw new DouyinError('E_BUSY', 'Cannot configure during share');
            await native.configure(config);
            configured = true;
        },
        async isAppInstalled() { ready(); return native.isAppInstalled(); },
        async getCapabilities() { ready(); return native.getCapabilities(); },
        async prepareResources(items, options) {
            ready();
            resources(items);
            object(options, ['mediaType', 'allowPhotoLibraryWrite']);
            if (options.mediaType !== 'image' && options.mediaType !== 'video')
                fail('Invalid mediaType');
            if (options.allowPhotoLibraryWrite !== undefined && typeof options.allowPhotoLibraryWrite !== 'boolean')
                fail('Invalid allowPhotoLibraryWrite');
            return native.prepareResources(items, options);
        },
        share(request, options) { return send(request, 'work', options); },
        shareToContacts(request, options) { return send(request, 'contacts', options); },
        forwardToDaily(request, options) { return send(request, 'daily', options); },
        async cancelPendingShare() { await pending?.cancel(); },
    };
}
