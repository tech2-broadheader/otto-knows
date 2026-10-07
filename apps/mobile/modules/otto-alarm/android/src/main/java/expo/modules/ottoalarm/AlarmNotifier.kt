package expo.modules.ottoalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

/**
 * Rings an alarm as an "insistent" alarm notification: the phone's alarm sound
 * loops until Snooze or Dismiss, and on a locked or idle phone the full-screen
 * intent opens AlarmActivity. No foreground service is needed.
 */
object AlarmNotifier {
  private const val CHANNEL_VIBRATE = "otto_alarm_vibrate_v1"
  private const val CHANNEL_QUIET = "otto_alarm_quiet_v1"
  /** Stop ringing on its own after this long, like a clock app. */
  private const val RING_TIMEOUT_MS = 10 * 60_000L
  private val VIBRATION = longArrayOf(0, 800, 600)

  fun canUseFullScreen(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
      manager(context).canUseFullScreenIntent()

  fun ring(context: Context, spec: AlarmSpec) {
    ensureChannels(context)
    val id = notificationId(spec.id)
    val fullScreen = PendingIntent.getActivity(
      context,
      id,
      AlarmActivity.intent(context, spec),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, if (spec.vibrate) CHANNEL_VIBRATE else CHANNEL_QUIET)
        .setTimeoutAfter(RING_TIMEOUT_MS)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
        .setPriority(Notification.PRIORITY_MAX)
        .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
        .setVibrate(if (spec.vibrate) VIBRATION else null)
    }
    val notification = builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(spec.label)
      .setContentText(AlarmActivity.timeText(context))
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreen, true)
      .setContentIntent(fullScreen)
      .addAction(action(context, spec, AlarmScheduler.ACTION_SNOOZE, "Snooze ${spec.snoozeMinutes} min"))
      .addAction(action(context, spec, AlarmScheduler.ACTION_DISMISS, "Dismiss"))
      .build()
    notification.flags = notification.flags or Notification.FLAG_INSISTENT
    manager(context).notify(id, notification)
  }

  fun cancel(context: Context, alarmId: String) {
    manager(context).cancel(notificationId(alarmId))
  }

  private fun action(context: Context, spec: AlarmSpec, action: String, title: String): Notification.Action {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(action)
      .putExtra(AlarmScheduler.EXTRA_SPEC, spec.toJson())
    val pending = PendingIntent.getBroadcast(
      context,
      "${spec.id}#$action".hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return Notification.Action.Builder(
      Icon.createWithResource(context, android.R.drawable.ic_lock_idle_alarm),
      title,
      pending,
    ).build()
  }

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    val audio = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    for ((channelId, vibrate) in listOf(CHANNEL_VIBRATE to true, CHANNEL_QUIET to false)) {
      val channel = NotificationChannel(
        channelId,
        if (vibrate) "Alarms" else "Alarms (no vibration)",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Alarms you set in Otto"
        setSound(sound, audio)
        enableVibration(vibrate)
        if (vibrate) vibrationPattern = VIBRATION
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager(context).createNotificationChannel(channel)
    }
  }

  private fun notificationId(alarmId: String): Int = "alarm:$alarmId".hashCode()

  private fun manager(context: Context): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}
