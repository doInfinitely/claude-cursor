package com.claudecursor.app.ui.navigation

sealed class Screen(val route: String) {
    data object ServerList : Screen("server_list")
    data object SessionList : Screen("session_list/{serverId}") {
        fun createRoute(serverId: Long) = "session_list/$serverId"
    }
}
