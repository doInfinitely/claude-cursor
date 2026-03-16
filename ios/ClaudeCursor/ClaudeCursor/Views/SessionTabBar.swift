import SwiftUI

struct SessionTabBar: View {
    let sessions: [Session]
    @Binding var selected: Session?
    var onCreateTapped: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(sessions) { session in
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
                Circle()
                    .fill(session.isRunning ? Theme.statusYellow : Theme.textTertiary)
                    .frame(width: 6, height: 6)
                    .shadow(color: session.isRunning ? Theme.statusYellow.opacity(0.6) : .clear, radius: 3)

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
