package com.claudecursor.app.ui.screens.serverform

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.claudecursor.app.ui.theme.AppColors

@Composable
fun ServerFormDialog(
    onDismiss: () -> Unit,
    onAdd: (name: String, url: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppColors.bgSecondary,
        titleContentColor = AppColors.textPrimary,
        title = { Text("Add Server") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
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
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
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
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onAdd(name, url) },
                enabled = name.isNotBlank() && url.isNotBlank(),
                colors = ButtonDefaults.textButtonColors(contentColor = AppColors.accent)
            ) {
                Text("Add")
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
