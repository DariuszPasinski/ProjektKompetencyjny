<?php
session_start();
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

try{
    $query = "SELECT id, name, semester, field_of_study, study_degree_id, study_mode_id, group_type_id FROM student_groups WHERE is_active = 1 ORDER BY name";
    $stmt = $pdo->query($query);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
