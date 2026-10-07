package expo.modules.ottoalarm

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.format.DateFormat
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Date
import java.util.Locale

/**
 * The full-screen ringing screen (approved design "Alarm ringing", 2026-10-08):
 * time, date, label, Snooze and Dismiss. Native rather than React Native so it
 * opens instantly on a locked phone without starting the JS app.
 */
class AlarmActivity : Activity() {
  private lateinit var spec: AlarmSpec

  private val closer = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = finish()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    val json = intent.getStringExtra(AlarmScheduler.EXTRA_SPEC)
    if (json == null) {
      finish()
      return
    }
    spec = AlarmSpec.fromJson(json)
    setContentView(layout())
    val filter = IntentFilter(ACTION_CLOSE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(closer, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(closer, filter)
    }
  }

  override fun onDestroy() {
    if (::spec.isInitialized) unregisterReceiver(closer)
    super.onDestroy()
  }

  private fun snooze() {
    AlarmNotifier.cancel(this, spec.id)
    AlarmScheduler.armSnooze(this, spec)
    finish()
  }

  private fun dismiss() {
    AlarmNotifier.cancel(this, spec.id)
    finish()
  }

  private fun layout(): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setBackgroundColor(DARK)
      setPadding(dp(24), dp(96), dp(24), dp(40))
    }
    root.addView(text("ALARM", 12f, MINT, bold = true).apply { letterSpacing = 0.16f })
    root.addView(text(timeText(this), 88f, Color.WHITE, bold = true), margins(top = 14))
    root.addView(text(dateText(), 15f, SAGE), margins(top = 6))
    root.addView(text(spec.label, 22f, Color.WHITE, bold = true), margins(top = 26))
    root.addView(View(this), LinearLayout.LayoutParams(0, 0, 1f))
    root.addView(
      button("Snooze ${spec.snoozeMinutes} min", Color.WHITE, fill = 0x1AFFFFFF, stroke = 0x40FFFFFF) { snooze() },
      margins(height = 60),
    )
    root.addView(
      button("Dismiss", DARK, fill = Color.WHITE, stroke = null) { dismiss() },
      margins(top = 12, height = 64),
    )
    return root
  }

  private fun text(value: String, sp: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
    text = value
    setTextColor(color)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
    gravity = Gravity.CENTER
    if (bold) typeface = Typeface.DEFAULT_BOLD
  }

  private fun button(label: String, textColor: Int, fill: Int, stroke: Int?, onClick: () -> Unit) =
    Button(this).apply {
      text = label
      isAllCaps = false
      setTextColor(textColor)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
      typeface = Typeface.DEFAULT_BOLD
      stateListAnimator = null
      background = GradientDrawable().apply {
        cornerRadius = dp(18).toFloat()
        setColor(fill)
        if (stroke != null) setStroke(dp(1), stroke)
      }
      setOnClickListener { onClick() }
    }

  private fun margins(top: Int = 0, height: Int? = null) = LinearLayout.LayoutParams(
    LinearLayout.LayoutParams.MATCH_PARENT,
    height?.let(::dp) ?: LinearLayout.LayoutParams.WRAP_CONTENT,
  ).apply { topMargin = dp(top) }

  private fun dateText(): String =
    DateFormat.format(DateFormat.getBestDateTimePattern(Locale.getDefault(), "EEEEdMMMM"), Date()).toString()

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  companion object {
    private const val ACTION_CLOSE = "expo.modules.ottoalarm.CLOSE"
    private const val DARK = 0xFF06301F.toInt()
    private const val MINT = 0xFF8FD9B4.toInt()
    private const val SAGE = 0xFFB8D9C9.toInt()

    fun intent(context: Context, spec: AlarmSpec): Intent =
      Intent(context, AlarmActivity::class.java)
        .putExtra(AlarmScheduler.EXTRA_SPEC, spec.toJson())
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)

    /** Close an open ringing screen (after Snooze / Dismiss from the notification). */
    fun closeAll(context: Context) {
      context.sendBroadcast(Intent(ACTION_CLOSE).setPackage(context.packageName))
    }

    /** The current time in the phone's 12/24-hour style. */
    fun timeText(context: Context): String = DateFormat.getTimeFormat(context).format(Date())
  }
}
