import SwiftUI

struct KeyboardToolbar: View {
    @State private var activeModifier: String?
    @State private var resetTask: Task<Void, Never>?

    var body: some View {
        HStack(spacing: 6) {
            modifierButton("Ctrl", active: activeModifier == "ctrl") {
                toggleModifier("ctrl")
            }
            modifierButton("Alt", active: activeModifier == "alt") {
                toggleModifier("alt")
            }

            toolbarDivider

            keyButton("Esc", "\u{1b}")
            keyButton("Tab", "\t")

            toolbarDivider

            keyButton("\u{2190}", "\u{1b}[D")
            keyButton("\u{2193}", "\u{1b}[B")
            keyButton("\u{2191}", "\u{1b}[A")
            keyButton("\u{2192}", "\u{1b}[C")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity)
        .background(Theme.bgSecondary.opacity(0.95))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Theme.border)
                .frame(height: 1)
        }
    }

    private var toolbarDivider: some View {
        Rectangle()
            .fill(Theme.border)
            .frame(width: 1, height: 24)
    }

    private func toggleModifier(_ name: String) {
        haptic()
        resetTask?.cancel()

        if activeModifier == name {
            activeModifier = nil
            injectModifier(nil)
        } else {
            activeModifier = name
            injectModifier(name)
            resetTask = Task { @MainActor in
                try? await Task.sleep(for: .seconds(5))
                guard !Task.isCancelled else { return }
                activeModifier = nil
            }
        }
    }

    private func sendKey(_ sequence: String) {
        haptic()
        activeModifier = nil
        resetTask?.cancel()
        injectModifier(nil)

        guard let webView = TerminalWebView.sharedWebView else { return }
        let escaped = escapeForJS(sequence)
        webView.evaluateJavaScript(
            "if(window._wsSend){window._wsSend('\(escaped)');}else if(window.term){window.term.input('\(escaped)');}",
            completionHandler: nil
        )
    }

    private func injectModifier(_ modifier: String?) {
        guard let webView = TerminalWebView.sharedWebView else { return }
        let value = modifier.map { "'\($0)'" } ?? "null"
        webView.evaluateJavaScript("window._pendingModifier=\(value);", completionHandler: nil)
    }

    private func haptic() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func escapeForJS(_ s: String) -> String {
        s.replacingOccurrences(of: "\\", with: "\\\\")
         .replacingOccurrences(of: "'", with: "\\'")
         .replacingOccurrences(of: "\t", with: "\\t")
         .replacingOccurrences(of: "\u{1b}", with: "\\x1b")
    }

    @ViewBuilder
    private func keyButton(_ label: String, _ code: String) -> some View {
        Button { sendKey(code) } label: {
            Text(label)
                .font(.system(.callout, design: .monospaced, weight: .medium))
                .foregroundStyle(Theme.textSecondary)
                .frame(minWidth: 36, minHeight: 36)
                .background(Theme.bgTertiary)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Theme.border, lineWidth: 0.5)
                )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func modifierButton(_ label: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(.callout, design: .monospaced, weight: .semibold))
                .foregroundStyle(active ? Theme.bgPrimary : Theme.textSecondary)
                .frame(minWidth: 44, minHeight: 36)
                .background(active ? Theme.accent : Theme.bgTertiary)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(active ? Theme.accent : Theme.border, lineWidth: active ? 0 : 0.5)
                )
        }
        .buttonStyle(.plain)
    }
}
