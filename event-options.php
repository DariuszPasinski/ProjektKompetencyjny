<?php
session_start();
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

$isLoggedIn = isset($_SESSION["user_id"]);
$userId = $isLoggedIn ? (int)$_SESSION["user_id"] : 0;
$isAdmin = ($_SESSION["role_name"] ?? "") === "ADMIN";

function fetchAllPrepared($pdo, $sql, $params = []) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$assessmentTypes = fetchAllPrepared($pdo, "
    SELECT id, name, color
    FROM assessment_types
    ORDER BY id
");

$eventTypes = fetchAllPrepared($pdo, "
    SELECT id, name, color
    FROM event_types
    ORDER BY id
");

if (!$isLoggedIn || $isAdmin) {
    $subjects = fetchAllPrepared($pdo, "
        SELECT id, name
        FROM subjects
        ORDER BY name
    ");

    $studentGroups = fetchAllPrepared($pdo, "
        SELECT id, name
        FROM student_groups
        WHERE is_active = 1
        ORDER BY name
    ");

    $lecturers = fetchAllPrepared($pdo, "
        SELECT id, CONCAT(title, ' ', first_name, ' ', last_name) AS name
        FROM lecturers
        WHERE is_active = 1
        ORDER BY last_name, first_name
    ");
} else {
    $subjects = fetchAllPrepared($pdo, "
        SELECT subjects.id, subjects.name
        FROM subjects
        JOIN user_subject_assignments 
            ON user_subject_assignments.subject_id = subjects.id
        WHERE user_subject_assignments.user_id = :user_id
        ORDER BY subjects.name
    ", [
        ":user_id" => $userId
    ]);

    $studentGroups = fetchAllPrepared($pdo, "
        SELECT student_groups.id, student_groups.name
        FROM student_groups
        JOIN user_student_group_assignments 
            ON user_student_group_assignments.student_group_id = student_groups.id
        WHERE user_student_group_assignments.user_id = :user_id
          AND student_groups.is_active = 1
        ORDER BY student_groups.name
    ", [
        ":user_id" => $userId
    ]);

    $lecturers = fetchAllPrepared($pdo, "
        SELECT lecturers.id, CONCAT(lecturers.title, ' ', lecturers.first_name, ' ', lecturers.last_name) AS name
        FROM lecturers
        JOIN user_lecturer_assignments 
            ON user_lecturer_assignments.lecturer_id = lecturers.id
        WHERE user_lecturer_assignments.user_id = :user_id
          AND lecturers.is_active = 1
        ORDER BY lecturers.last_name, lecturers.first_name
    ", [
        ":user_id" => $userId
    ]);
}

echo json_encode([
    "assessment_types" => $assessmentTypes,
    "event_types" => $eventTypes,
    "subjects" => $subjects,
    "student_groups" => $studentGroups,
    "lecturers" => $lecturers
], JSON_UNESCAPED_UNICODE);