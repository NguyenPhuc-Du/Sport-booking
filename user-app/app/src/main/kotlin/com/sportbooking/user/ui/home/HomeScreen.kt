package com.sportbooking.user.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.domain.model.FacilitySummary
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.AppSearchBar
import com.sportbooking.user.ui.components.EmptyState
import com.sportbooking.user.ui.components.ErrorState
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.FilterChipRow
import com.sportbooking.user.ui.components.VenueCard
import com.sportbooking.user.ui.components.VenueCardShimmer
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData

sealed interface HomeUiEvent {
    data class SelectSport(val sportId: String) : HomeUiEvent
    data class ChangeQuery(val query: String) : HomeUiEvent
    data object Refresh : HomeUiEvent
    data class OpenFacility(val facilityId: String) : HomeUiEvent
}

@Composable
fun HomeScreen(
    onOpenFacility: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    HomeContent(
        state = state,
        onEvent = { event ->
            when (event) {
                is HomeUiEvent.SelectSport -> viewModel.onSportSelected(event.sportId)
                is HomeUiEvent.ChangeQuery -> viewModel.onQueryChange(event.query)
                HomeUiEvent.Refresh -> viewModel.load()
                is HomeUiEvent.OpenFacility -> onOpenFacility(event.facilityId)
            }
        },
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(
    state: HomeUiState,
    onEvent: (HomeUiEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val isRefreshing = state.loading && state.facilities.isNotEmpty()

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = { onEvent(HomeUiEvent.Refresh) },
        modifier = modifier.fillMaxSize(),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = MaterialTheme.spacing.extraLarge),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
        ) {
            // Header Section
            item(key = "home_header") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = MaterialTheme.spacing.extraSmall)
                        .padding(top = MaterialTheme.spacing.normal),
                ) {
                    Text(
                        text = stringResource(R.string.home_greeting),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(MaterialTheme.spacing.extraSmall))
                    Text(
                        text = stringResource(R.string.home_title),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
            }

            // Search Bar Section
            item(key = "home_search") {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = MaterialTheme.spacing.normal),
                ) {
                    AppSearchBar(
                        query = state.query,
                        onQueryChange = { onEvent(HomeUiEvent.ChangeQuery(it)) },
                        onSearch = { onEvent(HomeUiEvent.Refresh) },
                    )
                }
            }

            // Categories Section
            item(key = "home_categories") {
                Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small)) {
                    Text(
                        text = stringResource(R.string.home_categories_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                    )

                    FilterChipRow(
                        sports = state.sports,
                        selectedSportId = state.selectedSport,
                        onSportSelected = { onEvent(HomeUiEvent.SelectSport(it)) },
                    )
                }
            }

            // Venues Title Section
            item(key = "home_venues_title") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = MaterialTheme.spacing.normal),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(R.string.home_facilities_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    if (state.facilities.isNotEmpty()) {
                        Text(
                            text = "${state.facilities.size} sân",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // Content States
            when {
                state.loading && state.facilities.isEmpty() -> {
                    items(count = 3, key = { "shimmer_$it" }) {
                        Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                            VenueCardShimmer()
                        }
                    }
                }

                state.error != null && state.facilities.isEmpty() -> {
                    item(key = "home_error_state") {
                        ErrorState(
                            message = state.error,
                            onRetry = { onEvent(HomeUiEvent.Refresh) },
                        )
                    }
                }

                state.facilities.isEmpty() -> {
                    item(key = "home_empty_state") {
                        EmptyState(
                            title = stringResource(R.string.home_empty_title),
                            message = stringResource(R.string.home_empty_desc),
                            icon = Icons.Rounded.SearchOff,
                            actionLabel = "Xem tất cả",
                            onAction = {
                                onEvent(HomeUiEvent.ChangeQuery(""))
                                onEvent(HomeUiEvent.SelectSport("all"))
                            },
                        )
                    }
                }

                else -> {
                    items(
                        items = state.facilities,
                        key = { it.id },
                    ) { facility ->
                        Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                            VenueCard(
                                facility = facility,
                                onClick = { onEvent(HomeUiEvent.OpenFacility(facility.id)) },
                            )
                        }
                    }

                    if (state.error != null) {
                        item(key = "home_inline_error") {
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

// -------------------------------------------------------------
// Previews
// -------------------------------------------------------------

@PreviewLightDark
@PreviewFontScale
@Composable
private fun HomeContentSuccessPreview() {
    SportBookingTheme {
        Surface {
            HomeContent(
                state = HomeUiState(
                    loading = false,
                    sports = PreviewData.sports,
                    selectedSport = "badminton",
                    facilities = PreviewData.facilities,
                ),
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun HomeContentLoadingPreview() {
    SportBookingTheme {
        Surface {
            HomeContent(
                state = HomeUiState(
                    loading = true,
                    sports = PreviewData.sports,
                    facilities = emptyList(),
                ),
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun HomeContentEmptyPreview() {
    SportBookingTheme {
        Surface {
            HomeContent(
                state = HomeUiState(
                    loading = false,
                    sports = PreviewData.sports,
                    query = "Sân bóng chuyền",
                    facilities = emptyList(),
                ),
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun HomeContentErrorPreview() {
    SportBookingTheme {
        Surface {
            HomeContent(
                state = HomeUiState(
                    loading = false,
                    sports = PreviewData.sports,
                    facilities = emptyList(),
                    error = "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
                ),
                onEvent = {},
            )
        }
    }
}
