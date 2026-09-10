package ir.jooshan.daily;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.app.Activity;
import androidx.webkit.WebViewAssetLoader;
import java.util.Calendar;
import java.util.Locale;

public class MainActivity extends Activity {
    static final String PREFS = "jooshan_reminder";
    static final String CHANNEL_ID = "daily_jooshan";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 91;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel(this);
        WebView webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.addJavascriptInterface(new ReminderBridge(this), "AndroidBridge");
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "یادآوری روزانه جوشن", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("یادآوری خواندن بند روزانه دعای جوشن کبیر");
            context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    static void scheduleReminder(Context context, String time) {
        String[] parts = time.split(":");
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
        next.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
        PendingIntent pending = PendingIntent.getBroadcast(context, 1001, new Intent(context, ReminderReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
    }

    static void cancelReminder(Context context) {
        PendingIntent pending = PendingIntent.getBroadcast(context, 1001, new Intent(context, ReminderReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE)).cancel(pending);
    }

    public class ReminderBridge {
        private final Context context;
        ReminderBridge(Context context) { this.context = context; }
        @JavascriptInterface public String getReminderSettings() {
            SharedPreferences p = context.getSharedPreferences(PREFS, MODE_PRIVATE);
            return String.format(Locale.US, "{\"enabled\":%s,\"time\":\"%s\"}", p.getBoolean("enabled", false), p.getString("time", "09:00"));
        }
        @JavascriptInterface public void enableDailyReminder(String time) {
            context.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("enabled", true).putString("time", time).apply();
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
            }
            scheduleReminder(context, time);
        }
        @JavascriptInterface public void disableDailyReminder() {
            context.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("enabled", false).apply();
            cancelReminder(context);
        }
    }
}
