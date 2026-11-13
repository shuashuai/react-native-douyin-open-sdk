package com.finstao.douyin;
import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import com.bytedance.sdk.open.aweme.share.Share;
import android.content.Intent;
import com.bytedance.sdk.open.douyin.DouYinOpenApiFactory;
import com.bytedance.sdk.open.aweme.common.handler.IApiEventHandler;
import com.bytedance.sdk.open.aweme.common.model.*;
public final class DouyinCallbackActivity extends Activity implements IApiEventHandler {
  @Override public void onCreate(Bundle state) { super.onCreate(state); handle(getIntent()); }
  @Override public void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); handle(intent); }
  private void handle(Intent intent) {
    try { DouYinOpenApiFactory.create(this).handleIntent(intent, this); }
    catch (Exception error) { Log.w("DouyinShare", "Could not parse callback: " + error.getClass().getSimpleName()); }
    finally { finish(); }
  }
  @Override public void onReq(BaseReq req) { }
  @Override public void onResp(BaseResp resp) {
    int subErrorCode = resp instanceof Share.Response ? ((Share.Response) resp).subErrorCode : 0;
    Log.d("DouyinShare", "callback responseType=" + resp.getType()
      + ", errorCode=" + resp.errorCode + ", subErrorCode=" + subErrorCode);
    DouyinModule.receive(resp);
  }
  @Override public void onErrorIntent(Intent intent) { Log.w("DouyinShare", "Open SDK rejected callback intent"); }
}
