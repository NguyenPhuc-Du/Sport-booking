package com.sportbooking.user.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Immutable
data class SportSpacing(
    val none: Dp = 0.dp,
    val tiny: Dp = 2.dp,
    val extraSmall: Dp = 4.dp,
    val small: Dp = 8.dp,
    val medium: Dp = 12.dp,
    val normal: Dp = 16.dp,
    val large: Dp = 20.dp,
    val extraLarge: Dp = 24.dp,
    val huge: Dp = 32.dp,
    val massive: Dp = 48.dp,
    val minTouchTarget: Dp = 48.dp,
    val cardElevation: Dp = 2.dp,
    val bottomBarHeight: Dp = 80.dp,
    val topBarHeight: Dp = 64.dp,
)

val LocalSpacing = staticCompositionLocalOf { SportSpacing() }
