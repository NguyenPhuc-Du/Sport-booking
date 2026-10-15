package com.sportbooking.user.ui.checkout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.util.toVnd

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    walletBalance: Long,
    onBack: () -> Unit,
    onBooked: (Long) -> Unit,
    viewModel: CheckoutViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(viewModel) {
        viewModel.booked.collect(onBooked)
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Xác nhận đặt sân") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                },
            )
        },
        bottomBar = {
            Button(
                onClick = viewModel::confirm,
                enabled = state.quote != null && !state.submitting,
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            ) {
                val amount = state.quote?.amount?.toVnd() ?: ""
                Text(if (state.submitting) "Đang đặt sân..." else "Thanh toán $amount")
            }
        },
    ) { padding ->
        if (state.loading && state.quote == null) {
            LoadingScreen(Modifier.padding(padding))
            return@Scaffold
        }
        val quote = state.quote
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (quote != null) {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(quote.facilityName, style = MaterialTheme.typography.titleMedium)
                        Text(quote.courtName)
                        Text("${quote.date} · ${quote.time}")
                        Text("Giá sân ${quote.courtPrice.toVnd()}")
                        if (quote.discount > 0) Text("Giảm ${quote.discount.toVnd()}")
                        Text("Còn lại trong ví ${walletBalance.toVnd()}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Text("Mã giảm giá", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                state.vouchers.forEach { voucher ->
                    FilterChip(
                        selected = state.appliedVoucher == voucher.code,
                        onClick = { viewModel.applyVoucher(voucher.code) },
                        label = { Text(voucher.code) },
                    )
                }
            }
            OutlinedTextField(
                value = state.voucherInput,
                onValueChange = viewModel::onVoucherChange,
                label = { Text("Nhập mã") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                trailingIcon = {
                    TextButton(onClick = viewModel::applyTypedVoucher) { Text("Áp dụng") }
                },
            )
            Text("Thanh toán", style = MaterialTheme.typography.titleMedium)
            state.payments.forEach { method ->
                Card(onClick = { viewModel.onPaymentSelected(method.id) }, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = state.paymentMethod == method.id,
                            onClick = { viewModel.onPaymentSelected(method.id) },
                        )
                        Column {
                            Text(method.title, style = MaterialTheme.typography.titleSmall)
                            Text(method.description, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            ErrorText(state.error)
        }
    }
}
