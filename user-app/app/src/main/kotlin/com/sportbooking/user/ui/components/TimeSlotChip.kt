package com.sportbooking.user.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import com.sportbooking.domain.model.TimeSlot
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.toVnd

@Composable
fun TimeSlotChip(
    slot: TimeSlot,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isAvailable = slot.available

    val containerColor by animateColorAsState(
        targetValue = when {
            !isAvailable -> MaterialTheme.extraColors.bookedSlotContainer
            selected -> MaterialTheme.colorScheme.primary
            else -> MaterialTheme.colorScheme.surface
        },
        label = "SlotContainer",
    )

    val contentColor by animateColorAsState(
        targetValue = when {
            !isAvailable -> MaterialTheme.extraColors.bookedSlot
            selected -> MaterialTheme.colorScheme.onPrimary
            else -> MaterialTheme.colorScheme.onSurface
        },
        label = "SlotContent",
    )

    val borderColor by animateColorAsState(
        targetValue = when {
            !isAvailable -> MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
            selected -> MaterialTheme.colorScheme.primary
            else -> MaterialTheme.colorScheme.outlineVariant
        },
        label = "SlotBorder",
    )

    Surface(
        color = containerColor,
        contentColor = contentColor,
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, borderColor),
        shadowElevation = if (selected) 3.dp else 0.dp,
        modifier = modifier
            .clip(MaterialTheme.shapes.medium)
            .clickable(
                enabled = isAvailable,
                role = Role.RadioButton,
                onClick = onClick,
            )
            .semantics {
                this.role = Role.RadioButton
                this.selected = selected
                this.contentDescription = "${slot.time}, ${slot.price.toVnd()}${if (!isAvailable) ", Đã đặt" else ""}"
            },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = slot.time,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    textDecoration = if (!isAvailable) TextDecoration.LineThrough else TextDecoration.None,
                )
            }

            if (isAvailable) {
                Text(
                    text = slot.price.toVnd(),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (selected) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f) else MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Lock,
                        contentDescription = null,
                        tint = MaterialTheme.extraColors.bookedSlot,
                        modifier = Modifier.size(10.dp),
                    )
                    Text(
                        text = "Đã đặt",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.extraColors.bookedSlot,
                    )
                }
            }
        }
    }
}

@PreviewLightDark
@PreviewFontScale
@Composable
private fun TimeSlotChipPreview() {
    SportBookingTheme {
        Surface {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    TimeSlotChip(
                        slot = PreviewData.timeSlots[0],
                        selected = false,
                        onClick = {},
                        modifier = Modifier.weight(1f),
                    )
                    TimeSlotChip(
                        slot = PreviewData.timeSlots[3],
                        selected = true,
                        onClick = {},
                        modifier = Modifier.weight(1f),
                    )
                    TimeSlotChip(
                        slot = PreviewData.timeSlots[4],
                        selected = false,
                        onClick = {},
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}
