package com.claudecursor.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.claudecursor.app.ui.navigation.NavGraph
import com.claudecursor.app.ui.theme.ClaudeCursorTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ClaudeCursorTheme {
                NavGraph()
            }
        }
    }
}
