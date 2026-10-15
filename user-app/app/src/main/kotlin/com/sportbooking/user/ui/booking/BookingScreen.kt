package com.sportbooking.user.ui.booking

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.CourtCard
import com.sportbooking.user.ui.components.DateStrip
import com.sportbooking.user.ui.components.ErrorState
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.components.TimeSlotChip
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.dayLabel
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
    onCheckout: (courtId: String, date: String, time: String) -> Unit,
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
                BookingUiEvent.Retry -> Unit
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
    onCheckout: (courtId: String, date: String, time: String) -> Unit,
    onEvent: (BookingUiEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val dates = remember { (0..13).map { LocalDate.now().plusDays(it.toLong()) } }
    val selectedCourt = state.courts.find { it.id == state.courtId }
    val selectedSlot = state.slots.find { it.time == state.selectedTime }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = state.facility?.name ?: stringResource(R.string.booking_title),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "${state.date.dayLabel()} · ${selectedCourt?.name ?: "Chưa chọn sân"}",
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
        },
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp,
                shadowElevation = 8.dp,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(MaterialTheme.spacing.normal),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                ) {
                    if (selectedSlot != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    text = "${selectedCourt?.name} · ${selectedSlot.time}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    text = selectedSlot.price.toVnd(),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }

                    PrimaryButton(
                        text = if (state.selectedTime != null) stringResource(R.string.booking_continue_cta) else "Vui lòng chọn khung giờ",
                        enabled = state.selectedTime != null,
                        leadingIcon = Icons.Rounded.Check,
                        onClick = {
                            val time = state.selectedTime ?: return@PrimaryButton
                            onCheckout(state.courtId, state.date.toString(), time)
                        },
                    )
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
                    onRetry = onBack,
                    modifier = Modifier.padding(padding),
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

                    // Step 3: Slots & Legend
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
                                    CircularProgressIndicator(
                                        strokeWidth = 2.dp,
                                        modifier = Modifier.size(16.dp),
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }

                            // Slot Legend
                            SlotLegend()
                        }
                    }

                    // Slot Matrix (chunked 3 per row)
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
                                        selected = slot.time == state.selectedTime,
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

                    if (state.error != null) {
                        item(key = "booking_error") {
                            Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                                ErrorText(message = state.error)
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
            color = MaterialTheme.extraColors.peakSlotContainer,
            borderColor = MaterialTheme.extraColors.peakSlot,
            label = stringResource(R.string.booking_slot_legend_peak),
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
                    selectedTime = "18:00 - 19:00",
                ),
                onBack = {},
                onCheckout = { _, _, _ -> },
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
                onCheckout = { _, _, _ -> },
                onEvent = {},
            )
        }
    }
}