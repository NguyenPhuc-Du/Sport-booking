package com.sportbooking.domain.usecase

import com.sportbooking.domain.repository.AuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(email: String, password: String) = repository.login(email.trim(), password)
}

class RegisterUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(fullName: String, phone: String, email: String, password: String) =
        repository.register(fullName.trim(), phone.trim(), email.trim().lowercase(), password)
}

class VerifyRegisterOtpUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(email: String, code: String) = repository.verifyRegister(email, code.trim())
}

class ResendOtpUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(email: String, purpose: String) = repository.resendOtp(email, purpose)
}

class ForgotPasswordUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(email: String) = repository.forgotPassword(email.trim().lowercase())
}

class ResetPasswordUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(email: String, code: String, newPassword: String) =
        repository.resetPassword(email, code, newPassword)
}

class GetSessionUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke() = repository.currentUser()
}

class LogoutUseCase @Inject constructor(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke() = repository.logout()
}