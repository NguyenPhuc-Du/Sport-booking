package com.sportbooking.user.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalContext

@Composable
fun SportBookingTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val extraColors = SportExtraColors(
        peakSlot = if (darkTheme) AmberAccentDark else AmberAccent,
        peakSlotContainer = if (darkTheme) AmberAccentContainerDark else AmberAccentContainer,
        bookedSlot = if (darkTheme) DarkOutlineVariant else LightOutlineVariant,
        bookedSlotContainer = if (darkTheme) DarkSurfaceVariant else LightSurfaceVariant,
    )

    CompositionLocalProvider(
        LocalSpacing provides SportSpacing(),
        LocalExtraColors provides extraColors,
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = SportTypography,
            shapes = SportShapes,
            content = content,
        )
    }
}

val MaterialTheme.spacing: SportSpacing
    @Composable
    @ReadOnlyComposable
    get() = LocalSpacing.current

val MaterialTheme.extraColors: SportExtraColors
    @Composable
    @ReadOnlyComposable
    get() = LocalExtraColors.current
