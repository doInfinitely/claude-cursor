package com.claudecursor.app.ui.screens.serverlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.claudecursor.app.domain.model.Server
import com.claudecursor.app.ui.screens.serverform.ServerFormDialog
import com.claudecursor.app.ui.theme.AppColors

@Composable
fun ServerListScreen(
    onServerClick: (Long) -> Unit,
    viewModel: ServerListViewModel = viewModel()
) {
    val servers by viewModel.servers.collectAsStateWithLifecycle()
    var showAddDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bgPrimary)
            .statusBarsPadding()
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppColors.bgSecondary)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Servers",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = AppColors.textPrimary
            )
            IconButton(onClick = { showAddDialog = true }) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = "Add Server",
                    tint = AppColors.accent,
                    modifier = Modifier.size(28.dp)
                )
            }
        }

        if (servers.isEmpty()) {
            // Empty state
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(AppColors.bgPrimary),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Storage,
                        contentDescription = null,
                        tint = AppColors.textTertiary,
                        modifier = Modifier.size(40.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No servers added",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = AppColors.textTertiary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { showAddDialog = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AppColors.accent,
                            contentColor = AppColors.accentOnDark
                        ),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("Add Server", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(AppColors.bgPrimary)
            ) {
                items(servers, key = { it.id }) { server ->
                    ServerRow(
                        server = server,
                        onClick = { onServerClick(server.id) },
                        onDelete = { viewModel.deleteServer(server) }
                    )
                }
            }
        }
    }

    if (showAddDialog) {
        ServerFormDialog(
            onDismiss = { showAddDialog = false },
            onAdd = { name, url ->
                viewModel.addServer(name, url)
                showAddDialog = false
            }
        )
    }
}

@Composable
private fun ServerRow(
    server: Server,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onDelete()
                true
            } else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.error)
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = AppColors.textPrimary)
            }
        },
        enableDismissFromStartToEnd = false
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppColors.bgSecondary)
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(
                                AppColors.accent.copy(alpha = 0.2f),
                                AppColors.accent.copy(alpha = 0.1f)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (server.isShareLink) Icons.Default.Link else Icons.Default.Storage,
                    contentDescription = null,
                    tint = AppColors.accent,
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = server.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = server.url,
                    fontSize = 12.sp,
                    color = AppColors.textTertiary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        HorizontalDivider(color = AppColors.border, thickness = 0.5.dp)
    }
}
