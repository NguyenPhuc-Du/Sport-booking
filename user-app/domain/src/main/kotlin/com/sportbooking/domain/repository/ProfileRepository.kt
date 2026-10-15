package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Profile
import com.sportbooking.domain.model.User

interface ProfileRepository {
    suspend fun profile(): DomainResult<Profile>
    suspend fun update(fullName: String, phone: String, email: String): DomainResult<User>
}
