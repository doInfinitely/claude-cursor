package com.claudecursor.app.ui.screens.createsession

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.claudecursor.app.ui.screens.sessionlist.SessionListViewModel
import com.claudecursor.app.ui.theme.AppColors

@Composable
fun CreateSessionDialog(
    viewModel: SessionListViewModel,
    onDismiss: () -> Unit
) {
    val shells by viewModel.shells.collectAsStateWithLifecycle()
    var name by remember { mutableStateOf("") }
    var selectedShellId by remember { mutableStateOf<String?>(null) }
    var isCreating by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadShells()
    }

    // Auto-select first shell
    LaunchedEffect(shells) {
        if (selectedShellId == null && shells.isNotEmpty()) {
            selectedShellId = shells.first().id
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppColors.bgSecondary,
        titleContentColor = AppColors.textPrimary,
        title = { Text("New Session") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Session name
                Text("Session Name", fontSize = 12.sp, color = AppColors.textTertiary)
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Optional") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = AppColors.textPrimary,
                        unfocusedTextColor = AppColors.textPrimary,
                        focusedBorderColor = AppColors.accent,
                        unfocusedBorderColor = AppColors.border,
                        focusedLabelColor = AppColors.accent,
                        unfocusedLabelColor = AppColors.textTertiary,
                        cursorColor = AppColors.accent
                    ),
                    shape = RoundedCornerShape(8.dp)
                )

                // Shell picker
                Text("Shell", fontSize = 12.sp, color = AppColors.textTertiary)
                if (shells.isEmpty()) {
                    CircularProgressIndicator(
                        color = AppColors.accent,
                        modifier = Modifier.size(24.dp)
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        shells.forEach { shell ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedShellId = shell.id }
                                    .padding(vertical = 8.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        shell.name,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = AppColors.textPrimary
                                    )
                                    Text(shell.path, fontSize = 12.sp, color = AppColors.textTertiary)
                                }
                                if (selectedShellId == shell.id) {
                                    Icon(
                                        Icons.Default.Check,
                                        contentDescription = "Selected",
                                        tint = AppColors.accent,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val shell = selectedShellId ?: return@TextButton
                    isCreating = true
                    viewModel.createSession(
                        name = name.ifBlank { null },
                        shell = shell
                    )
                    onDismiss()
                },
                enabled = selectedShellId != null && !isCreating,
                colors = ButtonDefaults.textButtonColors(contentColor = AppColors.accent)
            ) {
                if (isCreating) {
                    CircularProgressIndicator(
                        color = AppColors.accent,
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Create")
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = AppColors.accent)
            ) {
                Text("Cancel")
            }
        }
    )
}
