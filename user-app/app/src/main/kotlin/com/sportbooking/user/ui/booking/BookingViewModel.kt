package com.sportbooking.user.ui.booking

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Court
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.domain.model.TimeSlot
import com.sportbooking.domain.usecase.GetFacilityUseCase
import com.sportbooking.domain.usecase.GetSlotsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BookingUiState(
    val loading: Boolean = true,
    val facility: FacilityDetail? = null,
    val courtId: String = "",
    val date: LocalDate = LocalDate.now(),
    val slots: List<TimeSlot> = emptyList(),
    val selectedTimes: List<String> = emptyList(),
    val slotsLoading: Boolean = false,
    val error: String? = null,
) {
    val courts: List<Court> get() = facility?.courts.orEmpty()
}

@HiltViewModel
class BookingViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getFacility: GetFacilityUseCase,
    private val getSlots: GetSlotsUseCase,
) : ViewModel() {
    private val facilityId: String = checkNotNull(savedStateHandle["facilityId"])
    private val _state = MutableStateFlow(BookingUiState())
    val state = _state.asStateFlow()

    init {
        loadFacility()
    }

    fun loadFacility() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = getFacility(facilityId)) {
                is DomainResult.Success -> {
                    val courtId = result.data.courts.firstOrNull()?.id.orEmpty()
                    _state.update { it.copy(loading = false, facility = result.data, courtId = courtId) }
                    if (courtId.isNotBlank()) {
                        loadSlots()
                    }
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }

    fun onCourtSelected(courtId: String) {
        _state.update { it.copy(courtId = courtId, selectedTimes = emptyList(), slots = emptyList(), error = null) }
        loadSlots()
    }

    fun onDateSelected(date: LocalDate) {
        _state.update { it.copy(date = date, selectedTimes = emptyList(), slots = emptyList(), error = null) }
        loadSlots()
    }

    fun onSlotSelected(time: String) {
        val slots = _state.value.slots
        val slot = slots.find { it.time == time } ?: return
        if (!slot.available) return

        val current = _state.value.selectedTimes
        val merged = (if (time in current) current - time else current + time).sorted()
        if (merged.isEmpty()) {
            _state.update { it.copy(selectedTimes = emptyList(), error = null) }
            return
        }
        val indexes = merged.map { value -> slots.indexOfFirst { it.time == value } }
        val consecutive = indexes.zipWithNext().all { (a, b) -> b == a + 1 }
        if (merged.size > 3 || !consecutive || indexes.any { slots[it].available.not() }) {
            _state.update { it.copy(error = "Chỉ chọn 1 đến 3 khung giờ liền nhau") }
            return
        }
        _state.update { it.copy(selectedTimes = merged, error = null) }
    }

    fun retry() {
        if (_state.value.facility == null) {
            loadFacility()
        } else {
            loadSlots()
        }
    }

    private fun loadSlots() {
        val current = _state.value
        if (current.courtId.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(slotsLoading = true, error = null, slots = emptyList(), selectedTimes = emptyList()) }
            when (val result = getSlots(facilityId, current.courtId, current.date.toString())) {
                is DomainResult.Success -> _state.update { it.copy(slotsLoading = false, slots = result.data.slots) }
                is DomainResult.Failure -> _state.update { it.copy(slotsLoading = false, slots = emptyList(), error = result.message) }
            }
        }
    }
}
