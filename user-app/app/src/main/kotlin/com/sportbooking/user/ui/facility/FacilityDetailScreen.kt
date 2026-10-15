package com.sportbooking.user.ui.facility

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.MessageScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FacilityDetailScreen(
    onBack: () -> Unit,
    onBook: (String) -> Unit,
    viewModel: FacilityDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val facility = state.facility
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(facility?.name ?: "Cơ sở") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                },
            )
        },
        bottomBar = {
            if (facility != null) {
                Button(
                    onClick = { onBook(facility.id) },
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                ) {
                    Text("Chọn sân và khung giờ")
                }
            }
        },
    ) { padding ->
        when {
            state.loading -> LoadingScreen(Modifier.padding(padding))
            facility == null -> MessageScreen(
                message = state.error ?: "Không tìm thấy cơ sở",
                actionLabel = "Quay lại",
                onAction = onBack,
                modifier = Modifier.padding(padding),
            )
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        AsyncImage(
                            model = facility.images.firstOrNull() ?: facility.image,
                            contentDescription = facility.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxWidth().height(200.dp),
                        )
                    }
                    item {
                        Text(facility.location, style = MaterialTheme.typography.bodyMedium)
                        Text("${facility.rating} · ${facility.reviews} đánh giá", style = MaterialTheme.typography.bodySmall)
                        Text(facility.hours, style = MaterialTheme.typography.bodySmall)
                        Text(facility.phone, style = MaterialTheme.typography.bodySmall)
                        Text(facility.description, modifier = Modifier.padding(top = 8.dp))
                    }
                    item { Text("Sân", style = MaterialTheme.typography.titleMedium) }
                    items(facility.courts, key = { it.id }) { court ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(court.name, style = MaterialTheme.typography.titleSmall)
                                Text(court.surface, style = MaterialTheme.typography.bodySmall)
                                Text(court.capacity, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                    item { Text("Tiện ích", style = MaterialTheme.typography.titleMedium) }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            facility.amenities.forEach { amenity ->
                                Row { Text("· $amenity") }
                            }
                        }
                    }
                    item { ErrorText(state.error) }
                }
            }
        }
    }
}
