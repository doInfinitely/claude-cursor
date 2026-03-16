import Foundation
import SwiftData

@Model
final class Server {
    var id: UUID
    var name: String
    var url: String

    init(name: String, url: String) {
        self.id = UUID()
        self.name = name
        self.url = url
    }

    /// Extracts just the origin (scheme + host + port) from the stored URL
    var baseURL: URL? {
        guard let parsed = URL(string: url),
              let scheme = parsed.scheme,
              let host = parsed.host else { return nil }
        var components = URLComponents()
        components.scheme = scheme
        components.host = host
        components.port = parsed.port
        return components.url
    }

    /// If the URL includes /terminal/:name, extract the session name
    var initialSessionName: String? {
        guard let parsed = URL(string: url) else { return nil }
        let segments = parsed.pathComponents.filter { $0 != "/" }
        if segments.count >= 2 && segments[0] == "terminal" {
            return segments[1]
        }
        return nil
    }

    /// If the URL includes /s/:token, extract the share token
    var shareToken: String? {
        guard let parsed = URL(string: url) else { return nil }
        let segments = parsed.pathComponents.filter { $0 != "/" }
        if segments.count >= 2 && segments[0] == "s" {
            return segments[1]
        }
        return nil
    }

    var isShareLink: Bool { shareToken != nil }
}
