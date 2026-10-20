package com.sportbooking.user.ui.bookings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Booking
import com.sportbooking.domain.model.BookingCounts
import com.sportbooking.domain.usecase.CancelBookingUseCase
import com.sportbooking.domain.usecase.GetBookingsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BookingsUiState(
    val loading: Boolean = true,
    val filter: String = "all",
    val counts: BookingCounts = BookingCounts(0, 0, 0, 0),
    val bookings: List<Booking> = emptyList(),
    val error: String? = null,
    val workingCode: String? = null,
)

@HiltViewModel
class BookingsViewModel @Inject constructor(
    private val getBookings: GetBookingsUseCase,
    private val cancelBooking: CancelBookingUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(BookingsUiState())
    val state = _state.asStateFlow()

    init {
        load("all")
    }

    fun onFilterSelected(filter: String) = load(filter)

    fun refresh() = load(_state.value.filter)

    fun cancel(code: String) {
        if (_state.value.workingCode != null) return
        _state.update { it.copy(workingCode = code, error = null) }
        viewModelScope.launch {
            when (val result = cancelBooking(code)) {
                is DomainResult.Success -> load(_state.value.filter)
                is DomainResult.Failure -> _state.update { it.copy(workingCode = null, error = result.message) }
            }
        }
    }

    private fun load(filter: String) {
        viewModelScope.launch {
            _state.update {
                it.copy(
                    loading = true,
                    filter = filter,
                    bookings = if (it.filter == filter) it.bookings else emptyList(),
                    error = null,
                )
            }
            when (val result = getBookings(filter)) {
                is DomainResult.Success -> _state.update {
                    it.copy(
                        loading = false,
                        workingCode = null,
                        counts = result.data.counts,
                        bookings = result.data.bookings,
                    )
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, workingCode = null, error = result.message) }
            }
        }
    }
}
