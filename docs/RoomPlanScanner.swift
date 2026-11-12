import Foundation
import RoomPlan
import RealityKit
import Supabase

/// Exemplo de integração nativa iOS.
/// Dependências: RoomPlan/RealityKit do SDK Apple e supabase-swift.
final class MarcenappRoomPlanScanner: NSObject, RoomCaptureViewDelegate {
    private let supabase: SupabaseClient
    private let userId: UUID
    private(set) var captureView: RoomCaptureView!

    init(supabaseURL: URL, supabaseKey: String, userId: UUID) {
        self.supabase = SupabaseClient(supabaseURL: supabaseURL, supabaseKey: supabaseKey)
        self.userId = userId
        super.init()
        self.captureView = RoomCaptureView(frame: .zero)
        self.captureView.captureSession.delegate = self
    }

    func startScan() {
        var configuration = RoomCaptureSession.Configuration()
        configuration.isCoachingEnabled = true
        captureView.captureSession.run(configuration: configuration)
    }

    func finishScan() {
        captureView.captureSession.stop()
    }

    func captureSession(_ session: RoomCaptureSession,
                        didEndWith data: CapturedRoomData,
                        error: Error?) {
        guard error == nil else {
            print("RoomPlan error:", error as Any)
            return
        }

        Task { @MainActor in
            do {
                let builder = RoomBuilder(options: [.beautifyObjects])
                let room = try await builder.capturedRoom(from: data)
                try await upload(room: room)
            } catch {
                print("RoomPlan upload error:", error)
            }
        }
    }

    private func upload(room: CapturedRoom) async throws {
        let scanId = UUID()
        let jsonURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(scanId).json")
        let usdzURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(scanId).usdz")

        // CapturedRoom conforms to Codable. This JSON is the parametric source
        // used by roomplan-ingest; USDZ is kept as the visual 3D asset.
        let jsonData = try JSONEncoder().encode(room)
        try jsonData.write(to: jsonURL, options: .atomic)

        try room.export(to: usdzURL, exportOptions: .parametric)

        let basePath = "\(userId.uuidString)/\(scanId.uuidString)"
        let jsonPath = "\(basePath)/roomplan.json"
        let usdzPath = "\(basePath)/room.usdz"

        try await supabase.storage
            .from("room-scans")
            .upload(path: jsonPath, fileURL: jsonURL,
                    options: FileOptions(contentType: "application/json", upsert: true))
        try await supabase.storage
            .from("room-scans")
            .upload(path: usdzPath, fileURL: usdzURL,
                    options: FileOptions(contentType: "model/vnd.usdz+zip", upsert: true))

        // O endpoint recebe o JSON em formato estruturado e os caminhos dos
        // assets. O JWT da sessão Supabase é enviado automaticamente pelo SDK.
        let payload = RoomPlanIngestPayload(
            scanId: scanId,
            capturedStructure: try JSONSerialization.jsonObject(with: jsonData) as! [String: Any],
            usdzStoragePath: usdzPath,
            previewStoragePath: nil,
            projectName: "Projeto criado pelo RoomPlan"
        )

        _ = try await supabase.functions.invoke(
            "roomplan-ingest",
            options: FunctionInvokeOptions(body: payload)
        )
    }
}

private struct RoomPlanIngestPayload: Encodable {
    let scanId: UUID
    let capturedStructure: [String: Any]
    let usdzStoragePath: String
    let previewStoragePath: String?
    let projectName: String

    enum CodingKeys: String, CodingKey {
        case scanId, capturedStructure, usdzStoragePath, previewStoragePath, projectName
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(scanId, forKey: .scanId)
        try container.encode(AnyEncodable(capturedStructure), forKey: .capturedStructure)
        try container.encode(usdzStoragePath, forKey: .usdzStoragePath)
        try container.encodeIfPresent(previewStoragePath, forKey: .previewStoragePath)
        try container.encode(projectName, forKey: .projectName)
    }
}

private struct AnyEncodable: Encodable {
    let value: Any
    init(_ value: Any) { self.value = value }
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let value as String: try container.encode(value)
        case let value as Int: try container.encode(value)
        case let value as Double: try container.encode(value)
        case let value as Bool: try container.encode(value)
        case let value as [Any]: try container.encode(value.map(AnyEncodable.init))
        case let value as [String: Any]: try container.encode(value.mapValues(AnyEncodable.init))
        case _ as NSNull: try container.encodeNil()
        default: throw EncodingError.invalidValue(value, .init(codingPath: container.codingPath, debugDescription: "Unsupported JSON value"))
        }
    }
}
