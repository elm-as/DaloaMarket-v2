package com.daloamarket.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Palette DaloaMarket (identique à tailwind.config.js)
val Primary = Color(0xFFFF9800)
val Primary50 = Color(0xFFFFF4E6)
val Primary100 = Color(0xFFFFE0B2)
val Primary600 = Color(0xFFF57C00)
val Primary700 = Color(0xFFE65100)
val Secondary = Color(0xFF0066CC)
val Grey50 = Color(0xFFF9FAFB)
val Grey100 = Color(0xFFF3F4F6)
val Grey200 = Color(0xFFE5E7EB)
val Grey400 = Color(0xFF9CA3AF)
val Grey500 = Color(0xFF6B7280)
val Grey700 = Color(0xFF374151)
val Grey900 = Color(0xFF111827)
val Success = Color(0xFF10B981)
val Success50 = Color(0xFFECFDF5)

private val ColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = Primary50,
    onPrimaryContainer = Primary700,
    secondary = Secondary,
    onSecondary = Color.White,
    background = Grey50,
    onBackground = Grey900,
    surface = Color.White,
    onSurface = Grey900,
    surfaceVariant = Grey100,
    onSurfaceVariant = Grey500,
    outline = Grey200,
)

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp), // rounded-card
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

private val AppTypography = Typography(
    headlineMedium = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, letterSpacing = (-0.5).sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp, letterSpacing = (-0.25).sp),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyLarge = TextStyle(fontSize = 16.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    bodySmall = TextStyle(fontSize = 12.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp),
)

@Composable
fun DaloaMarketTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ColorScheme,
        shapes = AppShapes,
        typography = AppTypography,
        content = content,
    )
}
