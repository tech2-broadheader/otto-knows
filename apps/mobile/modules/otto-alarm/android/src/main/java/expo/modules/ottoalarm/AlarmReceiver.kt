package expo.modules.ottoalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fires alarms and handles the notification's Snooze / Dismiss buttons. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val spec = intent.getStringExtra(AlarmScheduler.EXTRA_SPEC)?.let(AlarmSpec::fromJson) ?: return
    when (intent.action) {
      AlarmScheduler.ACTION_FIRE -> fire(context, spec, intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZED, false))
      AlarmScheduler.ACTION_SNOOZE -> {
        AlarmNotifier.cancel(context, spec.id)
        AlarmScheduler.armSnooze(context, spec)
        AlarmActivity.closeAll(context)
      }
      AlarmScheduler.ACTION_DISMISS -> {
        AlarmNotifier.cancel(context, spec.id)
        AlarmActivity.closeAll(context)
      }
    }
  }

  private fun fire(context: Context, spec: AlarmSpec, snoozed: Boolean) {
    if (!snoozed) {
      val store = AlarmStore(context)
      // Cancelled after this was queued: stay quiet.
      val current = store.get(spec.id) ?: return
      // Repeats arm their next day now, so a missed Dismiss never loses tomorrow.
      if (current.repeats) AlarmScheduler.arm(context, current) else store.remove(spec.id)
    }
    AlarmNotifier.ring(context, spec)
  }
}
