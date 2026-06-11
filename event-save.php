<?php
session_start();
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Brak logowania"]);
    exit;
}

$userId = (int)$_SESSION["user_id"];
$isAdmin = ($_SESSION["role_name"] ?? "") === "ADMIN";
$type = $_POST["type"] ?? "";

function userHasAccess($pdo, $table, $column, $userId, $value) {
    if (!$value) return true;

    $stmt = $pdo->prepare("
        SELECT 1
        FROM $table
        WHERE user_id = :user_id
          AND $column = :value
        LIMIT 1
    ");

    $stmt->execute([
        ":user_id" => $userId,
        ":value" => $value
    ]);

    return (bool)$stmt->fetch();
}

try {
    $pdo->beginTransaction();

    if ($type === "assessment") {
        $assessmentTypeId = (int)($_POST["assessment_type_id"] ?? 0);
        $subjectId = (int)($_POST["subject_id"] ?? 0);
        $lecturerId = (int)($_POST["lecturer_id"] ?? 0);
        $studentGroupId = $_POST["student_group_id"] ?? null;
        $studentGroupId = $studentGroupId ? (int)$studentGroupId : null;

        if (!$assessmentTypeId || !$subjectId || !$lecturerId) {
            throw new Exception("Uzupełnij typ, przedmiot i prowadzącego.");
        }

        if (empty($_POST["start_datetime"]) || empty($_POST["end_datetime"])) {
            throw new Exception("Uzupełnij datę oraz godziny.");
        }

        if (!$isAdmin) {
            if (!userHasAccess($pdo, "user_subject_assignments", "subject_id", $userId, $subjectId)) {
                throw new Exception("Nie masz uprawnień do tego przedmiotu.");
            }

            if (!userHasAccess($pdo, "user_lecturer_assignments", "lecturer_id", $userId, $lecturerId)) {
                throw new Exception("Nie masz uprawnień do tego prowadzącego.");
            }

            if ($studentGroupId && !userHasAccess($pdo, "user_student_group_assignments", "student_group_id", $userId, $studentGroupId)) {
                throw new Exception("Nie masz uprawnień do tej grupy.");
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO assessment_events (
                assessment_type_id,
                subject_id,
                student_group_id,
                lecturer_id,
                start_datetime,
                end_datetime,
                location,
                description,
                source_type_id,
                created_by_user_id
            ) VALUES (
                :assessment_type_id,
                :subject_id,
                :student_group_id,
                :lecturer_id,
                :start_datetime,
                :end_datetime,
                :location,
                :description,
                2,
                :created_by_user_id
            )
        ");

        $stmt->execute([
            ":assessment_type_id" => $assessmentTypeId,
            ":subject_id" => $subjectId,
            ":student_group_id" => $studentGroupId,
            ":lecturer_id" => $lecturerId,
            ":start_datetime" => $_POST["start_datetime"],
            ":end_datetime" => $_POST["end_datetime"],
            ":location" => $_POST["location"] ?? null,
            ":description" => $_POST["description"] ?? null,
            ":created_by_user_id" => $userId
        ]);

        $pdo->commit();

        echo json_encode(["success" => true, "message" => "Dodano zaliczenie"]);
        exit;
    }

    if ($type === "university") {
        $eventTypeId = (int)($_POST["event_type_id"] ?? 0);
        $title = trim($_POST["title"] ?? "");
        $targetGroups = $_POST["target_groups"] ?? [];

        if (!$eventTypeId || !$title) {
            throw new Exception("Uzupełnij typ i tytuł wydarzenia.");
        }

        if (empty($_POST["start_datetime"]) || empty($_POST["end_datetime"])) {
            throw new Exception("Uzupełnij datę oraz godziny.");
        }

        $stmt = $pdo->prepare("
            INSERT INTO university_events (
                event_type_id,
                title,
                start_datetime,
                end_datetime,
                location,
                description,
                source_type_id,
                created_by_user_id
            ) VALUES (
                :event_type_id,
                :title,
                :start_datetime,
                :end_datetime,
                :location,
                :description,
                2,
                :created_by_user_id
            )
        ");

        $stmt->execute([
            ":event_type_id" => $eventTypeId,
            ":title" => $title,
            ":start_datetime" => $_POST["start_datetime"],
            ":end_datetime" => $_POST["end_datetime"],
            ":location" => $_POST["location"] ?? null,
            ":description" => $_POST["description"] ?? null,
            ":created_by_user_id" => $userId
        ]);

        $eventId = $pdo->lastInsertId();

        $stmtTarget = $pdo->prepare("
            INSERT INTO university_event_targets (
                university_event_id,
                target_type_id,
                target_id
            ) VALUES (
                :university_event_id,
                :target_type_id,
                :target_id
            )
        ");

        if (empty($targetGroups)) {
            $stmtTarget->execute([
                ":university_event_id" => $eventId,
                ":target_type_id" => 1,
                ":target_id" => null
            ]);
        } else {
            foreach ($targetGroups as $groupId) {
                $groupId = (int)$groupId;

                if (!$isAdmin && !userHasAccess($pdo, "user_student_group_assignments", "student_group_id", $userId, $groupId)) {
                    throw new Exception("Nie masz uprawnień do jednej z wybranych grup.");
                }

                $stmtTarget->execute([
                    ":university_event_id" => $eventId,
                    ":target_type_id" => 2,
                    ":target_id" => $groupId
                ]);
            }
        }

        $pdo->commit();

        echo json_encode(["success" => true, "message" => "Dodano wydarzenie"]);
        exit;
    }

    throw new Exception("Nieznany typ wpisu.");

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