import SwiftUI
import WebKit

struct TerminalWebView: UIViewRepresentable {
    let baseURL: URL
    let sessionName: String
    var sharePath: String? = nil

    /// Shared reference so KeyboardToolbar can inject keys
    static var sharedWebView: WKWebView?

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.delaysContentTouches = false
        webView.navigationDelegate = context.coordinator

        // Include "Safari" in UA to fix xterm.js rendering in WKWebView
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 ClaudeCursorCompanion/1.0"

        context.coordinator.currentSession = sessionName
        Self.sharedWebView = webView

        loadTerminal(webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if context.coordinator.currentSession != sessionName {
            context.coordinator.currentSession = sessionName
            loadTerminal(webView)
        }
    }

    private func loadTerminal(_ webView: WKWebView) {
        let urlString = baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let path = sharePath ?? "/terminal/\(sessionName)/"
        guard let terminalURL = URL(string: "\(urlString)\(path)") else { return }
        webView.load(URLRequest(url: terminalURL))
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var currentSession: String?

        /// Modifier handler + touch selection JS injected after page load
        private static let setupJS = """
        (function(){
            if(window._appSetup) return;
            window._appSetup=true;
            window._pendingModifier=null;

            /* Ctrl/Alt modifier handler — capture phase on document fires before xterm.js */
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
                        window.term.input('\\x1b'+e.key);
                    }
                }
            },true);

            /* Touch selection: long-press + drag to select, auto-copy on release */
            var screen=document.querySelector('.xterm-screen');
            if(screen){
                var timer=null, selecting=false, origin=null;
                screen.addEventListener('touchstart',function(e){
                    if(e.touches.length!==1) return;
                    var t=e.touches[0];
                    origin={x:t.clientX,y:t.clientY};
                    timer=setTimeout(function(){
                        selecting=true;
                        screen.dispatchEvent(new MouseEvent('mousedown',{
                            clientX:t.clientX,clientY:t.clientY,button:0,bubbles:true
                        }));
                    },500);
                });
                screen.addEventListener('touchmove',function(e){
                    if(timer&&origin){
                        var dx=e.touches[0].clientX-origin.x,dy=e.touches[0].clientY-origin.y;
                        if(Math.sqrt(dx*dx+dy*dy)>10){clearTimeout(timer);timer=null;}
                    }
                    if(selecting&&e.touches.length===1){
                        e.preventDefault();
                        screen.dispatchEvent(new MouseEvent('mousemove',{
                            clientX:e.touches[0].clientX,clientY:e.touches[0].clientY,
                            button:0,bubbles:true
                        }));
                    }
                },{passive:false});
                screen.addEventListener('touchend',function(){
                    clearTimeout(timer);timer=null;
                    if(selecting){
                        screen.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
                        selecting=false;
                        if(window.term&&window.term.hasSelection&&window.term.hasSelection()){
                            navigator.clipboard.writeText(window.term.getSelection()).catch(function(){});
                        }
                    }
                });
            }

            /* Selection highlight color */
            var s=document.createElement('style');
            s.textContent='.xterm .xterm-selection div{background-color:rgba(189,183,252,0.3)!important;}';
            document.head.appendChild(s);
        })();
        """

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("[TerminalWebView] Loaded: \(webView.url?.absoluteString ?? "nil")")
            // Delay to let xterm.js initialize
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                webView.evaluateJavaScript(Self.setupJS, completionHandler: nil)
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("[TerminalWebView] Failed: \(error.localizedDescription)")
        }
    }
}
