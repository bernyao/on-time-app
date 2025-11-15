#if !canImport(Combine)
/// Minimal stand-ins for Combine types so the package builds on platforms
/// where Combine is unavailable (e.g. Linux in CI).
public protocol ObservableObject {}

@propertyWrapper
public struct Published<Value> {
    public var wrappedValue: Value

    public init(wrappedValue: Value) {
        self.wrappedValue = wrappedValue
    }
}
#endif
