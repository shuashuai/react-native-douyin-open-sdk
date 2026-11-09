#import <React/RCTBridgeModule.h>
#import <React/RCTInvalidating.h>
#import <UIKit/UIKit.h>
@interface RNDouyinOpenSDK : NSObject <RCTBridgeModule, RCTInvalidating>
+ (void)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options;
+ (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary *)options;
@end
