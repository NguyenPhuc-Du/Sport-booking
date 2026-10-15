package com.sportbooking.data.repository

import com.sportbooking.data.remote.ApiCaller
import com.sportbooking.data.remote.SportApi
import com.sportbooking.data.remote.dto.toDomain
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.domain.model.HomeContent
import com.sportbooking.domain.model.SlotSchedule
import com.sportbooking.domain.repository.FacilityRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FacilityRepositoryImpl @Inject constructor(
    private val api: SportApi,
    private val caller: ApiCaller,
) : FacilityRepository {
    override suspend fun home(sport: String, query: String): DomainResult<HomeContent> {
        return when (val result = caller.call { api.home(sport, query) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun detail(id: String): DomainResult<FacilityDetail> {
        return when (val result = caller.call { api.facility(id) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.facility.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun slots(facilityId: String, courtId: String, date: String): DomainResult<SlotSchedule> {
        return when (val result = caller.call { api.slots(facilityId, courtId, date) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }
}
