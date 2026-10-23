package com.sportbooking.user.ui.checkout

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.BookingDraft
import com.sportbooking.domain.model.BookingQuote
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.model.Voucher
import com.sportbooking.domain.usecase.CreateBookingUseCase
import com.sportbooking.domain.usecase.GetCheckoutOptionsUseCase
import com.sportbooking.domain.usecase.QuoteBookingUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckoutUiState(
    val loading: Boolean = true,
    val quote: BookingQuote? = null,
    val payments: List<PaymentMethod> = emptyList(),
    val vouchers: List<Voucher> = emptyList(),
    val paymentMethod: String = "vnpay",
    val voucherInput: String = "",
    val appliedVoucher: String? = null,
    val submitting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getOptions: GetCheckoutOptionsUseCase,
    private val quoteBooking: QuoteBookingUseCase,
    private val createBooking: CreateBookingUseCase,
) : ViewModel() {
    private val facilityId: String = checkNotNull(savedStateHandle["facilityId"])
    private val courtId: String = checkNotNull(savedStateHandle["courtId"])
    private val date: String = checkNotNull(savedStateHandle["date"])
    private val time: String = checkNotNull(savedStateHandle["time"])
    private val hours: Int = savedStateHandle.get<Int>("hours")?.coerceIn(1, 3) ?: 1

    private val _state = MutableStateFlow(CheckoutUiState())
    val state = _state.asStateFlow()
    private val _paymentUrl = MutableSharedFlow<String>()
    val paymentUrl = _paymentUrl.asSharedFlow()

    init {
        viewModelScope.launch {
            when (val options = getOptions(facilityId)) {
                is DomainResult.Success -> {
                    val method = options.data.payments.firstOrNull()?.id ?: "vnpay"
                    _state.update {
                        it.copy(payments = options.data.payments, vouchers = options.data.vouchers, paymentMethod = method)
                    }
                    refreshQuote()
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = options.message) }
            }
        }
    }

    fun onPaymentSelected(id: String) = _state.update { it.copy(paymentMethod = id, error = null) }
    fun onVoucherChange(value: String) = _state.update { it.copy(voucherInput = value.uppercase(), error = null) }

    fun applyTypedVoucher() = applyVoucher(_state.value.voucherInput)

    fun applyVoucher(code: String?) {
        val normalized = code?.trim()?.uppercase()?.ifBlank { null }
        viewModelScope.launch {
            _state.update { it.copy(voucherInput = normalized.orEmpty(), error = null) }
            when (val result = quoteBooking(draft(null, normalized))) {
                is DomainResult.Success -> _state.update {
                    it.copy(loading = false, quote = result.data, appliedVoucher = normalized)
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }

    fun confirm() {
        val current = _state.value
        if (current.submitting || current.quote == null) return
        _state.update { it.copy(submitting = true, error = null) }
        viewModelScope.launch {
            when (val result = createBooking(draft(current.paymentMethod, current.appliedVoucher))) {
                is DomainResult.Success -> {
                    val url = result.data.paymentUrl
                    if (url.isNullOrBlank()) {
                        _state.update { it.copy(submitting = false, error = "Không tạo được link thanh toán") }
                    } else {
                        _state.update { it.copy(submitting = false) }
                        _paymentUrl.emit(url)
                    }
                }
                is DomainResult.Failure -> _state.update { it.copy(submitting = false, error = result.message) }
            }
        }
    }

    private fun refreshQuote() {
        val voucher = _state.value.appliedVoucher
        viewModelScope.launch {
            _state.update { it.copy(loading = it.quote == null, error = null) }
            when (val result = quoteBooking(draft(null, voucher))) {
                is DomainResult.Success -> _state.update { it.copy(loading = false, quote = result.data) }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }

    private fun draft(paymentMethod: String?, voucher: String?) = BookingDraft(
        facilityId = facilityId,
        courtId = courtId,
        date = date,
        time = time,
        hours = hours,
        voucherCode = voucher,
        paymentMethod = paymentMethod,
    )
}
