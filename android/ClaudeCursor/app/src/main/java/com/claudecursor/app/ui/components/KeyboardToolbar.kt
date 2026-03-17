package com.claudecursor.app.ui.components

import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claudecursor.app.ui.screens.sessionlist.SessionListViewModel
import com.claudecursor.app.ui.theme.AppColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun KeyboardToolbar(
    viewModel: SessionListViewModel,
    modifier: Modifier = Modifier
) {
    var activeModifier by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    var resetJob by remember { mutableStateOf<kotlinx.coroutines.Job?>(null) }
    val context = LocalContext.current

    fun haptic() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = context.getSystemService(VibratorManager::class.java)
            vm?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            val v = context.getSystemService(Vibrator::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v?.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        }
    }

    fun escapeForJS(s: String): String {
        return s.replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\t", "\\t")
            .replace("\u001b", "\\x1b")
    }

    fun injectModifier(mod: String?) {
        val webView = viewModel.webView ?: return
        val value = if (mod != null) "'$mod'" else "null"
        webView.evaluateJavascript("window._pendingModifier=$value;", null)
    }

    fun sendKey(sequence: String) {
        haptic()
        activeModifier = null
        resetJob?.cancel()
        injectModifier(null)

        val webView = viewModel.webView ?: return
        val escaped = escapeForJS(sequence)
        webView.evaluateJavascript(
            "if(window.term){window.term.input('$escaped');window.term.focus();}",
            null
        )
    }

    fun toggleModifier(name: String) {
        haptic()
        resetJob?.cancel()

        if (activeModifier == name) {
            activeModifier = null
            injectModifier(null)
        } else {
            activeModifier = name
            injectModifier(name)
            resetJob = scope.launch {
                delay(5000)
                activeModifier = null
            }
        }
    }

    Column(modifier = modifier) {
        // Top border
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(AppColors.border)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppColors.bgSecondary.copy(alpha = 0.95f))
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .navigationBarsPadding(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Modifier buttons
            ModifierButton("Ctrl", activeModifier == "ctrl") { toggleModifier("ctrl") }
            ModifierButton("Alt", activeModifier == "alt") { toggleModifier("alt") }

            ToolbarDivider()

            // Key buttons
            KeyButton("Esc") { sendKey("\u001b") }
            KeyButton("Tab") { sendKey("\t") }

            ToolbarDivider()

            // Arrow buttons
            KeyButton("\u2190") { sendKey("\u001b[D") }
            KeyButton("\u2193") { sendKey("\u001b[B") }
            KeyButton("\u2191") { sendKey("\u001b[A") }
            KeyButton("\u2192") { sendKey("\u001b[C") }
        }
    }
}

@Composable
private fun ModifierButton(label: String, active: Boolean, onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = Modifier
            .defaultMinSize(minWidth = 44.dp, minHeight = 36.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(if (active) AppColors.accent else AppColors.bgTertiary),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = if (active) AppColors.bgPrimary else AppColors.textSecondary
        )
    }
}

@Composable
private fun KeyButton(label: String, onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = Modifier
            .defaultMinSize(minWidth = 36.dp, minHeight = 36.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(AppColors.bgTertiary),
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            color = AppColors.textSecondary
        )
    }
}

@Composable
private fun ToolbarDivider() {
    Box(
        Modifier
            .width(1.dp)
            .height(24.dp)
            .background(AppColors.border)
    )
}
