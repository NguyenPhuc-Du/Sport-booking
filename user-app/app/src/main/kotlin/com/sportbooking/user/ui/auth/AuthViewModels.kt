package com.sportbooking.user.ui.auth

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.User
import com.sportbooking.domain.usecase.ForgotPasswordUseCase
import com.sportbooking.domain.usecase.LoginUseCase
import com.sportbooking.domain.usecase.RegisterUseCase
import com.sportbooking.domain.usecase.ResendOtpUseCase
import com.sportbooking.domain.usecase.ResetPasswordUseCase
import com.sportbooking.domain.usecase.VerifyRegisterOtpUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val OTP_PURPOSE_REGISTER = "register"
const val OTP_PURPOSE_RESET = "reset_password"

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

data class OtpUiState(
    val code: String = "",
    val verifying: Boolean = false,
    val error: String? = null,
    val info: String? = null,
)

data class ForgotPasswordUiState(
    val sending: Boolean = false,
    val error: String? = null,
)

data class ResetPasswordUiState(
    val password: String = "",
    val confirm: String = "",
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
    private val _otpSent = MutableSharedFlow<String>()
    val otpSent = _otpSent.asSharedFlow()

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
                    _otpSent.emit(current.email.trim().lowercase())
                }
                is DomainResult.Failure -> _state.update { it.copy(submitting = false, error = result.message) }
            }
        }
    }
}

@HiltViewModel
class OtpViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val verifyRegister: VerifyRegisterOtpUseCase,
    private val resendOtp: ResendOtpUseCase,
) : ViewModel() {
    val email: String = checkNotNull(savedStateHandle["email"])
    val purpose: String = checkNotNull(savedStateHandle["purpose"])

    private val _state = MutableStateFlow(OtpUiState())
    val state = _state.asStateFlow()
    private val _registered = MutableSharedFlow<User>()
    val registered = _registered.asSharedFlow()
    private val _resetCode = MutableSharedFlow<String>()
    val resetCode = _resetCode.asSharedFlow()

    fun onCodeChange(value: String) =
        _state.update { it.copy(code = value.filter(Char::isDigit).take(6), error = null) }

    fun consumeInfo() = _state.update { it.copy(info = null) }

    fun submit() {
        val code = _state.value.code
        if (code.length != 6) {
            _state.update { it.copy(error = "Vui lòng nhập đủ 6 chữ số OTP") }
            return
        }
        viewModelScope.launch {
            if (purpose == OTP_PURPOSE_RESET) {
                _resetCode.emit(code)
                return@launch
            }
            _state.update { it.copy(verifying = true, error = null) }
            when (val result = verifyRegister(email, code)) {
                is DomainResult.Success -> {
                    _state.update { it.copy(verifying = false) }
                    _registered.emit(result.data)
                }
                is DomainResult.Failure -> _state.update { it.copy(verifying = false, error = result.message) }
            }
        }
    }

    fun resend() {
        viewModelScope.launch {
            _state.update { it.copy(code = "", error = null) }
            when (val result = resendOtp(email, purpose)) {
                is DomainResult.Success -> _state.update { it.copy(info = result.data) }
                is DomainResult.Failure -> _state.update { it.copy(error = result.message) }
            }
        }
    }
}

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val forgotPassword: ForgotPasswordUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(ForgotPasswordUiState())
    val state = _state.asStateFlow()
    private val _sent = MutableSharedFlow<String>()
    val sent = _sent.asSharedFlow()

    fun clearError() = _state.update { it.copy(error = null) }

    fun submit(email: String) {
        val normalized = email.trim().lowercase()
        if (!normalized.contains("@")) {
            _state.update { it.copy(error = "Vui lòng nhập email đã đăng ký") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(sending = true, error = null) }
            when (val result = forgotPassword(normalized)) {
                is DomainResult.Success -> {
                    _state.update { it.copy(sending = false) }
                    _sent.emit(normalized)
                }
                is DomainResult.Failure -> _state.update { it.copy(sending = false, error = result.message) }
            }
        }
    }
}

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val resetPassword: ResetPasswordUseCase,
) : ViewModel() {
    private val email: String = checkNotNull(savedStateHandle["email"])
    private val code: String = checkNotNull(savedStateHandle["code"])

    private val _state = MutableStateFlow(ResetPasswordUiState())
    val state = _state.asStateFlow()
    private val _done = MutableSharedFlow<String>()
    val done = _done.asSharedFlow()

    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }
    fun onConfirmChange(value: String) = _state.update { it.copy(confirm = value, error = null) }

    fun submit() {
        val current = _state.value
        if (current.password.length < 6) {
            _state.update { it.copy(error = "Mật khẩu cần ít nhất 6 ký tự") }
            return
        }
        if (current.password != current.confirm) {
            _state.update { it.copy(error = "Mật khẩu nhập lại không khớp") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            when (val result = resetPassword(email, code, current.password)) {
                is DomainResult.Success -> {
                    _state.update { it.copy(submitting = false) }
                    _done.emit(result.data)
                }
                is DomainResult.Failure -> _state.update { it.copy(submitting = false, error = result.message) }
            }
        }
    }
}