package com.sportbooking.user.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.sportbooking.domain.model.FacilitySummary
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen

@Composable
fun HomeScreen(
    onOpenFacility: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxSize()) {
        Text(
            "Đặt sân thể thao",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
        )
        OutlinedTextField(
            value = state.query,
            onValueChange = viewModel::onQueryChange,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            singleLine = true,
            placeholder = { Text("Tìm sân, môn, khu vực") },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.sports, key = { it.id }) { sport ->
                FilterChip(
                    selected = sport.id == state.selectedSport,
                    onClick = { viewModel.onSportSelected(sport.id) },
                    label = { Text(sport.label) },
                )
            }
        }
        when {
            state.loading && state.facilities.isEmpty() -> LoadingScreen()
            state.error != null && state.facilities.isEmpty() -> {
                ErrorText(state.error, Modifier.padding(16.dp))
            }
            state.facilities.isEmpty() -> {
                Text("Không có sân phù hợp", modifier = Modifier.padding(16.dp))
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.facilities, key = { it.id }) { facility ->
                        FacilityCard(facility, onClick = { onOpenFacility(facility.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun FacilityCard(facility: FacilitySummary, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = facility.image,
                contentDescription = facility.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(88.dp).clip(RoundedCornerShape(12.dp)),
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                facility.badge?.let {
                    Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
                }
                Text(facility.name, style = MaterialTheme.typography.titleMedium)
                Text(facility.location, style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(4.dp))
                Text(
                    "${facility.rating} · ${facility.reviews} đánh giá · ${facility.sports.joinToString()}",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
