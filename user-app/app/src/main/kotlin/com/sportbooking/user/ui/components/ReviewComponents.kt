package com.sportbooking.user.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.RateReview
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarOutline
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import com.sportbooking.user.R
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import java.util.Locale

data class FacilityReviewUi(
    val id: String,
    val author: String,
    val rating: Int,
    val date: String,
    val comment: String,
    val ownerReply: String? = null,
    val ownerReplyDate: String? = null,
)

@Composable
fun ReviewSummaryCard(
    reviews: List<FacilityReviewUi>,
    modifier: Modifier = Modifier,
) {
    val total = reviews.size
    val average = if (total > 0) reviews.sumOf { it.rating }.toDouble() / total else 0.0

    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(MaterialTheme.spacing.normal),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
            ) {
                // Điểm trung bình bên trái
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.width(96.dp),
                ) {
                    Text(
                        text = String.format(Locale.US, "%.1f", average),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    StarRow(rating = kotlin.math.round(average).toInt(), starSize = 16)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "$total đánh giá",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                // Thanh phân bổ 5 -> 1 sao
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    for (star in 5 downTo 1) {
                        val count = reviews.count { it.rating == star }
                        val ratio = if (total > 0) count.toFloat() / total else 0f
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "$star",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.width(12.dp),
                            )
                            Icon(
                                imageVector = Icons.Rounded.Star,
                                contentDescription = null,
                                tint = MaterialTheme.extraColors.rating,
                                modifier = Modifier.size(12.dp),
                            )
                            LinearProgressIndicator(
                                progress = { ratio },
                                color = MaterialTheme.extraColors.rating,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                                strokeCap = StrokeCap.Round,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(6.dp),
                            )
                            Text(
                                text = "$count",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.End,
                                modifier = Modifier.width(20.dp),
                            )
                        }
                    }
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
            ) {
                Icon(
                    imageVector = Icons.Rounded.Lock,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = stringResource(R.string.review_only_after_payment),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

/**
 * Nút đánh giá / chỉnh sửa đánh giá gắn với 1 đơn completed.
 */
@Composable
fun BookingReviewAction(
    facilityName: String,
    existingRating: Int? = null,
    existingText: String? = null,
    submitting: Boolean = false,
    onSubmit: (rating: Int, text: String) -> Unit,
    modifier: Modifier = Modifier,
    fullWidth: Boolean = false,
) {
    var showSheet by remember { mutableStateOf(false) }
    val reviewed = existingRating != null

    Surface(
        color = if (reviewed) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.primary,
        contentColor = if (reviewed) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onPrimary,
        shape = PillShape,
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .clip(PillShape)
            .clickable(enabled = !submitting) { showSheet = true },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = if (fullWidth) 12.dp else 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = if (fullWidth) Arrangement.Center else Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = if (reviewed) Icons.Rounded.Star else Icons.Rounded.RateReview,
                contentDescription = null,
                tint = if (reviewed) MaterialTheme.extraColors.rating else MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(16.dp),
            )
            Spacer(Modifier.width(6.dp))
            Text(
                text = if (reviewed) {
                    stringResource(R.string.bookings_edit_review_btn, existingRating!!)
                } else {
                    stringResource(R.string.bookings_review_btn)
                },
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
        }
    }

    if (showSheet) {
        WriteReviewBottomSheet(
            facilityName = facilityName,
            initialRating = existingRating ?: 5,
            initialComment = existingText.orEmpty(),
            submitting = submitting,
            onDismiss = { if (!submitting) showSheet = false },
            onSubmit = { rating, text ->
                onSubmit(rating, text)
                showSheet = false
            },
        )
    }
}

@Composable
fun ReviewFilterBar(
    selectedFilter: String,
    onSelectFilter: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val filters = listOf(
        "all" to "Tất cả",
        "5" to "5 sao",
        "4" to "4 sao",
        "3" to "3 sao",
        "replied" to "Có phản hồi",
    )

    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = MaterialTheme.spacing.normal),
        horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
    ) {
        items(filters, key = { it.first }) { (key, label) ->
            val selected = selectedFilter == key
            Surface(
                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                shape = PillShape,
                border = BorderStroke(
                    1.dp,
                    if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                ),
                modifier = Modifier
                    .clip(PillShape)
                    .clickable { onSelectFilter(key) },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    if (key in listOf("5", "4", "3")) {
                        Icon(
                            imageVector = Icons.Rounded.Star,
                            contentDescription = null,
                            tint = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.extraColors.rating,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    )
                }
            }
        }
    }
}

@Composable
fun FacilityReviewItemCard(
    review: FacilityReviewUi,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(MaterialTheme.spacing.normal),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = review.author.trim().take(1).uppercase(),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = review.author,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = review.date,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                StarRow(rating = review.rating, starSize = 16)
            }

            Text(
                text = review.comment,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )

            if (!review.ownerReply.isNullOrBlank()) {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(MaterialTheme.spacing.medium),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Storefront,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp),
                            )
                            Text(
                                text = stringResource(R.string.review_owner_reply_label),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            if (!review.ownerReplyDate.isNullOrBlank()) {
                                Text(
                                    text = "· ${review.ownerReplyDate}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Text(
                            text = review.ownerReply,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StarRow(
    rating: Int,
    modifier: Modifier = Modifier,
    starSize: Int = 16,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        for (i in 1..5) {
            Icon(
                imageVector = if (i <= rating) Icons.Rounded.Star else Icons.Rounded.StarOutline,
                contentDescription = null,
                tint = if (i <= rating) MaterialTheme.extraColors.rating else MaterialTheme.colorScheme.outlineVariant,
                modifier = Modifier.size(starSize.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WriteReviewBottomSheet(
    facilityName: String,
    onDismiss: () -> Unit,
    onSubmit: (rating: Int, comment: String) -> Unit,
    modifier: Modifier = Modifier,
    initialRating: Int = 5,
    initialComment: String = "",
    submitting: Boolean = false,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var rating by remember { mutableIntStateOf(initialRating.coerceIn(1, 5)) }
    var comment by remember { mutableStateOf(initialComment) }

    val ratingLabel = when (rating) {
        5 -> "Tuyệt vời · Rất đáng trải nghiệm"
        4 -> "Hài lòng · Sân tốt"
        3 -> "Bình thường · Tạm ổn"
        2 -> "Chưa tốt · Cần cải thiện"
        else -> "Tệ · Trải nghiệm không tốt"
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = MaterialTheme.shapes.extraLarge,
        containerColor = MaterialTheme.colorScheme.surface,
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = MaterialTheme.spacing.normal)
                .padding(bottom = MaterialTheme.spacing.large),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = stringResource(R.string.review_sheet_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = facilityName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }

            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                shape = MaterialTheme.shapes.large,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = MaterialTheme.spacing.medium),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        for (star in 1..5) {
                            val selected = star <= rating
                            Icon(
                                imageVector = if (selected) Icons.Rounded.Star else Icons.Rounded.StarOutline,
                                contentDescription = "$star sao",
                                tint = if (selected) MaterialTheme.extraColors.rating else MaterialTheme.colorScheme.outline,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .clickable { rating = star }
                                    .padding(2.dp),
                            )
                        }
                    }
                    Text(
                        text = ratingLabel,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Nhận xét",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "${comment.length}/300",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                OutlinedTextField(
                    value = comment,
                    onValueChange = { if (it.length <= 300) comment = it },
                    placeholder = { Text(stringResource(R.string.review_comment_hint)) },
                    minLines = 3,
                    maxLines = 5,
                    shape = MaterialTheme.shapes.medium,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
            ) {
                SecondaryButton(
                    text = stringResource(R.string.btn_cancel),
                    onClick = onDismiss,
                    enabled = !submitting,
                    modifier = Modifier.weight(1f),
                )
                PrimaryButton(
                    text = stringResource(R.string.review_submit_btn),
                    onClick = {
                        val text = comment.trim()
                        if (text.isEmpty()) return@PrimaryButton
                        onSubmit(rating, text)
                    },
                    enabled = comment.trim().isNotEmpty() && !submitting,
                    loading = submitting,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

// Dữ liệu dưới đây CHỈ dùng cho Preview trong Android Studio, không được dùng trong app chạy thật.
private val previewReviews = listOf(
    FacilityReviewUi(
        id = "preview_1",
        author = "Người chơi A",
        rating = 5,
        date = "01/01/2026",
        comment = "Nội dung đánh giá mẫu cho preview.",
        ownerReply = "Phản hồi mẫu của chủ sân.",
        ownerReplyDate = "02/01/2026",
    ),
    FacilityReviewUi(
        id = "preview_2",
        author = "Người chơi B",
        rating = 4,
        date = "01/01/2026",
        comment = "Đánh giá mẫu thứ hai.",
    ),
)

@PreviewLightDark
@PreviewFontScale
@Composable
private fun ReviewSectionPreview() {
    SportBookingTheme {
        Surface {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ReviewSummaryCard(reviews = previewReviews)
                FacilityReviewItemCard(review = previewReviews.first())
            }
        }
    }
}
