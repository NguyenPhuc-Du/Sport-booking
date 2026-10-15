package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.TopUpResult
import com.sportbooking.domain.model.WalletInfo

interface WalletRepository {
    suspend fun wallet(): DomainResult<WalletInfo>
    suspend fun topUp(amount: Long, method: String): DomainResult<TopUpResult>
}
