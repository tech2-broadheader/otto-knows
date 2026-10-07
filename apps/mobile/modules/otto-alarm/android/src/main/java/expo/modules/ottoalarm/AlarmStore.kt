package expo.modules.ottoalarm

import android.content.Context

/**
 * The alarms currently armed on this phone, kept natively so they can be
 * re-armed after a reboot or app update without starting JavaScript.
 */
class AlarmStore(context: Context) {
  private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun put(spec: AlarmSpec) {
    prefs.edit().putString(spec.id, spec.toJson()).apply()
  }

  fun get(id: String): AlarmSpec? = prefs.getString(id, null)?.let(AlarmSpec::fromJson)

  fun remove(id: String) {
    prefs.edit().remove(id).apply()
  }

  fun all(): List<AlarmSpec> =
    prefs.all.values.mapNotNull { (it as? String)?.let(AlarmSpec::fromJson) }

  private companion object {
    const val PREFS = "otto_alarms_v1"
  }
}
