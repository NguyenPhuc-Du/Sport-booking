package com.sportbooking.domain.usecase

import com.sportbooking.domain.repository.FacilityRepository
import javax.inject.Inject

class GetHomeUseCase @Inject constructor(
    private val repository: FacilityRepository,
) {
    suspend operator fun invoke(sport: String, query: String) = repository.home(sport, query.trim())
}

class GetFacilityUseCase @Inject constructor(
    private val repository: FacilityRepository,
) {
    suspend operator fun invoke(id: String) = repository.detail(id)
}

class GetSlotsUseCase @Inject constructor(
    private val repository: FacilityRepository,
) {
    suspend operator fun invoke(facilityId: String, courtId: String, date: String) =
        repository.slots(facilityId, courtId, date)
}
