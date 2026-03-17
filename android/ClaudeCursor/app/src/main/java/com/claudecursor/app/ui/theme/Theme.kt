package com.claudecursor.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = AppColors.accent,
    onPrimary = AppColors.accentOnDark,
    secondary = AppColors.bgSecondary,
    onSecondary = AppColors.textPrimary,
    tertiary = AppColors.bgTertiary,
    onTertiary = AppColors.textSecondary,
    background = AppColors.bgPrimary,
    onBackground = AppColors.textPrimary,
    surface = AppColors.bgSecondary,
    onSurface = AppColors.textPrimary,
    surfaceVariant = AppColors.bgTertiary,
    onSurfaceVariant = AppColors.textSecondary,
    outline = AppColors.border,
    error = Color(0xFFCF6679),
    onError = Color(0xFF000000),
)

@Composable
fun ClaudeCursorTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = AppTypography,
        content = content
    )
}
