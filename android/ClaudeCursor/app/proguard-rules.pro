# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.claudecursor.app.data.remote.dto.** { *; }
-keep class com.claudecursor.app.domain.model.** { *; }

# Gson
-keepattributes Signature
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
