package com.claudecursor.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claudecursor.app.domain.model.Session
import com.claudecursor.app.ui.theme.AppColors

@Composable
fun SessionTabBar(
    sessions: List<Session>,
    selected: Session?,
    onSessionSelected: (Session) -> Unit,
    onCreateTapped: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppColors.bgSecondary)
                .padding(vertical = 8.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            items(sessions, key = { it.name }) { session ->
                SessionPill(
                    session = session,
                    isSelected = selected?.name == session.name,
                    onClick = { onSessionSelected(session) }
                )
            }

            item {
                IconButton(
                    onClick = onCreateTapped,
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(AppColors.bgTertiary)
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "New Session",
                        tint = AppColors.textTertiary,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
        }

        // Bottom border
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(AppColors.border)
        )
    }
}

@Composable
private fun SessionPill(
    session: Session,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .then(
                if (isSelected) {
                    Modifier
                        .background(AppColors.bgTertiary)
                        .border(1.dp, AppColors.accent.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                } else {
                    Modifier
                        .background(AppColors.bgSecondary)
                        .border(1.dp, AppColors.border, RoundedCornerShape(14.dp))
                }
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Status dot
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(
                    if (session.isRunning) AppColors.statusYellow else AppColors.textTertiary
                )
                .then(
                    if (session.isRunning) {
                        Modifier.shadow(3.dp, CircleShape, ambientColor = AppColors.statusYellow.copy(alpha = 0.6f))
                    } else Modifier
                )
        )

        Text(
            text = session.name,
            fontSize = 13.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (isSelected) AppColors.textPrimary else AppColors.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
