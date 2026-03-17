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

        /// Modifier handler JS injected after page load
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
                        if(c>0&&c<27){var ch=String.fromCharCode(c);if(window._wsSend)window._wsSend(ch);else if(window.term)window.term.input(ch);}
                    } else if(mod==='alt'){
                        var seq='\\x1b'+e.key;if(window._wsSend)window._wsSend(seq);else if(window.term)window.term.input(seq);
                    }
                }
            },true);
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
