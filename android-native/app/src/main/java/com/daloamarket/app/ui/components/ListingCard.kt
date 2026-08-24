package com.daloamarket.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.daloamarket.app.data.CONDITION_LABELS
import com.daloamarket.app.data.Listing
import com.daloamarket.app.ui.theme.Grey100
import com.daloamarket.app.ui.theme.Grey500
import com.daloamarket.app.ui.theme.Primary600
import java.text.NumberFormat
import java.util.Locale

fun formatPrice(price: Double): String {
    val nf = NumberFormat.getIntegerInstance(Locale.FRANCE)
    return nf.format(price.toLong()).replace('\u00A0', ' ') + " FCFA"
}

@Composable
fun ListingCard(listing: Listing, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column {
            Box {
                AsyncImage(
                    model = listing.photos.firstOrNull(),
                    contentDescription = listing.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .background(Grey100),
                )
                CONDITION_LABELS[listing.condition]?.let { label ->
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White,
                        modifier = Modifier
                            .padding(8.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.Black.copy(alpha = 0.55f))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                            .align(Alignment.TopStart),
                    )
                }
            }
            Column(Modifier.padding(12.dp)) {
                Text(
                    text = listing.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = formatPrice(listing.price),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = Primary600,
                )
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = Grey500,
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(2.dp))
                    Text(
                        text = listing.district,
                        style = MaterialTheme.typography.bodySmall,
                        color = Grey500,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}
