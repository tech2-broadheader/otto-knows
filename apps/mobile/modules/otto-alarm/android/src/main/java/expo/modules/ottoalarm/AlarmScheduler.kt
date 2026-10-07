package expo.modules.ottoalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/**
 * Arms alarms with AlarmManager. With "Alarms & reminders" granted it uses
 * setAlarmClock (exact, shown in the status bar); without it, an inexact
 * setAndAllowWhileIdle so the alarm still arrives, maybe a little late (ADR-005).
 */
object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.ottoalarm.FIRE"
  const val ACTION_SNOOZE = "expo.modules.ottoalarm.SNOOZE"
  const val ACTION_DISMISS = "expo.modules.ottoalarm.DISMISS"
  const val EXTRA_SPEC = "spec"
  const val EXTRA_SNOOZED = "snoozed"

  private const val MINUTE_MS = 60_000L

  fun canScheduleExact(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(context).canScheduleExactAlarms()

  /** Remember and arm the alarm's next occurrence; returns when it rings (epoch ms). */
  fun arm(context: Context, spec: AlarmSpec, now: Calendar = Calendar.getInstance()): Long {
    AlarmStore(context).put(spec)
    val at = spec.nextTrigger(now)
    setAt(context, spec, at, snoozed = false)
    return at
  }

  /** Ring again in the alarm's snooze minutes. */
  fun armSnooze(context: Context, spec: AlarmSpec) {
    setAt(context, spec, System.currentTimeMillis() + spec.snoozeMinutes * MINUTE_MS, snoozed = true)
  }

  /** Cancel the alarm, any pending snooze and a ringing notification; forget it. */
  fun cancel(context: Context, id: String) {
    val manager = alarmManager(context)
    for (snoozed in listOf(false, true)) {
      existingFireIntent(context, id, snoozed)?.let {
        manager.cancel(it)
        it.cancel()
      }
    }
    AlarmStore(context).remove(id)
    AlarmNotifier.cancel(context, id)
  }

  /** Re-arm everything remembered (after a reboot, update, clock or permission change). */
  fun rearmAll(context: Context) {
    val now = Calendar.getInstance()
    AlarmStore(context).all().forEach { arm(context, it, now) }
  }

  private fun setAt(context: Context, spec: AlarmSpec, at: Long, snoozed: Boolean) {
    val manager = alarmManager(context)
    val fire = fireIntent(context, spec, snoozed)
    if (canScheduleExact(context)) {
      try {
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(at, openAppIntent(context)), fire)
        return
      } catch (_: SecurityException) {
        // Permission revoked between the check and the call: fall through to inexact.
      }
    }
    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire)
  }

  private fun fireIntent(context: Context, spec: AlarmSpec, snoozed: Boolean): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      .putExtra(EXTRA_SPEC, spec.toJson())
      .putExtra(EXTRA_SNOOZED, snoozed)
    return PendingIntent.getBroadcast(
      context,
      requestCode(spec.id, snoozed),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun existingFireIntent(context: Context, id: String, snoozed: Boolean): PendingIntent? {
    val intent = Intent(context, AlarmReceiver::class.java).setAction(ACTION_FIRE)
    return PendingIntent.getBroadcast(
      context,
      requestCode(id, snoozed),
      intent,
      PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun openAppIntent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE)
  }

  private fun requestCode(id: String, snoozed: Boolean): Int =
    (if (snoozed) "$id#snooze" else id).hashCode()

  private fun alarmManager(context: Context): AlarmManager =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
}
