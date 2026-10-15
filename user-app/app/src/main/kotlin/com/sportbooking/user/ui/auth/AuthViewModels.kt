package com.sportbooking.user.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.User
import com.sportbooking.domain.usecase.LoginUseCase
import com.sportbooking.domain.usecase.RegisterUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
)

data class RegisterUiState(
    val fullName: String = "",
    val phone: String = "",
    val email: String = "",
    val password: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state = _state.asStateFlow()
    private val _loggedIn = MutableSharedFlow<User>()
    val loggedIn = _loggedIn.asSharedFlow()

    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }

    fun submit() {
        val current = _state.value
        if (current.email.isBlank() || current.password.isBlank()) {
            _state.update { it.copy(error = "Nhập email và mật khẩu") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            when (val result = loginUseCase(current.email, current.password)) {
                is DomainResult.Success -> {
                    _state.update { it.copy(submitting = false) }
                    _loggedIn.emit(result.data)
                }
                is DomainResult.Failure -> _state.update { it.copy(submitting = false, error = result.message) }
            }
        }
    }
}

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val registerUseCase: RegisterUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(RegisterUiState())
    val state = _state.asStateFlow()
    private val _loggedIn = MutableSharedFlow<User>()
    val loggedIn = _loggedIn.asSharedFlow()

    fun onFullNameChange(value: String) = _state.update { it.copy(fullName = value, error = null) }
    fun onPhoneChange(value: String) = _state.update { it.copy(phone = value, error = null) }
    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }

    fun submit() {
        val current = _state.value
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            when (
                val result = registerUseCase(
                    current.fullName,
                    current.phone,
                    current.email,
                    current.password,
                )
            ) {
                is DomainResult.Success -> {
                    _state.update { it.copy(submitting = false) }
                    _loggedIn.emit(result.data)
                }
                is DomainResult.Failure -> _state.update { it.copy(submitting = false, error = result.message) }
            }
        }
    }
}
