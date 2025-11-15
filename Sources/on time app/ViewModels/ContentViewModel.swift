import Foundation
#if canImport(Combine)
import Combine
#endif

public class ContentViewModel: ObservableObject {
    @Published public var reminders: [Reminder] = []

    public init() {
        self.reminders = Self.sampleReminders()
    }

    static func sampleReminders() -> [Reminder] {
        [
            Reminder(id: UUID(), title: "Finish Math Homework", dueDate: Date().addingTimeInterval(3600 * 24)),
            Reminder(id: UUID(), title: "Study for Biology Quiz", dueDate: Date().addingTimeInterval(3600 * 48))
        ]
    }

    public static var sample: ContentViewModel {
        ContentViewModel()
    }
}
