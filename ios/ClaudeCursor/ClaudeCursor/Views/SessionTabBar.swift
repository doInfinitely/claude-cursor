import SwiftUI

struct SessionTabBar: View {
    let sessions: [Session]
    @Binding var selected: Session?
    var onCreateTapped: () -> Void

    private var sortedSessions: [Session] {
        sessions.sorted { a, b in
            if a.actionRank != b.actionRank { return a.actionRank < b.actionRank }
            if a.isRunning != b.isRunning { return a.isRunning }
            return false
        }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(sortedSessions) { session in
                    sessionPill(session)
                }

                Button {
                    onCreateTapped()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: 28, height: 28)
                        .background(Theme.bgTertiary)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(Theme.bgSecondary)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.border)
                .frame(height: 1)
        }
    }

    @ViewBuilder
    private func sessionPill(_ session: Session) -> some View {
        let isSelected = selected?.name == session.name
        Button {
            selected = session
        } label: {
            HStack(spacing: 6) {
                StatusDot(session: session)

                Text(session.name)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? Theme.textPrimary : Theme.textSecondary)
                    .lineLimit(1)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Theme.bgTertiary : Theme.bgSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Theme.accent.opacity(0.5) : Theme.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct StatusDot: View {
    let session: Session
    @State private var pulsing = false

    private var dotColor: Color {
        guard session.needsAction == true else {
            return session.isRunning ? Theme.statusYellow : Theme.textTertiary
        }
        switch session.actionType {
        case "approval": return Theme.statusRed
        case "completed": return Theme.statusGreen
        case "prompt": return Theme.statusAmber
        default: return Theme.statusYellow
        }
    }

    private var shouldPulse: Bool {
        session.needsAction == true && (session.actionType == "approval" || session.actionType == "prompt")
    }

    var body: some View {
        Circle()
            .fill(dotColor)
            .frame(width: 6, height: 6)
            .shadow(color: dotColor.opacity(pulsing ? 0.8 : 0.4), radius: pulsing ? 6 : 3)
            .animation(shouldPulse ? .easeInOut(duration: session.actionType == "approval" ? 1.5 : 2).repeatForever(autoreverses: true) : .default, value: pulsing)
            .onAppear {
                if shouldPulse { pulsing = true }
            }
            .onChange(of: session.needsAction) { _ in
                pulsing = shouldPulse
            }
    }
}
