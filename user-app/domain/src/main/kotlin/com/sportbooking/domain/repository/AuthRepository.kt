package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.User

interface AuthRepository {
    suspend fun login(email: String, password: String): DomainResult<User>
    suspend fun register(fullName: String, phone: String, email: String, password: String): DomainResult<User>
    suspend fun currentUser(): DomainResult<User>
    suspend fun logout()
}
