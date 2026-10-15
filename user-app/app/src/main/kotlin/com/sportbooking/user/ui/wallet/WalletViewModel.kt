package com.sportbooking.user.ui.wallet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.usecase.GetWalletUseCase
import com.sportbooking.domain.usecase.TopUpWalletUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WalletUiState(
    val loading: Boolean = true,
    val balance: Long = 0,
    val amounts: List<Long> = emptyList(),
    val methods: List<PaymentMethod> = emptyList(),
    val amount: Long? = null,
    val method: String = "vnpay",
    val submitting: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val getWallet: GetWalletUseCase,
    private val topUpWallet: TopUpWalletUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(WalletUiState())
    val state = _state.asStateFlow()
    private val _balance = MutableSharedFlow<Long>()
    val balance = _balance.asSharedFlow()

    init {
        refresh()
    }

    fun onAmountSelected(amount: Long) = _state.update { it.copy(amount = amount, error = null, message = null) }
    fun onMethodSelected(method: String) = _state.update { it.copy(method = method, error = null) }

    fun topUp() {
        val amount = _state.value.amount ?: run {
            _state.update { it.copy(error = "Chọn mệnh giá") }
            return
        }
        val method = _state.value.method
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = topUpWallet(amount, method)) {
                is DomainResult.Success -> {
                    _state.update { it.copy(submitting = false, balance = result.data.balance, message = "Nạp tiền thành công") }
                    _balance.emit(result.data.balance)
                }
                is DomainResult.Failure -> _state.update { it.copy(submitting = false, error = result.message) }
            }
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            when (val result = getWallet()) {
                is DomainResult.Success -> _state.update {
                    it.copy(
                        loading = false,
                        balance = result.data.balance,
                        amounts = result.data.amounts,
                        methods = result.data.methods,
                        method = result.data.methods.firstOrNull()?.id ?: it.method,
                    )
                }
                is DomainResult.Failure -> _state.update { it.copy(loading = false, error = result.message) }
            }
        }
    }
}
