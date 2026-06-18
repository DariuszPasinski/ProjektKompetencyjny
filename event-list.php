<?php
session_start();
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

$year = (int)($_GET["year"] ?? 0);
$month = (int)($_GET["month"] ?? 0);

if (!$year || !$month) {
    echo json_encode([]);
    exit;
}

$start = sprintf("%04d-%02d-01 00:00:00", $year, $month);
$end = date("Y-m-d H:i:s", strtotime("$start +1 month"));

$events = [];

/* assessment_events */
$stmt = $pdo->prepare("
    SELECT 
        assessment_events.id,
        assessment_events.created_by_user_id,
        assessment_events.assessment_type_id,
        assessment_events.subject_id,
        assessment_events.student_group_id,
        assessment_events.lecturer_id,
        assessment_events.start_datetime,
        assessment_events.end_datetime,
        assessment_events.location,
        assessment_events.description,
        assessment_events.is_reported,
        assessment_events.report_text,
        assessment_types.name AS type_name,
        assessment_types.color,
        subjects.name AS subject_name,
        student_groups.name AS group_name,
        lecturers.first_name,
        lecturers.last_name
    FROM assessment_events
    JOIN assessment_types ON assessment_types.id = assessment_events.assessment_type_id
    JOIN subjects ON subjects.id = assessment_events.subject_id
    LEFT JOIN student_groups ON student_groups.id = assessment_events.student_group_id
    JOIN lecturers ON lecturers.id = assessment_events.lecturer_id
    WHERE assessment_events.start_datetime >= :start
      AND assessment_events.start_datetime < :end
");

$stmt->execute([
    ":start" => $start,
    ":end" => $end
]);

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $events[] = [
        "id" => "a_" . $row["id"],
        "rawId" => $row["id"],
        "source" => "assessment",
        "createdByUserId" => $row["created_by_user_id"],
        "assessmentTypeId" => $row["assessment_type_id"],
        "subjectId" => $row["subject_id"],
        "studentGroupId" => $row["student_group_id"],
        "lecturerId" => $row["lecturer_id"],
        "date" => substr($row["start_datetime"], 0, 10),
        "timeStart" => substr($row["start_datetime"], 11, 5),
        "timeEnd" => substr($row["end_datetime"], 11, 5),
        "title" => $row["subject_name"],
        "typeName" => $row["type_name"],
        "color" => $row["color"],
        "group" => $row["group_name"],
        "location" => $row["location"],
        "description" => $row["description"],
        "lecturer" => trim($row["first_name"] . " " . $row["last_name"]),
        "isReported" => (int)$row["is_reported"] === 1,
        "reportText" => $row["report_text"]
    ];
}

/* university_events */
$stmt = $pdo->prepare("
    SELECT 
        university_events.id,
        university_events.created_by_user_id,
        university_events.event_type_id,
        university_events.title,
        university_events.start_datetime,
        university_events.end_datetime,
        university_events.location,
        university_events.description,
        university_events.is_reported,
        university_events.report_text,
        event_types.name AS type_name,
        event_types.color,
        GROUP_CONCAT(student_groups.id ORDER BY student_groups.name SEPARATOR ',') AS group_ids,
        GROUP_CONCAT(student_groups.name ORDER BY student_groups.name SEPARATOR ', ') AS group_names
    FROM university_events
    JOIN event_types ON event_types.id = university_events.event_type_id
    LEFT JOIN university_event_targets 
        ON university_event_targets.university_event_id = university_events.id
    LEFT JOIN student_groups 
        ON student_groups.id = university_event_targets.target_id
    WHERE university_events.start_datetime >= :start
      AND university_events.start_datetime < :end
    GROUP BY 
        university_events.id,
        university_events.created_by_user_id,
        university_events.event_type_id,
        university_events.title,
        university_events.start_datetime,
        university_events.end_datetime,
        university_events.location,
        university_events.description,
        university_events.is_reported,
        university_events.report_text,
        event_types.name,
        event_types.color
");

$stmt->execute([
    ":start" => $start,
    ":end" => $end
]);

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $events[] = [
        "id" => "u_" . $row["id"],
        "rawId" => $row["id"],
        "source" => "university",
        "createdByUserId" => $row["created_by_user_id"],
        "eventTypeId" => $row["event_type_id"],
        "targetGroupIds" => $row["group_ids"] ? explode(",", $row["group_ids"]) : [],
        "date" => substr($row["start_datetime"], 0, 10),
        "timeStart" => substr($row["start_datetime"], 11, 5),
        "timeEnd" => substr($row["end_datetime"], 11, 5),
        "title" => $row["title"],
        "typeName" => $row["type_name"],
        "color" => $row["color"],
        "group" => $row["group_names"] ?: "Wszystkie grupy",
        "location" => $row["location"],
        "description" => $row["description"],
        "lecturer" => null,
        "isReported" => (int)$row["is_reported"] === 1,
        "reportText" => $row["report_text"]
    ];
}

echo json_encode($events, JSON_UNESCAPED_UNICODE);