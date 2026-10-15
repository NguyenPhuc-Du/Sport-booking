package com.sportbooking.user.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import com.sportbooking.user.R
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.toVnd

@Composable
fun StatusBadge(
    status: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    val (bgColor, textColor) = when (status.lowercase()) {
        "upcoming", "active", "confirmed" -> {
            MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        }
        "completed", "finished" -> {
            MaterialTheme.colorScheme.secondaryContainer to MaterialTheme.colorScheme.onSecondaryContainer
        }
        "cancelled", "rejected" -> {
            MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
        }
        "pending", "waiting" -> {
            MaterialTheme.colorScheme.tertiaryContainer to MaterialTheme.colorScheme.onTertiaryContainer
        }
        else -> {
            MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
        }
    }

    Surface(
        color = bgColor,
        contentColor = textColor,
        shape = PillShape,
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(textColor),
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
fun RatingBar(
    rating: Double,
    reviewsCount: Int,
    modifier: Modifier = Modifier,
    starColor: Color = MaterialTheme.extraColors.rating,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Icon(
            imageVector = Icons.Rounded.Star,
            contentDescription = null,
            tint = starColor,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = stringResource(R.string.label_rating_format, rating, reviewsCount),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun PriceTag(
    amount: Long,
    modifier: Modifier = Modifier,
    perSlot: Boolean = false,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = amount.toVnd(),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
        )
        if (perSlot) {
            Text(
                text = "/giờ",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 1.dp),
            )
        }
    }
}

@PreviewLightDark
@PreviewFontScale
@Composable
private fun BadgesAndTagsPreview() {
    SportBookingTheme {
        Surface {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatusBadge(status = "upcoming", label = "Sắp diễn ra")
                    StatusBadge(status = "completed", label = "Hoàn thành")
                    StatusBadge(status = "cancelled", label = "Đã hủy")
                    StatusBadge(status = "pending", label = "Chờ duyệt")
                }
                RatingBar(rating = 4.8, reviewsCount = 142)
                PriceTag(amount = 180_000, perSlot = true)
            }
        }
    }
}
