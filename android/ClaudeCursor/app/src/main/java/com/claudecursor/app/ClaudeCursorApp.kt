package com.claudecursor.app

import android.app.Application
import com.claudecursor.app.data.local.AppDatabase

class ClaudeCursorApp : Application() {
    val database: AppDatabase by lazy {
        AppDatabase.getInstance(this)
    }
}
