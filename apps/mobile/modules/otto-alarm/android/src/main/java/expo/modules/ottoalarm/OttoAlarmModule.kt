package expo.modules.ottoalarm

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** The alarm as JS sends it (src/lib/alarm-sync.ts NativeAlarm). */
class NativeAlarmRecord : Record {
  @Field val id: String = ""
  @Field val hour: Int = 0
  @Field val minute: Int = 0
  @Field val days: List<Int> = emptyList()
  @Field val label: String = ""
  @Field val snoozeMinutes: Int = 5
  @Field val vibrate: Boolean = true

  fun toSpec() = AlarmSpec(id, hour, minute, days, label, snoozeMinutes, vibrate)
}

/** JS API for Otto's alarms (ADR-005). Android only; iOS uses notifications later. */
class OttoAlarmModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("OttoAlarm")

    Function("canScheduleExact") { AlarmScheduler.canScheduleExact(context) }

    Function("canUseFullScreen") { AlarmNotifier.canUseFullScreen(context) }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        openSettings(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
      }
    }

    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        openSettings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
      }
    }

    /** Arm (or re-arm) an alarm; returns when it next rings, in epoch ms. */
    Function("set") { alarm: NativeAlarmRecord ->
      AlarmScheduler.arm(context, alarm.toSpec()).toDouble()
    }

    Function("cancel") { id: String -> AlarmScheduler.cancel(context, id) }

    Function("armedIds") { AlarmStore(context).all().map { it.id } }
  }

  private fun openSettings(action: String) {
    val intent = Intent(action, Uri.parse("package:${context.packageName}"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }
}
