package com.sportbooking.user.payment

import android.net.Uri
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PaymentResult(
    val success: Boolean,
    val code: String,
)

object PaymentResultBus {
    private val _result = MutableStateFlow<PaymentResult?>(null)
    val result = _result.asStateFlow()

    fun publish(uri: Uri?) {
        if (uri == null || uri.scheme != "sportzone" || uri.host != "payment") return
        _result.value = PaymentResult(
            success = uri.lastPathSegment == "success",
            code = uri.getQueryParameter("code").orEmpty(),
        )
    }

    fun consume() {
        _result.value = null
    }
}
