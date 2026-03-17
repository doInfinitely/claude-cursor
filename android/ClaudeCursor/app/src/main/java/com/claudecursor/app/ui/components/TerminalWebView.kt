package com.claudecursor.app.ui.components

import android.annotation.SuppressLint
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.claudecursor.app.ui.screens.sessionlist.SessionListViewModel

private const val USER_AGENT =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/120.0.0.0 Mobile Safari/537.36 ClaudeCursorCompanion/1.0"

/** JS injected after page load to handle Ctrl/Alt modifier keys from KeyboardToolbar */
private const val SETUP_JS = """
(function(){
    if(window._appSetup) return;
    window._appSetup=true;
    window._pendingModifier=null;

    document.addEventListener('keydown',function(e){
        if(!window._pendingModifier||e.key.length!==1) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var mod=window._pendingModifier;
        window._pendingModifier=null;
        if(window.term){
            if(mod==='ctrl'){
                var c=e.key.toUpperCase().charCodeAt(0)-64;
                if(c>0&&c<27) window.term.input(String.fromCharCode(c));
            } else if(mod==='alt'){
                window.term.input('\x1b'+e.key);
            }
        }
    },true);
})();
"""

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun TerminalWebView(
    baseURL: String,
    sessionName: String,
    sharePath: String? = null,
    viewModel: SessionListViewModel,
    modifier: Modifier = Modifier
) {
    val path = sharePath ?: "/terminal/$sessionName/"
    val url = "${baseURL.trimEnd('/')}$path"

    // Track current session to reload on change
    var currentSession by remember { mutableStateOf("") }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    userAgentString = USER_AGENT
                    mediaPlaybackRequiresUserGesture = false
                    @SuppressLint("SetJavaScriptEnabled")
                    cacheMode = WebSettings.LOAD_DEFAULT
                }

                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, pageUrl: String?) {
                        super.onPageFinished(view, pageUrl)
                        // Delay to let xterm.js initialize, then inject modifier handler
                        postDelayed({
                            evaluateJavascript(SETUP_JS, null)
                        }, 1000)
                    }
                }

                setBackgroundColor(android.graphics.Color.BLACK)
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false

                // Store ref in ViewModel for KeyboardToolbar JS injection
                viewModel.webView = this

                loadUrl(url)
                currentSession = sessionName
            }
        },
        update = { webView ->
            if (currentSession != sessionName) {
                val newUrl = "${baseURL.trimEnd('/')}${sharePath ?: "/terminal/$sessionName/"}"
                webView.loadUrl(newUrl)
                currentSession = sessionName
            }
        },
        modifier = modifier
    )
}
