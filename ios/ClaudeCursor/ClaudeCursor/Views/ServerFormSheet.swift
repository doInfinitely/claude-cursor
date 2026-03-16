import SwiftUI
import SwiftData

struct ServerFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @State private var name = ""
    @State private var url = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                        .modifier(ThemedFieldModifier())
                    TextField("URL", text: $url)
                        .modifier(ThemedFieldModifier())
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }
                .listRowBackground(Theme.bgSecondary)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bgPrimary)
            .navigationTitle("Add Server")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.accent)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let server = Server(name: name, url: url)
                        modelContext.insert(server)
                        dismiss()
                    }
                    .disabled(name.isEmpty || url.isEmpty)
                    .foregroundStyle(Theme.accent)
                }
            }
        }
    }
}

struct ThemedFieldModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .foregroundStyle(Theme.textPrimary)
            .tint(Theme.accent)
    }
}

extension View {
    func themedField() -> some View {
        modifier(ThemedFieldModifier())
    }
}
