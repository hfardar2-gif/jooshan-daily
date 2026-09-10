package ir.jooshan.daily;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        MainActivity.createNotificationChannel(context);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 1002, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = android.os.Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, MainActivity.CHANNEL_ID)
            : new Notification.Builder(context);
        Notification notification = builder.setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("صد روز با جوشن کبیر")
            .setContentText("وقت خواندن بند امروز جوشن کبیر است")
            .setColor(Color.rgb(57, 210, 192)).setAutoCancel(true).setContentIntent(pending).build();
        try { ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(100, notification); }
        catch (SecurityException ignored) {}
        String time = context.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).getString("time", "09:00");
        MainActivity.scheduleReminder(context, time);
    }
}
