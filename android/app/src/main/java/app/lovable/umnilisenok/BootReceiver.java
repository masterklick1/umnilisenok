package app.lovable.umnilisenok;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Автозапуск защиты после перезагрузки устройства / обновления приложения /
 * перезапуска, запланированного после «убийства» процесса.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "UmniLisenok";
    public static final String ACTION_RESTART = "app.lovable.umnilisenok.RESTART_PROTECTION";
    private static final String CHANNEL = "protection_restart";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "BootReceiver: " + action);
        launch(context);
    }

    static void launch(Context context) {
        Intent open = new Intent(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        open.putExtra(MainActivity.EXTRA_AUTOSTART, true);

        boolean canStart = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            || Settings.canDrawOverlays(context);
        if (canStart) {
            try {
                context.startActivity(open);
                return;
            } catch (Throwable t) {
                Log.e(TAG, "autostart activity failed", t);
            }
        }
        // Android 10+ без разрешения «поверх других окон» — показываем уведомление
        showNotification(context, open);
    }

    private static void showNotification(Context context, Intent open) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Защита ребёнка",
                NotificationManager.IMPORTANCE_HIGH));
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(context, 1001, open, flags);
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Защита включается")
            .setContentText("Нажмите, чтобы продолжить передачу местоположения")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true);
        nm.notify(1001, b.build());
    }

    /** Планирует перезапуск через минуту, если процесс будет убит. */
    static void scheduleRestart(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(context, BootReceiver.class).setAction(ACTION_RESTART);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getBroadcast(context, 2002, i, flags);
        am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 60_000L, pi);
    }
}
