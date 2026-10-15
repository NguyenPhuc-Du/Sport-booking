package com.sportbooking.user.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Green = Color(0xFF128A4A)
private val GreenDark = Color(0xFF0C6B38)
private val Teal = Color(0xFF0F766E)
private val Ink = Color(0xFF14221B)
private val Mist = Color(0xFFF3F7F4)

private val LightColors = lightColorScheme(
    primary = Green,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD7F5E3),
    onPrimaryContainer = GreenDark,
    secondary = Teal,
    background = Mist,
    surface = Color.White,
    onBackground = Ink,
    onSurface = Ink,
)

@Composable
fun SportBookingTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = Typography(),
        content = content,
    )
}
