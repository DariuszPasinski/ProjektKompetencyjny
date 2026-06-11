<?php
session_start();
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Musisz być zalogowany."
    ]);
    exit;
}

$userId = (int)$_SESSION["user_id"];
$isAdmin = ($_SESSION["role_name"] ?? "") === "ADMIN";

$source = $_POST["source"] ?? "";
$id = (int)($_POST["id"] ?? 0);

if (!$id || !in_array($source, ["assessment", "university"])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Nieprawidłowe dane."
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    $table = $source === "assessment" ? "assessment_events" : "university_events";

    $stmt = $pdo->prepare("
        SELECT created_by_user_id
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

    if (!$isAdmin && (int)$event["created_by_user_id"] !== $userId) {
        throw new Exception("Nie masz uprawnień do usunięcia tego wpisu.");
    }

    if ($source === "university") {
        $stmt = $pdo->prepare("
            DELETE FROM university_event_targets
            WHERE university_event_id = :id
        ");

        $stmt->execute([
            ":id" => $id
        ]);
    }

    $stmt = $pdo->prepare("
        DELETE FROM $table
        WHERE id = :id
    ");

    $stmt->execute([
        ":id" => $id
    ]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Wpis został usunięty."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($e->getMessage());

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Wystąpił błąd bazy danych. Spróbuj ponownie."
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}