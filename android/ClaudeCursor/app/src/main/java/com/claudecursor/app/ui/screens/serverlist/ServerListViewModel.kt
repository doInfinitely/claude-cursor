package com.claudecursor.app.ui.screens.serverlist

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.claudecursor.app.ClaudeCursorApp
import com.claudecursor.app.data.local.ServerEntity
import com.claudecursor.app.domain.model.Server
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ServerListViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = (application as ClaudeCursorApp).database.serverDao()

    val servers: StateFlow<List<Server>> = dao.getAllServers()
        .map { entities -> entities.map { it.toDomain() } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addServer(name: String, url: String) {
        viewModelScope.launch {
            dao.insert(ServerEntity(name = name, url = url))
        }
    }

    fun deleteServer(server: Server) {
        viewModelScope.launch {
            dao.deleteById(server.id)
        }
    }
}
