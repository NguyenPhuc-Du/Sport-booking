package com.sportbooking.user.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AllInclusive
import androidx.compose.material.icons.rounded.SportsBaseball
import androidx.compose.material.icons.rounded.SportsBasketball
import androidx.compose.material.icons.rounded.SportsSoccer
import androidx.compose.material.icons.rounded.SportsTennis
import androidx.compose.material.icons.rounded.SportsVolleyball
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import com.sportbooking.domain.model.Sport
import com.sportbooking.user.R
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData

@Composable
fun SportCategoryChip(
    sport: Sport,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
        label = "ChipContainer",
    )
    val contentColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
        label = "ChipContent",
    )
    val borderColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
        label = "ChipBorder",
    )

    Surface(
        color = containerColor,
        contentColor = contentColor,
        shape = PillShape,
        border = BorderStroke(1.dp, borderColor),
        shadowElevation = if (selected) 3.dp else 0.dp,
        modifier = modifier
            .clip(PillShape)
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
        ) {
            SportIcon(sportId = sport.id, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(
                text = sport.label,
                style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}

@Composable
fun SportIcon(
    sportId: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
) {
    when (sportId.lowercase()) {
        "badminton", "caulong" -> {
            Icon(
                painter = painterResource(R.drawable.ic_badminton),
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "pickleball" -> {
            Icon(
                painter = painterResource(R.drawable.ic_pickleball),
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "table_tennis", "bongban" -> {
            Icon(
                painter = painterResource(R.drawable.ic_table_tennis),
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "football", "soccer", "bongda" -> {
            Icon(
                imageVector = Icons.Rounded.SportsSoccer,
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "tennis", "quavot" -> {
            Icon(
                imageVector = Icons.Rounded.SportsTennis,
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "basketball", "bongro" -> {
            Icon(
                imageVector = Icons.Rounded.SportsBasketball,
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "volleyball", "bongchuyen" -> {
            Icon(
                imageVector = Icons.Rounded.SportsVolleyball,
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        "baseball" -> {
            Icon(
                imageVector = Icons.Rounded.SportsBaseball,
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
        else -> {
            Icon(
                imageVector = Icons.Rounded.AllInclusive,
                contentDescription = contentDescription,
                modifier = modifier,
            )
        }
    }
}

@Composable
fun FilterChipRow(
    sports: List<Sport>,
    selectedSportId: String,
    onSportSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp),
) {
    LazyRow(
        modifier = modifier,
        contentPadding = contentPadding,
        horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
    ) {
        items(sports, key = { it.id }) { sport ->
            SportCategoryChip(
                sport = sport,
                selected = sport.id == selectedSportId,
                onClick = { onSportSelected(sport.id) },
            )
        }
    }
}

@PreviewLightDark
@PreviewFontScale
@Composable
private fun SportCategoryChipsPreview() {
    SportBookingTheme {
        Surface {
            FilterChipRow(
                sports = PreviewData.sports,
                selectedSportId = "badminton",
                onSportSelected = {},
                modifier = Modifier.padding(vertical = 12.dp),
            )
        }
    }
}
