package com.sportbooking.user.ui.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.User
import com.sportbooking.domain.usecase.GetSessionUseCase
import com.sportbooking.domain.usecase.LogoutUseCase
import com.sportbooking.user.session.GuestSessionStore
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface SessionUiState {
    data object Loading : SessionUiState
    data object LoggedOut : SessionUiState
    data object Guest : SessionUiState
    data class LoggedIn(val user: User) : SessionUiState
    data class Offline(val message: String) : SessionUiState
}

@HiltViewModel
class SessionViewModel @Inject constructor(
    private val getSession: GetSessionUseCase,
    private val logoutUseCase: LogoutUseCase,
    private val guestStore: GuestSessionStore,
) : ViewModel() {
    private val _state = MutableStateFlow<SessionUiState>(SessionUiState.Loading)
    val state = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = SessionUiState.Loading
            _state.value = when (val result = getSession()) {
                is DomainResult.Success -> SessionUiState.LoggedIn(result.data)
                is DomainResult.Failure -> {
                    if (result.unauthorized) SessionUiState.LoggedOut
                    else SessionUiState.Offline(result.message)
                }
            }
        }
    }

    fun enterGuest() {
        guestStore.clearAll()
        _state.value = SessionUiState.Guest
    }

    fun onAuthenticated(user: User) {
        _state.value = SessionUiState.LoggedIn(user)
    }

    fun logout() {
        viewModelScope.launch {
            logoutUseCase()
            guestStore.clearAll()
            _state.value = SessionUiState.LoggedOut
        }
    }
}
