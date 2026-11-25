package com.sportbooking.user.ui.checkout

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.BookingDraft
import com.sportbooking.domain.model.BookingQuote
import com.sportbooking.domain.model.Drink
import com.sportbooking.domain.model.DrinkSelection
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.model.Voucher
import com.sportbooking.domain.usecase.CreateBookingUseCase
import com.sportbooking.domain.usecase.GetCheckoutOptionsUseCase
import com.sportbooking.domain.usecase.QuoteBookingUseCase
import com.sportbooking.user.session.GuestSessionStore
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
    val drinks: List<Drink> = emptyList(),
    val drinkQty: Map<String, Int> = emptyMap(),
    val paymentMethod: String = "vnpay",
    /** applyScope -> voucher code (max 1 per scope) */
    val selectedByScope: Map<String, String> = emptyMap(),
    val voucherSheetOpen: Boolean = false,
    /** draft selection while sheet is open */
    val sheetSelection: Map<String, String> = emptyMap(),
    val voucherInput: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
) {
    val selectedCodes: List<String>
        get() = selectedByScope.values.map { it.trim().uppercase() }.filter { it.isNotEmpty() }.distinct()
}

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getOptions: GetCheckoutOptionsUseCase,
    private val quoteBooking: QuoteBookingUseCase,
    private val createBooking: CreateBookingUseCase,
    private val guestStore: GuestSessionStore,
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
                    val snapshot = guestStore.checkoutSnapshot?.takeIf {
                        it.facilityId == facilityId &&
                            it.courtId == courtId &&
                            it.date == date &&
                            it.time == time &&
                            it.hours == hours
                    }
                    val method = snapshot?.paymentMethod
                        ?: options.data.payments.firstOrNull()?.id
                        ?: "vnpay"
                    _state.update {
                        it.copy(
                            payments = options.data.payments,
                            vouchers = options.data.vouchers,
                            drinks = options.data.drinks,
                            paymentMethod = method,
                            drinkQty = snapshot?.drinkQty.orEmpty(),
                            selectedByScope = snapshot?.selectedByScope.orEmpty(),
                        )
                    }
                    if (snapshot != null) guestStore.clearCheckout()
                    refreshQuote()
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = options.message) }
            }
        }
    }

    fun snapshotForGuestLogin() {
        val current = _state.value
        guestStore.checkoutSnapshot = GuestSessionStore.CheckoutSnapshot(
            facilityId = facilityId,
            courtId = courtId,
            date = date,
            time = time,
            hours = hours,
            drinkQty = current.drinkQty,
            selectedByScope = current.selectedByScope,
            paymentMethod = current.paymentMethod,
        )
        guestStore.pendingReturnRoute = checkoutRoute()
    }

    fun checkoutRoute(): String {
        val encodedTime = android.net.Uri.encode(time)
        return "checkout?facilityId=$facilityId&courtId=$courtId&date=$date&time=$encodedTime&hours=$hours"
    }

    fun onPaymentSelected(id: String) = _state.update { it.copy(paymentMethod = id, error = null) }

    fun onDrinkQty(id: String, qty: Int) {
        val drink = _state.value.drinks.find { it.id == id } ?: return
        val next = qty.coerceIn(0, drink.stock.coerceAtMost(20))
        _state.update { current ->
            val map = current.drinkQty.toMutableMap()
            if (next == 0) map.remove(id) else map[id] = next
            current.copy(drinkQty = map, error = null)
        }
        refreshQuote()
    }

    fun openVoucherSheet() {
        _state.update {
            it.copy(
                voucherSheetOpen = true,
                sheetSelection = it.selectedByScope,
                voucherInput = "",
                error = null,
            )
        }
    }

    fun dismissVoucherSheet() = _state.update {
        it.copy(voucherSheetOpen = false, voucherInput = "")
    }

    fun onVoucherInputChange(value: String) = _state.update {
        it.copy(voucherInput = value.uppercase(), error = null)
    }

    fun toggleSheetVoucher(voucher: Voucher) {
        val scope = voucher.applyScope.ifBlank { "court" }
        _state.update { current ->
            val next = current.sheetSelection.toMutableMap()
            if (next[scope] == voucher.code) {
                next.remove(scope)
            } else {
                next[scope] = voucher.code
            }
            current.copy(sheetSelection = next, error = null)
        }
    }

    fun applyTypedVoucherToSheet() {
        val code = _state.value.voucherInput.trim().uppercase()
        if (code.isBlank()) return
        val matched = _state.value.vouchers.find { it.code.equals(code, ignoreCase = true) }
        if (matched != null) {
            val scope = matched.applyScope.ifBlank { "court" }
            _state.update { current ->
                current.copy(
                    sheetSelection = current.sheetSelection + (scope to matched.code),
                    voucherInput = "",
                    error = null,
                )
            }
            return
        }
        // Validate unknown code against quote API, then place into returned scope
        viewModelScope.launch {
            val trial = (_state.value.sheetSelection.values + code)
                .map { it.trim().uppercase() }
                .filter { it.isNotEmpty() }
                .distinct()
            when (val result = quoteBooking(draft(null, trial))) {
                is DomainResult.Success -> {
                    val byScope = resolveScopes(
                        result.data.voucherCodes.ifEmpty {
                            result.data.voucherCode
                                ?.split(",")
                                ?.map { it.trim() }
                                ?.filter { it.isNotEmpty() }
                                .orEmpty()
                        },
                        result.data.voucherDiscounts.map { it.applyScope to it.code },
                    )
                    _state.update {
                        it.copy(
                            sheetSelection = byScope,
                            voucherInput = "",
                            error = null,
                        )
                    }
                }
                is DomainResult.Failure -> _state.update {
                    it.copy(error = result.message)
                }
            }
        }
    }

    fun confirmVoucherSheet() {
        val codes = _state.value.sheetSelection.values
            .map { it.trim().uppercase() }
            .filter { it.isNotEmpty() }
            .distinct()
        viewModelScope.launch {
            _state.update { it.copy(error = null) }
            when (val result = quoteBooking(draft(null, codes))) {
                is DomainResult.Success -> {
                    val applied = result.data.voucherCodes.ifEmpty {
                        result.data.voucherCode
                            ?.split(",")
                            ?.map { it.trim() }
                            ?.filter { it.isNotEmpty() }
                            .orEmpty()
                    }
                    val byScope = resolveScopes(applied, result.data.voucherDiscounts.map { it.applyScope to it.code })
                    _state.update {
                        it.copy(
                            loading = false,
                            quote = result.data,
                            selectedByScope = byScope,
                            sheetSelection = byScope,
                            voucherSheetOpen = false,
                            voucherInput = "",
                        )
                    }
                }
                is DomainResult.Failure -> _state.update {
                    it.copy(loading = false, error = result.message)
                }
            }
        }
    }

    fun clearAllVouchers() {
        viewModelScope.launch {
            _state.update {
                it.copy(selectedByScope = emptyMap(), sheetSelection = emptyMap(), error = null)
            }
            refreshQuote()
        }
    }

    fun confirm() {
        val current = _state.value
        if (current.submitting || current.quote == null) return
        _state.update { it.copy(submitting = true, error = null) }
        viewModelScope.launch {
            when (val result = createBooking(draft(current.paymentMethod, current.selectedCodes))) {
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
        val codes = _state.value.selectedCodes
        viewModelScope.launch {
            _state.update { it.copy(loading = it.quote == null, error = null) }
            when (val result = quoteBooking(draft(null, codes))) {
                is DomainResult.Success -> {
                    val applied = result.data.voucherCodes.ifEmpty {
                        result.data.voucherCode
                            ?.split(",")
                            ?.map { it.trim() }
                            ?.filter { it.isNotEmpty() }
                            .orEmpty()
                    }
                    val byScope = resolveScopes(
                        applied,
                        result.data.voucherDiscounts.map { it.applyScope to it.code },
                    )
                    _state.update {
                        it.copy(
                            loading = false,
                            quote = result.data,
                            selectedByScope = if (codes.isEmpty()) emptyMap() else byScope.ifEmpty { it.selectedByScope },
                        )
                    }
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }

    private fun resolveScopes(
        codes: List<String>,
        fromDiscounts: List<Pair<String, String>>,
    ): Map<String, String> {
        if (fromDiscounts.isNotEmpty()) {
            return fromDiscounts.associate { it.first to it.second }
        }
        val catalog = _state.value.vouchers.associateBy { it.code.uppercase() }
        return codes.mapNotNull { code ->
            val voucher = catalog[code.uppercase()]
            val scope = voucher?.applyScope?.ifBlank { null } ?: return@mapNotNull null
            scope to code
        }.toMap()
    }

    private fun draft(paymentMethod: String?, codes: List<String>) = BookingDraft(
        facilityId = facilityId,
        courtId = courtId,
        date = date,
        time = time,
        hours = hours,
        voucherCodes = codes,
        voucherCode = codes.firstOrNull(),
        paymentMethod = paymentMethod,
        drinks = _state.value.drinkQty
            .filter { it.value > 0 }
            .map { DrinkSelection(drinkId = it.key, qty = it.value) },
    )
}
