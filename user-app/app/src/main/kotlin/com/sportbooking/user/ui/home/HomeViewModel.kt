package com.sportbooking.user.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.FacilitySummary
import com.sportbooking.domain.model.Sport
import com.sportbooking.domain.usecase.GetHomeUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val loading: Boolean = true,
    val sports: List<Sport> = emptyList(),
    val selectedSport: String = "all",
    val query: String = "",
    val facilities: List<FacilitySummary> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getHome: GetHomeUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(HomeUiState())
    val state = _state.asStateFlow()
    private var loadJob: Job? = null
    private var searchJob: Job? = null

    init {
        load()
    }

    fun onSportSelected(id: String) {
        _state.update { it.copy(selectedSport = id) }
        load()
    }

    fun onQueryChange(value: String) {
        _state.update { it.copy(query = value) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            load()
        }
    }

    fun load() {
        val snapshot = _state.value
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = getHome(snapshot.selectedSport, snapshot.query)) {
                is DomainResult.Success -> _state.update {
                    it.copy(
                        loading = false,
                        sports = result.data.sports,
                        facilities = result.data.facilities,
                    )
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }
}
