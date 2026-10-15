package com.sportbooking.user.ui.booking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.domain.model.TimeSlot
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.util.dayLabel
import com.sportbooking.user.ui.util.toVnd
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingScreen(
    onBack: () -> Unit,
    onCheckout: (courtId: String, date: String, time: String) -> Unit,
    viewModel: BookingViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val dates = (0..6).map { LocalDate.now().plusDays(it.toLong()) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.facility?.name ?: "Đặt sân") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                },
            )
        },
        bottomBar = {
            Button(
                onClick = {
                    val time = state.selectedTime ?: return@Button
                    onCheckout(state.courtId, state.date.toString(), time)
                },
                enabled = state.selectedTime != null,
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            ) {
                Text("Tiếp tục thanh toán")
            }
        },
    ) { padding ->
        if (state.loading) {
            LoadingScreen(Modifier.padding(padding))
            return@Scaffold
        }
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Chọn sân", style = MaterialTheme.typography.titleMedium)
            state.courts.forEach { court ->
                FilterChip(
                    selected = court.id == state.courtId,
                    onClick = { viewModel.onCourtSelected(court.id) },
                    label = { Text(court.name) },
                )
            }
            Text("Chọn ngày", style = MaterialTheme.typography.titleMedium)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(dates) { date ->
                    FilterChip(
                        selected = date == state.date,
                        onClick = { viewModel.onDateSelected(date) },
                        label = { Text(date.dayLabel()) },
                    )
                }
            }
            Text("Khung giờ", style = MaterialTheme.typography.titleMedium)
            if (state.slotsLoading) {
                Text("Đang tải khung giờ...")
            }
            state.slots.chunked(3).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    row.forEach { slot ->
                        SlotChip(
                            slot = slot,
                            selected = slot.time == state.selectedTime,
                            onClick = { viewModel.onSlotSelected(slot.time) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
            ErrorText(state.error)
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SlotChip(
    slot: TimeSlot,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        enabled = slot.available,
        modifier = modifier,
        label = {
            Column(Modifier.padding(vertical = 4.dp)) {
                Text(slot.time)
                Text(slot.price.toVnd(), style = MaterialTheme.typography.labelSmall)
                if (slot.peak) Text("Giờ vàng", style = MaterialTheme.typography.labelSmall)
            }
        },
    )
}