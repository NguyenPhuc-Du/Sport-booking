package com.sportbooking.user.ui.facility

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Share
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.CourtCard
import com.sportbooking.user.ui.components.ErrorState
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.components.RatingBar
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData

@Composable
fun FacilityDetailScreen(
    onBack: () -> Unit,
    onBook: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FacilityDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    FacilityDetailContent(
        state = state,
        onBack = onBack,
        onBook = onBook,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FacilityDetailContent(
    state: FacilityDetailUiState,
    onBack: () -> Unit,
    onBook: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val facility = state.facility
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = facility?.name ?: stringResource(R.string.facility_detail_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = stringResource(R.string.btn_back),
                        )
                    }
                },
                actions = {
                    if (facility != null) {
                        IconButton(
                            onClick = {
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, facility.name)
                                    putExtra(Intent.EXTRA_TEXT, "${facility.name}\n${facility.location}")
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Chia sẻ sân"))
                            },
                        ) {
                            Icon(Icons.Rounded.Share, contentDescription = "Chia sẻ")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
        bottomBar = {
            if (facility != null) {
                val hasCourts = facility.courts.isNotEmpty()
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 8.dp,
                    shadowElevation = 8.dp,
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(MaterialTheme.spacing.normal),
                    ) {
                        PrimaryButton(
                            text = if (hasCourts) {
                                stringResource(R.string.facility_book_cta)
                            } else {
                                stringResource(R.string.facility_no_courts_cta)
                            },
                            enabled = hasCourts,
                            leadingIcon = Icons.Rounded.EventAvailable,
                            onClick = {
                                if (hasCourts) {
                                    onBook(facility.id)
                                }
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

            state.error != null && facility == null -> {
                ErrorState(
                    message = state.error,
                    onRetry = onBack,
                    modifier = Modifier.padding(padding),
                )
            }

            facility != null -> {
                val images = if (facility.images.isNotEmpty()) facility.images else listOf(facility.image)
                val pagerState = rememberPagerState { images.size }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(bottom = MaterialTheme.spacing.extraLarge),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
                ) {
                    // Image Gallery Pager
                    item(key = "facility_gallery") {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(230.dp),
                        ) {
                            HorizontalPager(
                                state = pagerState,
                                modifier = Modifier.fillMaxSize(),
                            ) { page ->
                                AsyncImage(
                                    model = ImageRequest.Builder(LocalContext.current)
                                        .data(images[page])
                                        .crossfade(true)
                                        .placeholder(R.drawable.ic_placeholder_court)
                                        .error(R.drawable.ic_placeholder_court)
                                        .build(),
                                    contentDescription = facility.name,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            }

                            if (images.size > 1) {
                                Surface(
                                    color = Color.Black.copy(alpha = 0.6f),
                                    contentColor = Color.White,
                                    shape = PillShape,
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .padding(MaterialTheme.spacing.normal),
                                ) {
                                    Text(
                                        text = "${pagerState.currentPage + 1}/${images.size}",
                                        style = MaterialTheme.typography.labelSmall,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    )
                                }
                            }
                        }
                    }

                    // Title & Rating & Location Card
                    item(key = "facility_main_info") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = MaterialTheme.spacing.normal),
                            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                        ) {
                            if (!facility.badge.isNullOrBlank()) {
                                Surface(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                    shape = PillShape,
                                ) {
                                    Text(
                                        text = facility.badge.orEmpty(),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    )
                                }
                            }

                            Text(
                                text = facility.name,
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                            )

                            RatingBar(
                                rating = facility.rating,
                                reviewsCount = facility.reviews,
                            )

                            Spacer(Modifier.height(MaterialTheme.spacing.extraSmall))

                            InfoTile(
                                icon = Icons.Rounded.LocationOn,
                                title = facility.location,
                                subtitle = "Nhấn để mở chỉ đường",
                                onClick = {
                                    val mapIntent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(facility.location)}"))
                                    context.startActivity(mapIntent)
                                },
                            )

                            InfoTile(
                                icon = Icons.Rounded.Schedule,
                                title = facility.hours,
                            )

                            InfoTile(
                                icon = Icons.Rounded.Call,
                                title = facility.phone,
                                subtitle = "Gọi trực tiếp cơ sở",
                                onClick = {
                                    val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${facility.phone}"))
                                    context.startActivity(dialIntent)
                                },
                            )
                        }
                    }

                    item(key = "facility_divider_1") {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        )
                    }

                    // Description Section
                    item(key = "facility_about") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = MaterialTheme.spacing.normal),
                            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.extraSmall),
                        ) {
                            Text(
                                text = stringResource(R.string.facility_about),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = facility.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    // Amenities Section (chỉ hiện khi cơ sở có tiện ích)
                    if (facility.amenities.isNotEmpty()) {
                        item(key = "facility_amenities") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = MaterialTheme.spacing.normal),
                                verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                            ) {
                                Text(
                                    text = stringResource(R.string.facility_amenities),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                                ) {
                                    facility.amenities.forEach { amenity ->
                                        Surface(
                                            color = MaterialTheme.colorScheme.surfaceVariant,
                                            shape = PillShape,
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.CheckCircle,
                                                    contentDescription = null,
                                                    tint = MaterialTheme.colorScheme.primary,
                                                    modifier = Modifier.size(16.dp),
                                                )
                                                Text(
                                                    text = amenity,
                                                    style = MaterialTheme.typography.labelMedium,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Courts Section (chỉ hiện khi cơ sở có danh sách sân)
                    if (facility.courts.isNotEmpty()) {
                        item(key = "facility_courts_header") {
                            Text(
                                text = stringResource(R.string.facility_courts),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                            )
                        }

                        items(
                            items = facility.courts,
                            key = { it.id },
                        ) { court ->
                            Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                                CourtCard(
                                    court = court,
                                    selected = false,
                                    onClick = { onBook(facility.id) },
                                )
                            }
                        }
                    } else {
                        item(key = "facility_no_courts_notice") {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                shape = MaterialTheme.shapes.medium,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = MaterialTheme.spacing.normal),
                            ) {
                                Row(
                                    modifier = Modifier.padding(MaterialTheme.spacing.medium),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.Info,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(20.dp),
                                    )
                                    Text(
                                        text = stringResource(R.string.facility_no_courts_desc),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
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
private fun InfoTile(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        shape = MaterialTheme.shapes.medium,
        onClick = onClick ?: {},
        enabled = onClick != null,
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(MaterialTheme.spacing.medium),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(20.dp),
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
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
private fun FacilityDetailSuccessPreview() {
    SportBookingTheme {
        Surface {
            FacilityDetailContent(
                state = FacilityDetailUiState(
                    loading = false,
                    facility = PreviewData.facilityDetail,
                ),
                onBack = {},
                onBook = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun FacilityDetailLoadingPreview() {
    SportBookingTheme {
        Surface {
            FacilityDetailContent(
                state = FacilityDetailUiState(loading = true),
                onBack = {},
                onBook = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun FacilityDetailErrorPreview() {
    SportBookingTheme {
        Surface {
            FacilityDetailContent(
                state = FacilityDetailUiState(loading = false, error = "Không thể tải thông tin cơ sở."),
                onBack = {},
                onBook = {},
            )
        }
    }
}
