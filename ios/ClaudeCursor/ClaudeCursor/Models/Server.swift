import Foundation
import SwiftData

@Model
final class Server {
    var id: UUID
    var name: String
    var url: String
    var lastSelectedSessionName: String?

    init(name: String, url: String) {
        self.id = UUID()
        self.name = name
        self.url = url
    }

    /// Base URL for API calls — preserves path prefix (e.g. /a/instanceId)
    /// but strips /terminal/:name, /s/:token suffixes
    var baseURL: URL? {
        guard let parsed = URL(string: url),
              let _ = parsed.scheme,
              let _ = parsed.host else { return nil }
        let segments = parsed.pathComponents.filter { $0 != "/" }
        // Strip /terminal/:name or /s/:token from the end
        var basePath = segments
        if basePath.count >= 2 && (basePath[basePath.count - 2] == "terminal" || basePath[basePath.count - 2] == "s") {
            basePath = Array(basePath.dropLast(2))
        }
        let pathString = basePath.isEmpty ? "" : "/" + basePath.joined(separator: "/")
        // Reconstruct: origin + base path
        var components = URLComponents(url: parsed, resolvingAgainstBaseURL: false)!
        components.path = pathString
        components.query = nil
        components.fragment = nil
        return components.url
    }

    /// If the URL includes /terminal/:name anywhere in path, extract the session name
    var initialSessionName: String? {
        guard let parsed = URL(string: url) else { return nil }
        let segments = parsed.pathComponents.filter { $0 != "/" }
        // Check last two segments for /terminal/:name (may be prefixed with /a/:instanceId)
        if segments.count >= 2 && segments[segments.count - 2] == "terminal" {
            return segments[segments.count - 1]
        }
        return nil
    }

    /// If the URL includes /s/:token anywhere in path, extract the share token
    var shareToken: String? {
        guard let parsed = URL(string: url) else { return nil }
        let segments = parsed.pathComponents.filter { $0 != "/" }
        // Check last two segments for /s/:token (may be prefixed with /a/:instanceId)
        if segments.count >= 2 && segments[segments.count - 2] == "s" {
            return segments[segments.count - 1]
        }
        return nil
    }

    var isShareLink: Bool { shareToken != nil }
}
