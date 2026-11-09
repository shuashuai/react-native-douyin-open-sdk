package com.finstao.douyin;

import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.bytedance.sdk.open.aweme.adapter.okhttp.OpenNetworkOkHttpServiceImpl;
import com.bytedance.sdk.open.aweme.adapter.image.picasso.PicassoOpenImageServiceImpl;
import com.bytedance.sdk.open.aweme.core.OpenHostInfoService;
import android.content.pm.PackageInfo;
import android.util.SparseArray;
import androidx.core.content.FileProvider;
import com.facebook.react.bridge.*;
import com.bytedance.sdk.open.douyin.DouYinOpenApiFactory;
import com.bytedance.sdk.open.douyin.api.DouYinOpenApi;
import com.bytedance.sdk.open.douyin.ShareToContact;
import com.bytedance.sdk.open.douyin.model.ContactHtmlObject;
import com.bytedance.sdk.open.aweme.init.DouYinOpenSDKConfig;
import com.bytedance.sdk.open.aweme.base.*;
import com.bytedance.sdk.open.aweme.share.Share;
import com.bytedance.sdk.open.aweme.common.model.BaseResp;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.lang.ref.WeakReference;

public final class DouyinModule extends ReactContextBaseJavaModule {
  private static WeakReference<DouyinModule> active = new WeakReference<>(null);
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private Promise pending;
  private String pendingId;
  private int pendingType;
  private String callbackToken;
  private File pendingDir;
  private final ArrayList<Uri> grants = new ArrayList<>();
  private String clientKey;
  public DouyinModule(ReactApplicationContext context) { super(context); active = new WeakReference<>(this); }
  @Override public String getName() { return "RNDouyinOpenSDK"; }
  private Activity activity() {
    Activity value = getCurrentActivity();
    if (value == null) throw new IllegalStateException("E_NO_ACTIVITY");
    return value;
  }
  private DouYinOpenApi api() {
    if (clientKey == null) throw new IllegalStateException("E_NOT_CONFIGURED");
    return DouYinOpenApiFactory.create(activity());
  }
  private void reject(Promise p, Exception e) {
    String code = e.getMessage();
    p.reject(code != null && code.startsWith("E_") ? code : "E_NATIVE", e.getMessage(), e);
  }
  @ReactMethod public void configure(ReadableMap config, Promise p) {
    UiThreadUtil.runOnUiThread(() -> {
      try {
        if (pending != null) throw new IllegalStateException("E_BUSY");
        String key = config.getString("clientKey");
        if (key == null || key.isEmpty()) throw new IllegalArgumentException("E_INVALID_ARGUMENT");
        DouYinOpenApiFactory.initConfig(new DouYinOpenSDKConfig.Builder()
          .context(getReactApplicationContext()).clientKey(key).autoStartTracker(false)
          .networkService(new OpenNetworkOkHttpServiceImpl())
          .imageService(new PicassoOpenImageServiceImpl())
          .hostInfoService(new OpenHostInfoService() {
            private PackageInfo info() { try { return getReactApplicationContext().getPackageManager().getPackageInfo(getReactApplicationContext().getPackageName(),0); } catch(Exception e) { return new PackageInfo(); } }
            public String getDeviceId() { return ""; }
            public String getInstallId() { return ""; }
            public String getChannel() { return ""; }
            public String getAppId() { return key; }
            public String getAppName() { return getReactApplicationContext().getApplicationInfo().loadLabel(getReactApplicationContext().getPackageManager()).toString(); }
            public String getUpdateVersionCode() { return getVersionCode(); }
            public String getVersionCode() { return String.valueOf(info().versionCode); }
            public String getVersionName() { return info().versionName == null ? "" : info().versionName; }
            public SparseArray<String> extraInfo() { return new SparseArray<>(); }
          }).build());
        clientKey = key; io.execute(this::cleanExpired); p.resolve(null);
      } catch (Exception e) { reject(p, e); }
    });
  }
  @ReactMethod public void isAppInstalled(Promise p) {
    UiThreadUtil.runOnUiThread(() -> { try { p.resolve(api().isAppInstalled()); } catch (Exception e) { reject(p,e); } });
  }
  private String support(boolean supported) { return supported ? "supported" : "unsupported"; }
  @ReactMethod public void getCapabilities(Promise p) {
    UiThreadUtil.runOnUiThread(() -> {
      try {
        DouYinOpenApi a = api(); WritableMap result = Arguments.createMap();
        result.putString("share", support(a.isAppSupportShare()));
        result.putString("shareToContacts", support(a.isAppSupportShareToContacts()));
        result.putString("shareToPublish", support(a.isAppSupportShareToPublish()));
        result.putString("mixShare", "unsupported"); p.resolve(result);
      } catch (Exception e) { reject(p,e); }
    });
  }
  private Uri resource(ReadableMap map) throws IOException {
    if (!"file".equals(map.getString("type"))) throw new IOException("E_UNSUPPORTED");
    Uri uri = Uri.parse(map.getString("uri"));
    if (!"file".equals(uri.getScheme()) && !"content".equals(uri.getScheme())) throw new IOException("E_INVALID_ARGUMENT");
    return uri;
  }
  @ReactMethod public void prepareResources(ReadableArray resources, ReadableMap options, Promise p) {
    io.execute(() -> {
      try {
        if (clientKey == null) throw new IllegalStateException("E_NOT_CONFIGURED");
        for (int i=0;i<resources.size();i++) {
          try (InputStream in = getReactApplicationContext().getContentResolver().openInputStream(resource(resources.getMap(i)))) {
            if (in == null) throw new IOException("E_RESOURCE");
          }
        }
        p.resolve(Arguments.makeNativeArray(resources.toArrayList()));
      } catch (Exception e) { reject(p,e); }
    });
  }
  @ReactMethod public void share(ReadableMap request, String id, Promise p) { start(request,id,p,false); }
  @ReactMethod public void shareToContacts(ReadableMap request, String id, Promise p) { start(request,id,p,true); }
  private void start(ReadableMap request, String id, Promise p, boolean contacts) {
    UiThreadUtil.runOnUiThread(() -> {
      try {
        DouYinOpenApi a = api();
        if (pending != null) throw new IllegalStateException("E_BUSY");
        if (!a.isAppInstalled()) throw new IllegalStateException("E_NOT_INSTALLED");
        if (contacts ? !a.isAppSupportShareToContacts() : !a.isAppSupportShare()) throw new IllegalStateException("E_UNSUPPORTED");
        boolean publish = request.hasKey("targetPage") && "publish".equals(request.getString("targetPage"));
        if (publish && !a.isAppSupportShareToPublish()) throw new IllegalStateException("E_UNSUPPORTED");
        pending=p; pendingId=id; callbackToken=UUID.randomUUID().toString();
        pendingDir = new File(getReactApplicationContext().getCacheDir(), "rn-douyin/" + UUID.randomUUID());
        if (!pendingDir.mkdirs()) throw new IOException("E_RESOURCE");
        final File dir=pendingDir;
        io.execute(() -> {
          try {
            ArrayList<String> paths = new ArrayList<>();
            if (request.hasKey("resources")) {
              ReadableArray items = request.getArray("resources");
              for (int i=0;i<items.size();i++) {
                Uri sourceUri=resource(items.getMap(i));
                String mime=getReactApplicationContext().getContentResolver().getType(sourceUri);
                String ext=android.webkit.MimeTypeMap.getSingleton().getExtensionFromMimeType(mime==null?"":mime);
                if(ext==null && sourceUri.getLastPathSegment()!=null) {
                  String name=sourceUri.getLastPathSegment(); int dot=name.lastIndexOf('.');
                  if(dot>=0 && name.substring(dot+1).matches("[A-Za-z0-9]{1,8}")) ext=name.substring(dot+1);
                }
                if(ext==null) throw new IOException("E_RESOURCE_FORMAT");
                File file=new File(dir, i + "." + ext);
                try (InputStream in=getReactApplicationContext().getContentResolver().openInputStream(resource(items.getMap(i))); OutputStream out=new FileOutputStream(file)) {
                  if (in==null) throw new IOException("E_RESOURCE");
                  byte[] buffer=new byte[65536]; long total=0; int n;
                  while ((n=in.read(buffer))!=-1) { total+=n; if(total>512L*1024*1024) throw new IOException("E_RESOURCE_TOO_LARGE"); out.write(buffer,0,n); }
                }
                paths.add(file.getAbsolutePath());
              }
            }
            UiThreadUtil.runOnUiThread(() -> {
              if (!id.equals(pendingId)) { delete(dir); return; }
              try { launch(request, paths, contacts, publish, a); }
              catch(Exception e) { failPending(e); }
            });
          } catch(Exception e) { UiThreadUtil.runOnUiThread(() -> { if(id.equals(pendingId)) failPending(e); else delete(dir); }); }
        });
      } catch(Exception e) { if(pending==p) failPending(e); else reject(p,e); }
    });
  }
  private void launch(ReadableMap request, ArrayList<String> paths, boolean contacts, boolean publish, DouYinOpenApi a) throws Exception {
    if(!paths.isEmpty() && !a.isShareSupportFileProvider()) throw new IllegalStateException("E_UNSUPPORTED");
    ArrayList<String> uris=new ArrayList<>();
    for(String path:paths) {
      Uri uri=FileProvider.getUriForFile(getReactApplicationContext(),getReactApplicationContext().getPackageName()+".rndouyin.files",new File(path));
      activity().grantUriPermission("com.ss.android.ugc.aweme",uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);
      grants.add(uri); uris.add(uri.toString());
    }
    MediaContent content = new MediaContent();
    if("video".equals(request.getString("mediaType"))) { VideoObject obj=new VideoObject(); obj.mVideoPaths=uris; content.mMediaObject=obj; }
    else { ImageAlbumObject obj=new ImageAlbumObject(); obj.mImagePaths=uris; obj.setImageAlbum(request.hasKey("imageAlbumMode") && request.getBoolean("imageAlbumMode")); content.mMediaObject=obj; }
    Bundle callback = new Bundle(); callback.putString("rn_request_id",callbackToken);
    boolean sent;
    if(contacts) {
      ShareToContact.Request req=new ShareToContact.Request();
      req.callerLocalEntry=DouyinCallbackActivity.class.getName(); req.callbackExtras=callback;
      if(request.hasKey("state")) req.mState=request.getString("state");
      if("link".equals(request.getString("mediaType"))) {
        ReadableMap l=request.getMap("link"); ContactHtmlObject html=new ContactHtmlObject();
        html.setHtml(l.getString("url")); html.setTitle(l.getString("title")); html.setDiscription(l.getString("description"));
        if(l.hasKey("thumbnailUrl")) html.setThumbUrl(l.getString("thumbnailUrl")); req.htmlObject=html;
      } else req.mMediaContent=content;
      pendingType=req.getType(); sent=a.shareToContacts(req);
    } else {
      Share.Request req=new Share.Request(); req.callerLocalEntry=DouyinCallbackActivity.class.getName(); req.callbackExtras=callback;
      req.mMediaContent=content; req.shareToPublish=publish;
      if(request.hasKey("state")) req.mState=request.getString("state");
      if(request.hasKey("title")) { req.newShare=true; req.shareParam=new ShareParam(); req.shareParam.titleObject=new TitleObject(); req.shareParam.titleObject.title=request.getString("title"); }
      pendingType=req.getType(); sent=a.share(req);
    }
    if(!sent) throw new IllegalStateException("E_SEND_FAILED");
  }
  static void receive(BaseResp response) {
    DouyinModule module=active.get(); if(module==null) return;
    UiThreadUtil.runOnUiThread(() -> module.complete(response));
  }
  private void complete(BaseResp resp) {
    if(pending==null || resp.getType()!=pendingType || resp.callbackExtras==null || !callbackToken.equals(resp.callbackExtras.getString("rn_request_id"))) return;
    WritableMap raw=Arguments.createMap(); raw.putInt("errorCode",resp.errorCode); raw.putString("errorMsg",resp.errorMsg);
    if(resp instanceof Share.Response) { raw.putString("state",((Share.Response)resp).state); raw.putInt("subErrorCode",((Share.Response)resp).subErrorCode); }
    WritableMap result=Arguments.createMap(); result.putString("platform","android"); result.putString("status",resp.isSuccess()?"success":resp.isCancel()?"cancelled":"failed"); result.putMap("nativeResponse",raw);
    Promise p=pending; cleanup(); p.resolve(result);
  }
  private void cleanExpired() {
    File root=new File(getReactApplicationContext().getCacheDir(),"rn-douyin"); File[] dirs=root.listFiles();
    if(dirs!=null) for(File dir:dirs) if(System.currentTimeMillis()-dir.lastModified()>86400000L) {
      File[] files=dir.listFiles(); if(files!=null) for(File file:files) {
        try { Uri uri=FileProvider.getUriForFile(getReactApplicationContext(),getReactApplicationContext().getPackageName()+".rndouyin.files",file); getReactApplicationContext().revokeUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch(Exception ignored) { }
      } delete(dir);
    }
  }
  private static void delete(File file) { if(file==null) return; File[] children=file.listFiles(); if(children!=null) for(File child:children) child.delete(); file.delete(); }
  private void cleanup() { cleanup(false); }
  private void cleanup(boolean defer) {
    if(defer && pendingDir!=null) {
      final File dir=pendingDir; final ArrayList<Uri> saved=new ArrayList<>(grants);
      final Context context=getReactApplicationContext().getApplicationContext();
      new Handler(Looper.getMainLooper()).postDelayed(() -> { for(Uri uri:saved) context.revokeUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION); delete(dir); },86400000L);
      grants.clear(); pendingDir=null; pending=null; pendingId=null; callbackToken=null; return;
    }
    for(Uri uri:grants) getReactApplicationContext().revokeUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);
    grants.clear(); delete(pendingDir); pendingDir=null; pending=null; pendingId=null; callbackToken=null;
  }
  private void failPending(Exception e) { Promise p=pending; cleanup("E_CANCELLED".equals(e.getMessage()) || "E_INVALIDATED".equals(e.getMessage())); if(p!=null) reject(p,e); }
  @ReactMethod public void cancelPendingShare(String id, Promise p) {
    UiThreadUtil.runOnUiThread(() -> { if(id.equals(pendingId)) failPending(new IllegalStateException("E_CANCELLED")); p.resolve(null); });
  }
  @Override public void invalidate() { UiThreadUtil.runOnUiThread(() -> { if(pending!=null) failPending(new IllegalStateException("E_INVALIDATED")); }); io.shutdown(); super.invalidate(); }
}
