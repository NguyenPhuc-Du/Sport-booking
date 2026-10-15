package com.sportbooking.user.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Primary Athletic Emerald
val EmeraldPrimary = Color(0xFF00875A)
val EmeraldOnPrimary = Color(0xFFFFFFFF)
val EmeraldPrimaryContainer = Color(0xFFD1FADF)
val EmeraldOnPrimaryContainer = Color(0xFF054F31)

// Secondary Sport Teal
val TealSecondary = Color(0xFF0F766E)
val TealOnSecondary = Color(0xFFFFFFFF)
val TealSecondaryContainer = Color(0xFFCCFBF1)
val TealOnSecondaryContainer = Color(0xFF115E59)

// Tertiary / Accent Energetic Amber-Orange
val AmberAccent = Color(0xFFFF6D00)
val AmberOnAccent = Color(0xFFFFFFFF)
val AmberAccentContainer = Color(0xFFFFE7D1)
val AmberOnAccentContainer = Color(0xFF7A2700)

// Neutral Surfaces - Light
val LightBackground = Color(0xFFF8FAFC)
val LightOnBackground = Color(0xFF0F172A)
val LightSurface = Color(0xFFFFFFFF)
val LightOnSurface = Color(0xFF0F172A)
val LightSurfaceVariant = Color(0xFFF1F5F9)
val LightOnSurfaceVariant = Color(0xFF475569)
val LightOutline = Color(0xFFE2E8F0)
val LightOutlineVariant = Color(0xFFCBD5E1)

// Neutral Surfaces - Dark
val DarkBackground = Color(0xFF0B0F17)
val DarkOnBackground = Color(0xFFF8FAFC)
val DarkSurface = Color(0xFF161F30)
val DarkOnSurface = Color(0xFFF8FAFC)
val DarkSurfaceVariant = Color(0xFF1E293B)
val DarkOnSurfaceVariant = Color(0xFF94A3B8)
val DarkOutline = Color(0xFF2D3A4F)
val DarkOutlineVariant = Color(0xFF334155)

// Primary Athletic Emerald - Dark
val EmeraldPrimaryDark = Color(0xFF22C55E)
val EmeraldOnPrimaryDark = Color(0xFF052E16)
val EmeraldPrimaryContainerDark = Color(0xFF14532D)
val EmeraldOnPrimaryContainerDark = Color(0xFF86EFAC)

// Accent - Dark
val AmberAccentDark = Color(0xFFFB923C)
val AmberAccentContainerDark = Color(0xFF7C2D12)
val AmberOnAccentContainerDark = Color(0xFFFFD7B2)

// Common Accents
val RatingGold = Color(0xFFFFB800)
val SuccessGreen = Color(0xFF10B981)
val WarningOrange = Color(0xFFF59E0B)
val DangerRed = Color(0xFFEF4444)
val InfoBlue = Color(0xFF3B82F6)

val LightColorScheme = lightColorScheme(
    primary = EmeraldPrimary,
    onPrimary = EmeraldOnPrimary,
    primaryContainer = EmeraldPrimaryContainer,
    onPrimaryContainer = EmeraldOnPrimaryContainer,
    secondary = TealSecondary,
    onSecondary = TealOnSecondary,
    secondaryContainer = TealSecondaryContainer,
    onSecondaryContainer = TealOnSecondaryContainer,
    tertiary = AmberAccent,
    onTertiary = AmberOnAccent,
    tertiaryContainer = AmberAccentContainer,
    onTertiaryContainer = AmberOnAccentContainer,
    background = LightBackground,
    onBackground = LightOnBackground,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    outline = LightOutline,
    outlineVariant = LightOutlineVariant,
    error = DangerRed,
    onError = Color.White,
)

val DarkColorScheme = darkColorScheme(
    primary = EmeraldPrimaryDark,
    onPrimary = EmeraldOnPrimaryDark,
    primaryContainer = EmeraldPrimaryContainerDark,
    onPrimaryContainer = EmeraldOnPrimaryContainerDark,
    secondary = Color(0xFF2DD4BF),
    onSecondary = Color(0xFF003731),
    secondaryContainer = Color(0xFF005048),
    onSecondaryContainer = Color(0xFF99F6E4),
    tertiary = AmberAccentDark,
    onTertiary = Color(0xFF431B00),
    tertiaryContainer = AmberAccentContainerDark,
    onTertiaryContainer = AmberOnAccentContainerDark,
    background = DarkBackground,
    onBackground = DarkOnBackground,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    outline = DarkOutline,
    outlineVariant = DarkOutlineVariant,
    error = Color(0xFFF87171),
    onError = Color(0xFF450A0A),
)

@Immutable
data class SportExtraColors(
    val rating: Color = RatingGold,
    val success: Color = SuccessGreen,
    val warning: Color = WarningOrange,
    val danger: Color = DangerRed,
    val info: Color = InfoBlue,
    val peakSlot: Color = AmberAccent,
    val peakSlotContainer: Color = AmberAccentContainer,
    val bookedSlot: Color = Color(0xFF94A3B8),
    val bookedSlotContainer: Color = Color(0xFFF1F5F9),
)

val LocalExtraColors = staticCompositionLocalOf { SportExtraColors() }
