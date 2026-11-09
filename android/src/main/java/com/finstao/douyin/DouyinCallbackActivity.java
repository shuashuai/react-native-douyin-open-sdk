package com.finstao.douyin;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import com.bytedance.sdk.open.douyin.DouYinOpenApiFactory;
import com.bytedance.sdk.open.aweme.common.handler.IApiEventHandler;
import com.bytedance.sdk.open.aweme.common.model.*;
public final class DouyinCallbackActivity extends Activity implements IApiEventHandler {
  @Override public void onCreate(Bundle state) { super.onCreate(state); handle(getIntent()); }
  @Override public void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); handle(intent); }
  private void handle(Intent intent) {
    try { DouYinOpenApiFactory.create(this).handleIntent(intent, this); }
    catch (Exception ignored) { /* Untrusted intents cannot complete an unrelated request. */ }
    finally { finish(); }
  }
  @Override public void onReq(BaseReq req) { }
  @Override public void onResp(BaseResp resp) { DouyinModule.receive(resp); }
  @Override public void onErrorIntent(Intent intent) { /* Pending request times out; never accept an uncorrelated response. */ }
}
