package app.lovable.umnilisenok;

import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.os.Build;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "UmniLisenok";
    public static final String EXTRA_AUTOSTART = "autostart";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Запущено автоматически после перезагрузки — через 8 с уводим в фон, защита стартует из JS.
        if (getIntent() != null && getIntent().getBooleanExtra(EXTRA_AUTOSTART, false)) {
            getWindow().getDecorView().postDelayed(() -> moveTaskToBack(true), 8000);
        }

        // Любое необработанное исключение пишем в logcat перед смертью процесса,
        // чтобы причина закрытия приложения была видна в `adb logcat`.
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "FATAL uncaught exception on " + thread.getName(), throwable);
            if (previous != null) previous.uncaughtException(thread, throwable);
        });

        // Если WebView-рендерер падает (OOM / сбой системного WebView),
        // Android по умолчанию убивает активити — приложение просто закрывается.
        // Перехватываем и перезагружаем WebView вместо выхода.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean crashed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && detail != null
                        && detail.didCrash();
                    Log.e(TAG, "WebView render process gone (didCrash=" + crashed + ") — перезапускаем WebView");
                    try {
                        if (view != null) view.destroy();
                    } catch (Throwable t) {
                        Log.e(TAG, "destroy webview failed", t);
                    }
                    recreate();
                    return true;
                }
            });
        }
    }

    // Смахнули из «недавних» или система убила задачу — планируем перезапуск через минуту.
    @Override
    public void onDestroy() {
        if (!isChangingConfigurations()) {
            try { BootReceiver.scheduleRestart(getApplicationContext()); } catch (Throwable t) { Log.e(TAG, "scheduleRestart", t); }
        }
        super.onDestroy();
    }
}
