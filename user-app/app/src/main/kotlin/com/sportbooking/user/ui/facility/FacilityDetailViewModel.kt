package com.sportbooking.user.ui.facility

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.domain.usecase.GetFacilityUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class FacilityDetailUiState(
    val loading: Boolean = true,
    val facility: FacilityDetail? = null,
    val error: String? = null,
)

@HiltViewModel
class FacilityDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getFacility: GetFacilityUseCase,
) : ViewModel() {
    private val facilityId: String = checkNotNull(savedStateHandle["facilityId"])
    private val _state = MutableStateFlow(FacilityDetailUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            when (val result = getFacility(facilityId)) {
                is DomainResult.Success -> _state.value = FacilityDetailUiState(loading = false, facility = result.data)
                is DomainResult.Failure -> _state.value = FacilityDetailUiState(loading = false, error = result.message)
            }
        }
    }
}
