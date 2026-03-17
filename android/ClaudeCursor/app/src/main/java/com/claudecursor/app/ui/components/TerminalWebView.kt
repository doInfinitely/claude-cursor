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

/** JS injected after page load to fix heights and disable broken WebGL */
private const val FIX_PAGE_JS = """
(function(){
    // Disable WebGL (broken on Android emulators)
    if(!window._webglDisabled){
        window._webglDisabled=true;
        var orig=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,attrs){
            if(type==='webgl'||type==='webgl2'||type==='experimental-webgl') return null;
            return orig.call(this,type,attrs);
        };
    }

    // Force pixel dimensions on xterm container (CSS 100% chain broken on Android WebView)
    var h=window.innerHeight, w=window.innerWidth;
    document.documentElement.style.cssText='height:'+h+'px;width:'+w+'px;margin:0;padding:0;overflow:hidden';
    document.body.style.cssText='height:'+h+'px;width:'+w+'px;margin:0;padding:0;overflow:hidden';
    var x=document.querySelector('.xterm');
    if(x) x.style.cssText='height:'+h+'px;width:'+w+'px;position:absolute;top:0;left:0';
    var els=document.querySelectorAll('#terminal-container,#terminal');
    for(var i=0;i<els.length;i++) els[i].style.cssText='height:'+h+'px;width:'+w+'px';
    console.log('[app] forced dimensions: '+w+'x'+h+', xterm='+(x?'found':'missing'));
})();
"""

/** JS injected after page load to fix fonts, set up modifier keys, and refresh terminal */
private const val SETUP_JS = """
(function(){
    // Font fix + resize: retry until window.term exists
    if(window.term){
        if(!window._fontFixed){
            window._fontFixed=true;
            try{
                window.term.options.fontFamily='monospace';
                console.log('[app] font fixed, rows='+window.term.rows+' cols='+window.term.cols);
            }catch(e){}
            window.dispatchEvent(new Event('resize'));
            setTimeout(function(){ window.dispatchEvent(new Event('resize')); },300);
        }
    } else {
        console.log('[app] term not ready, will retry');
    }

    // Modifier key listener: add only once
    if(!window._modKeySetup){
        window._modKeySetup=true;
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
                    if(c>0&&c<27){var ch=String.fromCharCode(c);if(window._wsSend)window._wsSend(ch);else if(window.term)window.term.input(ch);}
                } else if(mod==='alt'){
                    var seq='\x1b'+e.key;if(window._wsSend)window._wsSend(seq);else if(window.term)window.term.input(seq);
                }
            }
        },true);
    }
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

    var currentSession by remember { mutableStateOf("") }

    AndroidView(
        factory = { context ->
            WebView.setWebContentsDebuggingEnabled(true)
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    userAgentString = USER_AGENT
                    mediaPlaybackRequiresUserGesture = false
                    @SuppressLint("SetJavaScriptEnabled")
                    cacheMode = WebSettings.LOAD_DEFAULT
                    useWideViewPort = false
                    loadWithOverviewMode = false
                }

                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, pageUrl: String?) {
                        super.onPageFinished(view, pageUrl)
                        evaluateJavascript(FIX_PAGE_JS, null)
                        evaluateJavascript(SETUP_JS, null)
                        for (delay in longArrayOf(500, 1500, 3000)) {
                            postDelayed({
                                evaluateJavascript(FIX_PAGE_JS, null)
                                evaluateJavascript(SETUP_JS, null)
                            }, delay)
                        }
                    }
                }

                setBackgroundColor(android.graphics.Color.BLACK)
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false

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
                viewModel.webView = webView
            }
        },
        modifier = modifier
    )
}
