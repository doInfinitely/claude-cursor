package com.claudecursor.app.ui.components

import androidx.compose.animation.core.*
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
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
    val sortedSessions = remember(sessions) {
        sessions.sortedWith(compareBy<Session> { it.actionRank }.thenByDescending { it.isRunning })
    }

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
            items(sortedSessions, key = { it.name }) { session ->
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
        StatusDot(session)

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

@Composable
private fun StatusDot(session: Session) {
    val dotColor = if (session.needsAction) {
        when (session.actionType) {
            "approval" -> AppColors.statusRed
            "completed" -> AppColors.statusGreen
            "prompt" -> AppColors.statusAmber
            else -> AppColors.statusYellow
        }
    } else {
        if (session.isRunning) AppColors.statusYellow else AppColors.textTertiary
    }

    val shouldPulse = session.needsAction && (session.actionType == "approval" || session.actionType == "prompt")
    val pulseDuration = if (session.actionType == "approval") 1500 else 2000

    val pulseAlpha by if (shouldPulse) {
        val infiniteTransition = rememberInfiniteTransition(label = "pulse")
        infiniteTransition.animateFloat(
            initialValue = 0.4f,
            targetValue = 0.8f,
            animationSpec = infiniteRepeatable(
                animation = tween(pulseDuration, easing = EaseInOut),
                repeatMode = RepeatMode.Reverse
            ),
            label = "pulseAlpha"
        )
    } else {
        remember { mutableStateOf(0.4f) }
    }

    val pulseRadius by if (shouldPulse) {
        val infiniteTransition = rememberInfiniteTransition(label = "pulseRadius")
        infiniteTransition.animateFloat(
            initialValue = 3f,
            targetValue = 6f,
            animationSpec = infiniteRepeatable(
                animation = tween(pulseDuration, easing = EaseInOut),
                repeatMode = RepeatMode.Reverse
            ),
            label = "pulseRadius"
        )
    } else {
        remember { mutableStateOf(3f) }
    }

    Box(
        modifier = Modifier
            .size(6.dp)
            .clip(CircleShape)
            .background(dotColor)
            .shadow(
                pulseRadius.dp,
                CircleShape,
                ambientColor = dotColor.copy(alpha = pulseAlpha)
            )
    )
}
