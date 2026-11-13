export type Support = 'supported' | 'unsupported' | 'unknown'
export type MediaType = 'image' | 'video'
export type Resource =
  | { type: 'file'; uri: string }
  | { type: 'photoAsset'; localIdentifier: string }
export interface Config { clientKey: string }
export interface PrepareOptions {
  mediaType: MediaType
  /** Explicitly allow iOS to create persistent Photos assets; permission must already be granted. */
  allowPhotoLibraryWrite?: boolean
}
export interface ShareOptions { timeoutMs?: number }
export interface MediaRequest {
  mediaType: MediaType
  resources: Resource[]
  state?: string
  /** Work sharing only; default edit. publish only supports one video. */
  targetPage?: 'edit' | 'publish'
  /** Work images only; false by default. */
  imageAlbumMode?: boolean
  /** Work caption, mapped to the selected SDK's title text. */
  title?: string
}
export interface DailyRequest {
  mediaType: MediaType
  /** Exactly one prepared image or video. */
  resources: [Resource]
  state?: string
}
export interface LinkRequest {
  mediaType: 'link'
  link: { url: string; title: string; description: string; thumbnailUrl?: string }
  state?: string
}
export type ContactRequest = Pick<MediaRequest, 'resources' | 'state'> & { mediaType: 'image' } | LinkRequest
export interface Capabilities {
  share: Support
  shareToContacts: Support
  shareToPublish: Support
  /** Outside v0.1 scope even where the native SDK supports it. */
  mixShare: Support
}
export interface ShareResult {
  status: 'success' | 'cancelled' | 'failed' | 'unknown'
  platform: 'android' | 'ios'
  /** SDK response phase, NOT proof that a work was published. */
  nativeResponse: Record<string, unknown>
}
export interface NativeBridge {
  configure(config: Config): Promise<void>
  isAppInstalled(): Promise<boolean>
  getCapabilities(): Promise<Capabilities>
  prepareResources(resources: Resource[], options: PrepareOptions): Promise<Resource[]>
  share(request: MediaRequest, requestId: string): Promise<ShareResult>
  forwardToDaily(request: DailyRequest, requestId: string): Promise<ShareResult>
  shareToContacts(request: ContactRequest, requestId: string): Promise<ShareResult>
  cancelPendingShare(requestId: string): Promise<void>
}
