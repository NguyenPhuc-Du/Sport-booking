package com.sportbooking.user.ui.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.CourtCard
import com.sportbooking.user.ui.components.DateStrip
import com.sportbooking.user.ui.components.EmptyState
import com.sportbooking.user.ui.components.ErrorState
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.components.TimeSlotChip
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.dayLabel
import androidx.compose.foundation.layout.WindowInsets
import com.sportbooking.user.ui.util.toVnd
import java.time.LocalDate

sealed interface BookingUiEvent {
    data class SelectCourt(val courtId: String) : BookingUiEvent
    data class SelectDate(val date: LocalDate) : BookingUiEvent
    data class SelectSlot(val time: String) : BookingUiEvent
    data object Retry : BookingUiEvent
}

@Composable
fun BookingScreen(
    onBack: () -> Unit,
    onCheckout: (courtId: String, date: String, time: String, hours: Int) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BookingViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    BookingContent(
        state = state,
        onBack = onBack,
        onCheckout = onCheckout,
        onEvent = { event ->
            when (event) {
                is BookingUiEvent.SelectCourt -> viewModel.onCourtSelected(event.courtId)
                is BookingUiEvent.SelectDate -> viewModel.onDateSelected(event.date)
                is BookingUiEvent.SelectSlot -> viewModel.onSlotSelected(event.time)
                BookingUiEvent.Retry -> viewModel.retry()
            }
        },
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingContent(
    state: BookingUiState,
    onBack: () -> Unit,
    onCheckout: (courtId: String, date: String, time: String, hours: Int) -> Unit,
    onEvent: (BookingUiEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val dates = remember { (0..13).map { LocalDate.now().plusDays(it.toLong()) } }
    val selectedCourt = state.courts.find { it.id == state.courtId }
    val selectedSlots = state.selectedTimes.mapNotNull { time -> state.slots.find { it.time == time } }
    val totalPrice = selectedSlots.sumOf { it.price }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0, 0, 0, 0),
                title = {
                    Column {
                        Text(
                            text = state.facility?.name ?: stringResource(R.string.booking_title),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = if (selectedCourt != null) {
                                "${state.date.dayLabel()} · ${selectedCourt.name}"
                            } else {
                                state.date.dayLabel()
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = stringResource(R.string.btn_back),
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
        },
        bottomBar = {
            if (state.courts.isNotEmpty()) {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 8.dp,
                    shadowElevation = 8.dp,
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = MaterialTheme.spacing.normal)
                            .padding(top = MaterialTheme.spacing.small, bottom = MaterialTheme.spacing.medium),
                        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                    ) {
                        if (selectedSlots.isNotEmpty()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(
                                        text = "${selectedCourt?.name} · ${selectedSlots.first().time} - ${plusOneHour(selectedSlots.last().time)}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        text = totalPrice.toVnd(),
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                        }

                        PrimaryButton(
                            text = if (selectedSlots.isNotEmpty()) stringResource(R.string.booking_continue_cta) else "Vui lòng chọn khung giờ",
                            enabled = selectedSlots.isNotEmpty(),
                            leadingIcon = Icons.Rounded.Check,
                            onClick = {
                                if (selectedSlots.isEmpty()) return@PrimaryButton
                                onCheckout(
                                    state.courtId,
                                    state.date.toString(),
                                    selectedSlots.first().time,
                                    selectedSlots.size,
                                )
                            },
                        )
                    }
                }
            }
        },
        modifier = modifier,
    ) { padding ->
        when {
            state.loading -> {
                LoadingScreen(modifier = Modifier.padding(padding))
            }

            state.error != null && state.facility == null -> {
                ErrorState(
                    message = state.error,
                    onRetry = { onEvent(BookingUiEvent.Retry) },
                    modifier = Modifier.padding(padding),
                )
            }

            state.facility != null && state.courts.isEmpty() -> {
                EmptyState(
                    title = stringResource(R.string.booking_no_courts_title),
                    message = stringResource(R.string.booking_no_courts_desc),
                    icon = Icons.Rounded.EventBusy,
                    actionLabel = stringResource(R.string.btn_back),
                    onAction = onBack,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                )
            }

            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(
                        start = MaterialTheme.spacing.none,
                        end = MaterialTheme.spacing.none,
                        top = MaterialTheme.spacing.normal,
                        bottom = MaterialTheme.spacing.extraLarge,
                    ),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
                ) {
                    // Step 1: Court Selection
                    item(key = "booking_step_court") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = MaterialTheme.spacing.normal),
                            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                        ) {
                            Text(
                                text = stringResource(R.string.booking_select_court),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            state.courts.forEach { court ->
                                CourtCard(
                                    court = court,
                                    selected = court.id == state.courtId,
                                    onClick = { onEvent(BookingUiEvent.SelectCourt(court.id)) },
                                    modifier = Modifier.padding(vertical = 4.dp),
                                )
                            }
                        }
                    }

                    item(key = "booking_divider_1") {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        )
                    }

                    // Step 2: Date Strip
                    item(key = "booking_step_date") {
                        Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small)) {
                            Text(
                                text = stringResource(R.string.booking_select_date),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                            )
                            DateStrip(
                                dates = dates,
                                selectedDate = state.date,
                                onDateSelected = { onEvent(BookingUiEvent.SelectDate(it)) },
                            )
                        }
                    }

                    item(key = "booking_divider_2") {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        )
                    }

                    // Step 3: Slots & Legend Header
                    item(key = "booking_step_slots") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = MaterialTheme.spacing.normal),
                            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = stringResource(R.string.booking_select_time),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                if (state.slotsLoading) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        Text(
                                            text = stringResource(R.string.booking_slot_loading),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                        CircularProgressIndicator(
                                            strokeWidth = 2.dp,
                                            modifier = Modifier.size(14.dp),
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                    }
                                }
                            }

                            // Chú thích màu chỉ hiện khi đã có khung giờ khả dụng
                            if (state.slots.isNotEmpty()) {
                                SlotLegend()
                            }
                        }
                    }

                    // Khối hiển thị thông báo lỗi tải khung giờ
                    if (state.error != null) {
                        item(key = "booking_slots_error") {
                            Surface(
                                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.35f),
                                shape = MaterialTheme.shapes.medium,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = MaterialTheme.spacing.normal),
                            ) {
                                Row(
                                    modifier = Modifier.padding(MaterialTheme.spacing.medium),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Không thể tải khung giờ",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.error,
                                        )
                                        Text(
                                            text = state.error,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    TextButton(
                                        onClick = { onEvent(BookingUiEvent.Retry) },
                                    ) {
                                        Text(
                                            text = stringResource(R.string.btn_retry),
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                    }
                                }
                            }
                        }
                    } else if (!state.slotsLoading && state.slots.isEmpty()) {
                        // Sân chưa có khung giờ / price rule cho ngày đã chọn
                        item(key = "booking_no_slots") {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                                shape = MaterialTheme.shapes.medium,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = MaterialTheme.spacing.normal),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = MaterialTheme.spacing.large, horizontal = MaterialTheme.spacing.medium),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.surfaceVariant),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            imageVector = Icons.Rounded.EventBusy,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(24.dp),
                                        )
                                    }
                                    Text(
                                        text = stringResource(R.string.booking_no_slots_title),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        textAlign = TextAlign.Center,
                                    )
                                    Text(
                                        text = stringResource(R.string.booking_no_slots_desc),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        textAlign = TextAlign.Center,
                                    )
                                }
                            }
                        }
                    } else {
                        // Ma trận khung giờ (3 ô một hàng)
                        items(
                            items = state.slots.chunked(3),
                            key = { row -> row.joinToString("-") { it.time } },
                        ) { row ->
                            Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    row.forEach { slot ->
                                        TimeSlotChip(
                                            slot = slot,
                                            selected = slot.time in state.selectedTimes,
                                            onClick = { onEvent(BookingUiEvent.SelectSlot(slot.time)) },
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                    repeat(3 - row.size) {
                                        Spacer(Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SlotLegend(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = MaterialTheme.spacing.small),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LegendItem(
            color = MaterialTheme.colorScheme.surface,
            borderColor = MaterialTheme.colorScheme.outlineVariant,
            label = stringResource(R.string.booking_slot_legend_available),
        )
        LegendItem(
            color = MaterialTheme.colorScheme.primary,
            borderColor = MaterialTheme.colorScheme.primary,
            label = stringResource(R.string.booking_slot_legend_selected),
        )
        LegendItem(
            color = MaterialTheme.extraColors.bookedSlotContainer,
            borderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
            label = stringResource(R.string.booking_slot_legend_booked),
        )
    }
}

@Composable
private fun LegendItem(
    color: Color,
    borderColor: Color,
    label: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Surface(
            color = color,
            shape = CircleShape,
            border = androidx.compose.foundation.BorderStroke(1.dp, borderColor),
            modifier = Modifier.size(10.dp),
        ) {}
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// -------------------------------------------------------------
// Previews
// -------------------------------------------------------------

@Composable
private fun plusOneHour(time: String): String {
    val parts = time.split(":")
    val hour = (parts.firstOrNull()?.toIntOrNull() ?: 0) + 1
    val minute = parts.getOrElse(1) { "00" }
    return "%02d:%s".format(hour, minute)
}

@PreviewLightDark
@PreviewFontScale
@Composable
private fun BookingContentSuccessPreview() {
    SportBookingTheme {
        Surface {
            BookingContent(
                state = BookingUiState(
                    loading = false,
                    facility = PreviewData.facilityDetail,
                    courtId = "c_1",
                    date = LocalDate.now(),
                    slots = PreviewData.timeSlots,
                    selectedTimes = listOf("18:00", "19:00"),
                ),
                onBack = {},
                onCheckout = { _, _, _, _ -> },
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun BookingContentNoCourtsPreview() {
    SportBookingTheme {
        Surface {
            BookingContent(
                state = BookingUiState(
                    loading = false,
                    facility = PreviewData.facilityDetail.copy(courts = emptyList()),
                ),
                onBack = {},
                onCheckout = { _, _, _, _ -> },
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun BookingContentNoSlotsPreview() {
    SportBookingTheme {
        Surface {
            BookingContent(
                state = BookingUiState(
                    loading = false,
                    facility = PreviewData.facilityDetail,
                    courtId = "c_1",
                    date = LocalDate.now(),
                    slots = emptyList(),
                ),
                onBack = {},
                onCheckout = { _, _, _, _ -> },
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun BookingContentLoadingPreview() {
    SportBookingTheme {
        Surface {
            BookingContent(
                state = BookingUiState(loading = true),
                onBack = {},
                onCheckout = { _, _, _, _ -> },
                onEvent = {},
            )
        }
    }
}