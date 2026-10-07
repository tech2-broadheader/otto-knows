package expo.modules.ottoalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * AlarmManager forgets everything on reboot, and fire times shift with clock or
 * timezone changes; exact delivery becomes possible once the user grants
 * "Alarms & reminders". In each case, re-arm what is remembered.
 */
class RearmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" ->
        AlarmScheduler.rearmAll(context)
    }
  }
}
