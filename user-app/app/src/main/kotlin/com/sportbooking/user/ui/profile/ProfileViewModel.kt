package com.sportbooking.user.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.AppNotification
import com.sportbooking.domain.model.Review
import com.sportbooking.domain.model.User
import com.sportbooking.domain.usecase.GetProfileUseCase
import com.sportbooking.domain.usecase.UpdateProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val loading: Boolean = true,
    val fullName: String = "",
    val phone: String = "",
    val email: String = "",
    val notifications: List<AppNotification> = emptyList(),
    val reviews: List<Review> = emptyList(),
    val saving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val getProfile: GetProfileUseCase,
    private val updateProfile: UpdateProfileUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileUiState())
    val state = _state.asStateFlow()
    private val _updated = MutableSharedFlow<User>()
    val updated = _updated.asSharedFlow()

    init {
        refresh()
    }

    fun onFullNameChange(value: String) = _state.update { it.copy(fullName = value, error = null, message = null) }
    fun onPhoneChange(value: String) = _state.update { it.copy(phone = value, error = null, message = null) }
    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null, message = null) }

   fun save() {
        val current = _state.value
        if (current.saving) return
        _state.update { it.copy(saving = true, error = null, message = null) }
        viewModelScope.launch {
            when (val result = updateProfile(current.fullName, current.phone, current.email)) {
                is DomainResult.Success -> {
                    _state.update {
                        it.copy(
                            saving = false,
                            fullName = result.data.fullName,
                            phone = result.data.phone,
                            email = result.data.email,
                            message = "Đã lưu hồ sơ",
                        )
                    }
                    _updated.emit(result.data)
                }
                is DomainResult.Failure -> _state.update { it.copy(saving = false, error = result.message) }
            }
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            when (val result = getProfile()) {
                is DomainResult.Success -> _state.update {
                    it.copy(
                        loading = false,
                        fullName = result.data.user.fullName,
                        phone = result.data.user.phone,
                        email = result.data.user.email,
                        notifications = result.data.notifications,
                        reviews = result.data.reviews,
                    )
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }
}
