#import "RNDouyinOpenSDK.h"
#import <DouyinOpenSDK/DouyinOpenSDKApplicationDelegate.h>
#import <DouyinOpenSDK/DouyinOpenSDKShare.h>
#import <Photos/Photos.h>

@implementation RNDouyinOpenSDK {
  NSString *_clientKey;
  NSString *_pendingId;
  RCTPromiseResolveBlock _resolve;
  RCTPromiseRejectBlock _reject;
  DouyinOpenSDKShareRequest *_request;
}
RCT_EXPORT_MODULE()
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
+ (void)application:(UIApplication *)app didFinishLaunchingWithOptions:(NSDictionary *)options {
  DouyinOpenSDKApplicationDelegate *sdk=[DouyinOpenSDKApplicationDelegate sharedInstance];
  sdk.openAutoTracker=NO;
  [sdk application:app didFinishLaunchingWithOptions:options];
}
+ (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary *)options {
  return [[DouyinOpenSDKApplicationDelegate sharedInstance] application:app openURL:url sourceApplication:options[UIApplicationOpenURLOptionsSourceApplicationKey] annotation:options[UIApplicationOpenURLOptionsAnnotationKey]];
}
- (BOOL)ready:(RCTPromiseRejectBlock)reject {
  if(!_clientKey) { reject(@"E_NOT_CONFIGURED",@"Call configure first",nil); return NO; }
  return YES;
}
RCT_REMAP_METHOD(configure, configure:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  if(_pendingId) { reject(@"E_BUSY",@"Share pending",nil); return; }
  NSString *key=config[@"clientKey"];
  if(![key isKindOfClass:NSString.class] || !key.length) { reject(@"E_INVALID_ARGUMENT",@"clientKey required",nil); return; }
  if(![[DouyinOpenSDKApplicationDelegate sharedInstance] registerAppId:key]) { reject(@"E_CONFIGURE",@"SDK registration failed",nil); return; }
  _clientKey=key; resolve(nil);
}
- (BOOL)installed { return [UIApplication.sharedApplication canOpenURL:[NSURL URLWithString:@"snssdk1128://"]]; }
RCT_REMAP_METHOD(isAppInstalled, isAppInstalledResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  if([self ready:reject]) resolve(@([self installed]));
}
RCT_REMAP_METHOD(getCapabilities, capabilitiesResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  if(![self ready:reject]) return;
  NSString *value=[self installed]?@"unknown":@"unsupported";
  resolve(@{@"share":value,@"shareToContacts":value,@"shareToPublish":value,@"mixShare":@"unsupported"});
}
- (BOOL)photoPermission {
  PHAuthorizationStatus status;
  if(@available(iOS 14,*)) status=[PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelReadWrite];
  else status=[PHPhotoLibrary authorizationStatus];
  return status==PHAuthorizationStatusAuthorized || status==PHAuthorizationStatusLimited;
}
- (PHAsset *)asset:(NSDictionary *)resource mediaType:(NSString *)type {
  if(![resource[@"type"] isEqual:@"photoAsset"]) return nil;
  PHAsset *asset=[PHAsset fetchAssetsWithLocalIdentifiers:@[resource[@"localIdentifier"]] options:nil].firstObject;
  PHAssetMediaType expected=[type isEqual:@"video"]?PHAssetMediaTypeVideo:PHAssetMediaTypeImage;
  return asset.mediaType==expected?asset:nil;
}
RCT_REMAP_METHOD(prepareResources, prepare:(NSArray *)resources options:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  if(![self ready:reject]) return;
  if(![self photoPermission]) { reject(@"E_PERMISSION",@"Grant Photos read/write permission first; SDK never prompts",nil); return; }
  NSMutableArray *output=[NSMutableArray array];
  for(NSDictionary *resource in resources) {
    if([resource[@"type"] isEqual:@"photoAsset"]) {
      if(![self asset:resource mediaType:options[@"mediaType"]]) { reject(@"E_RESOURCE",@"Asset unavailable or wrong media type",nil); return; }
    } else {
      NSURL *url=[NSURL URLWithString:resource[@"uri"]];
      if(![options[@"allowPhotoLibraryWrite"] boolValue]) { reject(@"E_PHOTO_WRITE_REQUIRED",@"Explicit allowPhotoLibraryWrite required",nil); return; }
      if(!url.isFileURL || ![[NSFileManager defaultManager] isReadableFileAtPath:url.path]) { reject(@"E_RESOURCE",@"Readable file URL required",nil); return; }
    }
  }
  // One Photos transaction; no partial asset list is returned on failure.
  [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
    for(NSDictionary *resource in resources) {
      if([resource[@"type"] isEqual:@"photoAsset"]) { [output addObject:resource]; continue; }
      NSURL *url=[NSURL URLWithString:resource[@"uri"]];
      PHAssetChangeRequest *change=[options[@"mediaType"] isEqual:@"video"]
        ? [PHAssetChangeRequest creationRequestForAssetFromVideoAtFileURL:url]
        : [PHAssetChangeRequest creationRequestForAssetFromImageAtFileURL:url];
      NSString *identifier=change.placeholderForCreatedAsset.localIdentifier;
      if(identifier) [output addObject:@{@"type":@"photoAsset",@"localIdentifier":identifier}];
    }
  } completionHandler:^(BOOL success,NSError *error) {
    if(success && output.count==resources.count) resolve(output);
    else reject(@"E_RESOURCE",@"Photos import failed",error);
  }];
}
RCT_REMAP_METHOD(share, share:(NSDictionary *)request requestId:(NSString *)requestId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [self send:request requestId:requestId contacts:NO resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(shareToContacts, contacts:(NSDictionary *)request requestId:(NSString *)requestId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [self send:request requestId:requestId contacts:YES resolve:resolve reject:reject];
}
- (void)send:(NSDictionary *)data requestId:(NSString *)requestId contacts:(BOOL)contacts resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  if(![self ready:reject]) return;
  if(_pendingId) { reject(@"E_BUSY",@"Share pending",nil); return; }
  if(![self installed]) { reject(@"E_NOT_INSTALLED",@"Douyin main App not installed",nil); return; }
  DouyinOpenSDKShareRequest *req=[DouyinOpenSDKShareRequest new];
  req.targetApp=DouyinOpenSDKTargetDouyinApp;
  req.shareAction=contacts?DouyinOpenSDKShareTypeShareContentToIM:DouyinOpenSDKShareTypePublishMedia;
  req.state=data[@"state"];
  if([data[@"mediaType"] isEqual:@"link"]) {
    NSDictionary *link=data[@"link"];
    DouyinOpenSDKShareLink *obj=[DouyinOpenSDKShareLink new];
    obj.linkURLString=link[@"url"]; obj.linkTitle=link[@"title"]; obj.linkDescription=link[@"description"];
    obj.linkCoverURLString=link[@"thumbnailUrl"]?:@""; req.shareLink=obj;
  } else {
    if(![self photoPermission]) { reject(@"E_PERMISSION",@"Photos permission required",nil); return; }
    NSMutableArray *identifiers=[NSMutableArray array];
    for(NSDictionary *resource in data[@"resources"]) {
      if(![self asset:resource mediaType:data[@"mediaType"]]) { reject(@"E_RESOURCE",@"Use prepareResources or readable photoAsset of matching media type",nil); return; }
      [identifiers addObject:resource[@"localIdentifier"]];
    }
    req.mediaType=[data[@"mediaType"] isEqual:@"video"]?DouyinOpenSDKShareMediaTypeVideo:DouyinOpenSDKShareMediaTypeImage;
    req.localIdentifiers=identifiers;
    req.imageAlbumMode=[data[@"imageAlbumMode"] boolValue];
    req.landedPageType=[data[@"targetPage"] isEqual:@"publish"]?DouyinOpenSDKLandedPagePublish:DouyinOpenSDKLandedPageEdit;
    if(data[@"title"]) { req.useNewShareAbility=YES; req.title=[DouyinOpenSDKShareTitle new]; req.title.text=data[@"title"]; }
  }
  _request=req; _pendingId=requestId; _resolve=resolve; _reject=reject;
  __weak RNDouyinOpenSDK *weakSelf=self;
  BOOL sent=[req sendShareRequestWithCompleteBlock:^(DouyinOpenSDKShareResponse *response) {
    dispatch_async(dispatch_get_main_queue(), ^{
      RNDouyinOpenSDK *self=weakSelf;
      if(!self || ![self->_pendingId isEqual:requestId]) return;
      NSString *status=response.isSucceed?@"success":response.errCode==DouyinOpenSDKErrorCodeUserCanceled?@"cancelled":response.errCode==DouyinOpenSDKErrorCodeUnknown?@"unknown":@"failed";
      NSDictionary *raw=@{@"isSucceed":@(response.isSucceed),@"errCode":@(response.errCode),@"errString":response.errString?:@"",@"shareState":@(response.shareState),@"subErrorCode":@(response.subErrorCode),@"state":response.state?:@""};
      RCTPromiseResolveBlock done=self->_resolve; [self clear];
      done(@{@"status":status,@"platform":@"ios",@"nativeResponse":raw});
    });
  }];
  if(!sent && [_pendingId isEqual:requestId]) { [self clear]; reject(@"E_SEND_FAILED",@"SDK refused request",nil); }
}
- (void)clear { _pendingId=nil; _resolve=nil; _reject=nil; _request=nil; }
RCT_REMAP_METHOD(cancelPendingShare, cancel:(NSString *)requestId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  if([_pendingId isEqual:requestId]) { RCTPromiseRejectBlock done=_reject; [self clear]; done(@"E_CANCELLED",@"Local wait cancelled; Douyin may continue",nil); }
  resolve(nil);
}
- (void)invalidate { dispatch_async(dispatch_get_main_queue(), ^{ if(self->_reject) self->_reject(@"E_INVALIDATED",@"React instance invalidated",nil); [self clear]; }); }
@end
