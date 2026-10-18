package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.User

interface AuthRepository {
    suspend fun login(email: String, password: String): DomainResult<User>
    suspend fun register(fullName: String, phone: String, email: String, password: String): DomainResult<String>
    suspend fun verifyRegister(email: String, code: String): DomainResult<User>
    suspend fun resendOtp(email: String, purpose: String): DomainResult<String>
    suspend fun forgotPassword(email: String): DomainResult<String>
    suspend fun resetPassword(email: String, code: String, newPassword: String): DomainResult<String>
    suspend fun currentUser(): DomainResult<User>
    suspend fun logout()
}