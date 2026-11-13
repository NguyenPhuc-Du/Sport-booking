package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.domain.model.HomeContent
import com.sportbooking.domain.model.SlotSchedule

interface FacilityRepository {
    suspend fun home(sport: String, query: String): DomainResult<HomeContent>
    suspend fun detail(id: String): DomainResult<FacilityDetail>
    suspend fun slots(facilityId: String, courtId: String, date: String): DomainResult<SlotSchedule>
}
