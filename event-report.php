<?php
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

$source = $_POST["source"] ?? "";
$id = (int)($_POST["id"] ?? 0);
$reportText = trim($_POST["report_text"] ?? "");

if (!$id || !$reportText) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Brak treści zgłoszenia."
    ]);
    exit;
}

if (!in_array($source, ["assessment", "university"])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Nieznany typ wpisu."
    ]);
    exit;
}

try {
    $table = $source === "assessment" ? "assessment_events" : "university_events";

    $stmt = $pdo->prepare("
        SELECT is_reported
        FROM $table
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        ":id" => $id
    ]);

    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        throw new Exception("Nie znaleziono wpisu.");
    }

    if ((int)$event["is_reported"] === 1) {
        throw new Exception("Ten wpis został już zgłoszony.");
    }

    $stmt = $pdo->prepare("
        UPDATE $table
        SET is_reported = 1,
            report_text = :report_text
        WHERE id = :id
    ");

    $stmt->execute([
        ":report_text" => $reportText,
        ":id" => $id
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Zgłoszenie zostało zapisane."
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Wystąpił błąd bazy danych. Spróbuj ponownie."
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}