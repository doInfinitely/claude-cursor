package com.claudecursor.app.ui.screens.sessionlist

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.claudecursor.app.domain.model.Session
import com.claudecursor.app.ui.components.KeyboardToolbar
import com.claudecursor.app.ui.components.SessionTabBar
import com.claudecursor.app.ui.components.TerminalWebView
import com.claudecursor.app.ui.screens.createsession.CreateSessionDialog
import com.claudecursor.app.ui.theme.AppColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionListScreen(
    serverId: Long,
    onBack: () -> Unit,
    viewModel: SessionListViewModel = viewModel()
) {
    val server by viewModel.server.collectAsStateWithLifecycle()
    val sessions by viewModel.sessions.collectAsStateWithLifecycle()
    val selectedSession by viewModel.selectedSession.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val shareSessionName by viewModel.shareSessionName.collectAsStateWithLifecycle()

    var showCreateDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    LaunchedEffect(serverId) {
        viewModel.loadServer(serverId)
    }

    // Error dialog
    if (error != null) {
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            confirmButton = {
                TextButton(
                    onClick = { viewModel.clearError() },
                    colors = ButtonDefaults.textButtonColors(contentColor = AppColors.accent)
                ) { Text("OK") }
            },
            title = { Text("Error") },
            text = { Text(error ?: "") },
            containerColor = AppColors.bgSecondary,
            titleContentColor = AppColors.textPrimary,
            textContentColor = AppColors.textSecondary
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bgPrimary)
            .statusBarsPadding()
    ) {
        // Top bar
        TopAppBar(
            title = {
                Text(
                    server?.name ?: "Sessions",
                    color = AppColors.textPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = AppColors.accent
                    )
                }
            },
            actions = {
                if (server?.isShareLink != true) {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "Menu",
                                tint = AppColors.accent
                            )
                        }
                        val context = LocalContext.current
                        SessionMenu(
                            expanded = showMenu,
                            session = selectedSession,
                            onDismiss = { showMenu = false },
                            onStop = { selectedSession?.let { viewModel.stopSession(it.name) }; showMenu = false },
                            onRestart = { selectedSession?.let { viewModel.restartSession(it.name) }; showMenu = false },
                            onDelete = { selectedSession?.let { viewModel.deleteSession(it.name) }; showMenu = false },
                            onCreate = { showCreateDialog = true; showMenu = false },
                            onCopyUrl = {
                                server?.baseURL?.let { url ->
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("Server URL", url))
                                }
                                showMenu = false
                            }
                        )
                    }
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = AppColors.bgSecondary
            )
        )

        // Content
        if (server?.isShareLink == true) {
            ShareView(
                server = server,
                shareSessionName = shareSessionName,
                isLoading = isLoading,
                viewModel = viewModel
            )
        } else {
            FullView(
                sessions = sessions,
                selectedSession = selectedSession,
                server = server,
                isLoading = isLoading,
                onSessionSelected = { viewModel.selectSession(it) },
                onCreateTapped = { showCreateDialog = true },
                onRestart = { viewModel.restartSession(it) },
                viewModel = viewModel
            )
        }
    }

    if (showCreateDialog) {
        CreateSessionDialog(
            viewModel = viewModel,
            onDismiss = { showCreateDialog = false }
        )
    }
}

@Composable
private fun ShareView(
    server: com.claudecursor.app.domain.model.Server?,
    shareSessionName: String?,
    isLoading: Boolean,
    viewModel: SessionListViewModel
) {
    val baseURL = server?.baseURL ?: return
    val token = server.shareToken ?: return

    if (shareSessionName != null) {
        Column(modifier = Modifier.fillMaxSize().imePadding()) {
            Box(modifier = Modifier.weight(1f)) {
                TerminalWebView(
                    baseURL = baseURL,
                    sessionName = shareSessionName,
                    sharePath = "/s/$token/",
                    viewModel = viewModel,
                    modifier = Modifier.fillMaxSize()
                )
            }
            KeyboardToolbar(viewModel = viewModel)
        }
    } else if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = AppColors.accent)
                Spacer(Modifier.height(8.dp))
                Text("Connecting...", fontSize = 13.sp, color = AppColors.textTertiary)
            }
        }
    } else {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.LinkOff, null, Modifier.size(40.dp), tint = AppColors.textTertiary)
                Spacer(Modifier.height(16.dp))
                Text(
                    "Link expired or invalid",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textTertiary
                )
            }
        }
    }
}

@Composable
private fun FullView(
    sessions: List<Session>,
    selectedSession: Session?,
    server: com.claudecursor.app.domain.model.Server?,
    isLoading: Boolean,
    onSessionSelected: (Session) -> Unit,
    onCreateTapped: () -> Unit,
    onRestart: (String) -> Unit,
    viewModel: SessionListViewModel
) {
    val baseURL = server?.baseURL

    Column(modifier = Modifier.fillMaxSize().imePadding()) {
        SessionTabBar(
            sessions = sessions,
            selected = selectedSession,
            onSessionSelected = onSessionSelected,
            onCreateTapped = onCreateTapped,
            onFlagToggle = { name -> viewModel.toggleFlag(name) }
        )

        if (selectedSession != null && selectedSession.isRunning && baseURL != null) {
            Box(modifier = Modifier.weight(1f)) {
                TerminalWebView(
                    baseURL = baseURL,
                    sessionName = selectedSession.name,
                    viewModel = viewModel,
                    modifier = Modifier.fillMaxSize()
                )
            }
            KeyboardToolbar(viewModel = viewModel)
        } else if (selectedSession != null && !selectedSession.isRunning) {
            StoppedState(
                session = selectedSession,
                onRestart = { onRestart(selectedSession.name) },
                modifier = Modifier.weight(1f)
            )
        } else {
            EmptyState(
                sessions = sessions,
                isLoading = isLoading,
                onCreateTapped = onCreateTapped,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun StoppedState(session: Session, onRestart: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(AppColors.bgPrimary),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.StopCircle, null, Modifier.size(40.dp), tint = AppColors.textTertiary)
            Spacer(Modifier.height(16.dp))
            Text(
                "Session '${session.name}' is stopped",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = AppColors.textSecondary
            )
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onRestart,
                colors = ButtonDefaults.buttonColors(
                    containerColor = AppColors.accent,
                    contentColor = AppColors.accentOnDark
                ),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text("Restart", fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun EmptyState(
    sessions: List<Session>,
    isLoading: Boolean,
    onCreateTapped: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(AppColors.bgPrimary),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Terminal, null, Modifier.size(40.dp), tint = AppColors.textTertiary)
            Spacer(Modifier.height(16.dp))
            Text(
                "No session selected",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = AppColors.textTertiary
            )
            if (sessions.isEmpty() && !isLoading) {
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onCreateTapped,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AppColors.accent,
                        contentColor = AppColors.accentOnDark
                    ),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Create Session", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

@Composable
private fun SessionMenu(
    expanded: Boolean,
    session: Session?,
    onDismiss: () -> Unit,
    onStop: () -> Unit,
    onRestart: () -> Unit,
    onDelete: () -> Unit,
    onCreate: () -> Unit,
    onCopyUrl: () -> Unit
) {
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        containerColor = AppColors.bgTertiary
    ) {
        if (session != null) {
            if (session.isRunning) {
                DropdownMenuItem(
                    text = { Text("Stop Session", color = AppColors.textPrimary) },
                    onClick = onStop,
                    leadingIcon = { Icon(Icons.Default.StopCircle, null, tint = AppColors.textSecondary) }
                )
            } else {
                DropdownMenuItem(
                    text = { Text("Restart Session", color = AppColors.textPrimary) },
                    onClick = onRestart,
                    leadingIcon = { Icon(Icons.Default.PlayCircle, null, tint = AppColors.textSecondary) }
                )
            }
            HorizontalDivider(color = AppColors.border)
            DropdownMenuItem(
                text = { Text("Delete Session", color = MaterialTheme.colorScheme.error) },
                onClick = onDelete,
                leadingIcon = { Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error) }
            )
            HorizontalDivider(color = AppColors.border)
        }
        DropdownMenuItem(
            text = { Text("Copy URL", color = AppColors.textPrimary) },
            onClick = onCopyUrl,
            leadingIcon = { Icon(Icons.Default.ContentCopy, null, tint = AppColors.textSecondary) }
        )
        DropdownMenuItem(
            text = { Text("New Session", color = AppColors.textPrimary) },
            onClick = onCreate,
            leadingIcon = { Icon(Icons.Default.Add, null, tint = AppColors.textSecondary) }
        )
    }
}
