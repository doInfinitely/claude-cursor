package com.claudecursor.app.ui.screens.sessionlist

import android.app.Application
import android.webkit.WebView
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.claudecursor.app.ClaudeCursorApp
import com.claudecursor.app.data.remote.ApiClient
import com.claudecursor.app.data.remote.WebSocketClient
import com.claudecursor.app.domain.model.Server
import com.claudecursor.app.domain.model.Session
import com.claudecursor.app.domain.model.Shell
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SessionListViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = (application as ClaudeCursorApp).database.serverDao()
    private val wsClient = WebSocketClient()

    private val _server = MutableStateFlow<Server?>(null)
    val server: StateFlow<Server?> = _server.asStateFlow()

    private val _sessions = MutableStateFlow<List<Session>>(emptyList())
    val sessions: StateFlow<List<Session>> = _sessions.asStateFlow()

    private val _selectedSession = MutableStateFlow<Session?>(null)
    val selectedSession: StateFlow<Session?> = _selectedSession.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _shareSessionName = MutableStateFlow<String?>(null)
    val shareSessionName: StateFlow<String?> = _shareSessionName.asStateFlow()

    private val _shells = MutableStateFlow<List<Shell>>(emptyList())
    val shells: StateFlow<List<Shell>> = _shells.asStateFlow()

    // WebView reference for keyboard toolbar JS injection
    var webView: WebView? = null

    fun loadServer(serverId: Long) {
        viewModelScope.launch {
            dao.getAllServers().collect { entities ->
                val found = entities.find { it.id == serverId }?.toDomain()
                _server.value = found
                found?.let { server ->
                    if (server.isShareLink) {
                        resolveShareToken(server)
                    } else {
                        loadSessions(server)
                        setupWebSocket(server)
                    }
                }
            }
        }
    }

    private suspend fun resolveShareToken(server: Server) {
        val baseURL = server.baseURL ?: return
        val token = server.shareToken ?: return
        _isLoading.value = true
        try {
            val info = ApiClient.resolveShareToken(baseURL, token)
            _shareSessionName.value = info.sessionName
        } catch (e: Exception) {
            _error.value = e.message
        } finally {
            _isLoading.value = false
        }
    }

    private fun setupWebSocket(server: Server) {
        val baseURL = server.baseURL ?: return
        wsClient.onEvent = {
            viewModelScope.launch {
                val s = _server.value ?: return@launch
                loadSessions(s)
            }
        }
        wsClient.connect(baseURL, viewModelScope)
    }

    suspend fun loadSessions(server: Server) {
        val baseURL = server.baseURL ?: return
        _isLoading.value = true
        try {
            val fetched = ApiClient.fetchSessions(baseURL)
            _sessions.value = fetched

            val current = _selectedSession.value
            if (current == null || fetched.none { it.name == current.name }) {
                val initial = server.initialSessionName
                _selectedSession.value = if (initial != null) {
                    fetched.firstOrNull { it.name == initial }
                } else {
                    fetched.sortedWith(compareBy<Session> { it.actionRank }.thenByDescending { it.isRunning }).firstOrNull()
                }
            }
        } catch (e: Exception) {
            _error.value = e.message
        } finally {
            _isLoading.value = false
        }
    }

    fun selectSession(session: Session) {
        _selectedSession.value = session
    }

    fun clearError() {
        _error.value = null
    }

    fun stopSession(name: String) {
        val baseURL = _server.value?.baseURL ?: return
        viewModelScope.launch {
            try {
                ApiClient.stopSession(baseURL, name)
                _server.value?.let { loadSessions(it) }
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun restartSession(name: String) {
        val baseURL = _server.value?.baseURL ?: return
        viewModelScope.launch {
            try {
                ApiClient.restartSession(baseURL, name)
                _server.value?.let { loadSessions(it) }
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun deleteSession(name: String) {
        val baseURL = _server.value?.baseURL ?: return
        viewModelScope.launch {
            try {
                ApiClient.deleteSession(baseURL, name)
                if (_selectedSession.value?.name == name) {
                    _selectedSession.value = null
                }
                _server.value?.let { loadSessions(it) }
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun loadShells() {
        val baseURL = _server.value?.baseURL ?: return
        viewModelScope.launch {
            try {
                _shells.value = ApiClient.fetchShells(baseURL)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun createSession(name: String?, shell: String) {
        val baseURL = _server.value?.baseURL ?: return
        viewModelScope.launch {
            try {
                ApiClient.createSession(baseURL, name, shell)
                _server.value?.let { loadSessions(it) }
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        wsClient.disconnect()
    }
}
