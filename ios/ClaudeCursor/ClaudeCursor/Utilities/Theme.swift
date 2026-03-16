import SwiftUI

enum Theme {
    static let bgPrimary    = Color(hex: "#3b110c")
    static let bgSecondary  = Color(hex: "#5d3d3a")
    static let bgTertiary   = Color(hex: "#6e4d49")
    static let accent       = Color(hex: "#bdb7fc")
    static let accentOnDark = Color(hex: "#1a1a2e")
    static let textPrimary  = Color(hex: "#f9f5ed")
    static let textSecondary = Color(hex: "#c4b5a5")
    static let textTertiary = Color(hex: "#8a7a6d")
    static let border       = Color.white.opacity(0.12)
    static let statusGreen  = Color(hex: "#4ade80")
    static let statusYellow = Color(hex: "#facc15")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
