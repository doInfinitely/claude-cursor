package com.claudecursor.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.claudecursor.app.ui.screens.serverlist.ServerListScreen
import com.claudecursor.app.ui.screens.sessionlist.SessionListScreen

@Composable
fun NavGraph() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Screen.ServerList.route) {
        composable(Screen.ServerList.route) {
            ServerListScreen(
                onServerClick = { serverId ->
                    navController.navigate(Screen.SessionList.createRoute(serverId))
                }
            )
        }

        composable(
            route = Screen.SessionList.route,
            arguments = listOf(navArgument("serverId") { type = NavType.LongType })
        ) { backStackEntry ->
            val serverId = backStackEntry.arguments?.getLong("serverId") ?: return@composable
            SessionListScreen(
                serverId = serverId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
