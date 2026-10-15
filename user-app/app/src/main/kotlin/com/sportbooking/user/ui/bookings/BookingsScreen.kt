package com.sportbooking.user.ui.bookings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.domain.model.Booking
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.util.toVnd

@Composable
fun BookingsScreen(
    onBalanceChanged: (Long) -> Unit,
    viewModel: BookingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(viewModel) {
        viewModel.balance.collect(onBalanceChanged)
    }
    DisposableEffect(lifecycleOwner, viewModel) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    Column(Modifier.fillMaxSize()) {
        Text(
            "Lịch đặt",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp),
        )
        val filters = listOf(
            "all" to "Tất cả (${state.counts.all})",
            "upcoming" to "Sắp diễn ra (${state.counts.upcoming})",
            "completed" to "Hoàn thành (${state.counts.completed})",
            "cancelled" to "Đã hủy (${state.counts.cancelled})",
        )
        LazyRow(
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(filters) { (id, label) ->
                FilterChip(
                    selected = state.filter == id,
                    onClick = { viewModel.onFilterSelected(id) },
                    label = { Text(label) },
                )
            }
        }
        when {
            state.loading && state.bookings.isEmpty() -> LoadingScreen()
            state.bookings.isEmpty() -> {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    Text("Chưa có đơn trong mục này")
                    ErrorText(state.error, Modifier.padding(top = 8.dp))
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.bookings, key = { it.code }) { booking ->
                        BookingCard(
                            booking = booking,
                            cancelling = state.workingCode == booking.code,
                            onCancel = { viewModel.cancel(booking.code) },
                        )
                    }
                    item { ErrorText(state.error) }
                }
            }
        }
    }
}

@Composable
private fun BookingCard(booking: Booking, cancelling: Boolean, onCancel: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(booking.code, style = MaterialTheme.typography.labelLarge)
                Text(booking.statusLabel, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
            }
            Text(booking.facilityName, style = MaterialTheme.typography.titleMedium)
            Text(booking.courtName)
            Text("${booking.date} · ${booking.time}")
            Text(booking.amount.toVnd(), style = MaterialTheme.typography.titleSmall)
            if (booking.status == "upcoming") {
                TextButton(onClick = onCancel, enabled = !cancelling) {
                    Text(if (cancelling) "Đang hủy..." else "Hủy đơn")
                }
            }
        }
    }
}
