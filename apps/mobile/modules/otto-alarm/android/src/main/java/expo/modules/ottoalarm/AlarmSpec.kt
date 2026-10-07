package expo.modules.ottoalarm

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/** One alarm as Otto hands it over (see src/lib/alarm-sync.ts NativeAlarm). */
data class AlarmSpec(
  val id: String,
  val hour: Int,
  val minute: Int,
  /** ISO weekdays, Mon = 1 … Sun = 7; empty = rings once. */
  val days: List<Int>,
  val label: String,
  val snoozeMinutes: Int,
  val vibrate: Boolean,
) {
  val repeats: Boolean get() = days.isNotEmpty()

  fun toJson(): String = JSONObject()
    .put("id", id)
    .put("hour", hour)
    .put("minute", minute)
    .put("days", JSONArray(days))
    .put("label", label)
    .put("snoozeMinutes", snoozeMinutes)
    .put("vibrate", vibrate)
    .toString()

  /** The next time this alarm rings after [now], in the phone's timezone. */
  fun nextTrigger(now: Calendar): Long {
    for (offset in 0..7) {
      val candidate = (now.clone() as Calendar).apply {
        add(Calendar.DAY_OF_YEAR, offset)
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }
      if (candidate.timeInMillis <= now.timeInMillis) continue
      if (!repeats || isoDay(candidate) in days) return candidate.timeInMillis
    }
    // Unreachable for valid days (1..7); fall back to tomorrow at the same time.
    return (now.clone() as Calendar).apply {
      add(Calendar.DAY_OF_YEAR, 1)
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
  }

  companion object {
    fun fromJson(json: String): AlarmSpec {
      val o = JSONObject(json)
      val days = o.getJSONArray("days")
      return AlarmSpec(
        id = o.getString("id"),
        hour = o.getInt("hour"),
        minute = o.getInt("minute"),
        days = List(days.length()) { days.getInt(it) },
        label = o.getString("label"),
        snoozeMinutes = o.getInt("snoozeMinutes"),
        vibrate = o.getBoolean("vibrate"),
      )
    }

    /** Calendar.DAY_OF_WEEK (Sun = 1 … Sat = 7) → ISO (Mon = 1 … Sun = 7). */
    fun isoDay(c: Calendar): Int = (c.get(Calendar.DAY_OF_WEEK) + 5) % 7 + 1
  }
}
