package com.sportbooking.user.ui.wallet

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
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

@Composable
fun WalletScreen(
    onBalanceChanged: (Long) -> Unit,
    viewModel: WalletViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(viewModel) {
        viewModel.balance.collect(onBalanceChanged)
    }
    if (state.loading) {
        LoadingScreen()
        return
    }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Ví SportZone", style = MaterialTheme.typography.headlineSmall)
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Số dư", style = MaterialTheme.typography.bodyMedium)
                Text(state.balance.toVnd(), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
            }
        }
        Text("Mệnh giá", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            state.amounts.take(3).forEach { amount ->
                FilterChip(
                    selected = state.amount == amount,
                    onClick = { viewModel.onAmountSelected(amount) },
                    label = { Text(amount.toVnd()) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            state.amounts.drop(3).forEach { amount ->
                FilterChip(
                    selected = state.amount == amount,
                    onClick = { viewModel.onAmountSelected(amount) },
                    label = { Text(amount.toVnd()) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Text("Cổng nạp", style = MaterialTheme.typography.titleMedium)
        state.methods.forEach { method ->
            Card(onClick = { viewModel.onMethodSelected(method.id) }, modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = state.method == method.id, onClick = { viewModel.onMethodSelected(method.id) })
                    Column {
                        Text(method.title, style = MaterialTheme.typography.titleSmall)
                        Text(method.description, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        ErrorText(state.error)
        Button(
            onClick = viewModel::topUp,
            enabled = !state.submitting,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (state.submitting) "Đang nạp..." else "Nạp tiền")
        }
    }
}
