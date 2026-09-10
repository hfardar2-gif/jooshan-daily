package ir.jooshan.daily;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        boolean enabled = context.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).getBoolean("enabled", false);
        if (enabled) {
            String time = context.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).getString("time", "09:00");
            MainActivity.scheduleReminder(context, time);
        }
    }
}
