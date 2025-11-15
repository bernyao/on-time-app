//
//  on_timeApp.swift
//  on time
//
//  Created by Bernard Aopare on 13/11/2025.
//

import SwiftUI
import CoreData

@main
struct on_timeApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
