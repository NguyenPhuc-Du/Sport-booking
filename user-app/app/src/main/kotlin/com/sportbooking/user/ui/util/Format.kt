package com.sportbooking.user.ui.util

import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val moneyFormat = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"))

fun Long.toVnd(): String = moneyFormat.format(this) + "đ"

fun LocalDate.dayLabel(): String {
    val today = LocalDate.now()
    return when (this) {
        today -> "Hôm nay"
        today.plusDays(1) -> "Ngày mai"
        else -> format(DateTimeFormatter.ofPattern("dd/MM"))
    }
}

fun LocalDate.apiDate(): String = format(DateTimeFormatter.ISO_LOCAL_DATE)
