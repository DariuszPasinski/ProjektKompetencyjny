<?php
session_start();
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

try{
    $query = "SELECT * FROM assessment_types";
    $stmt = $pdo->query($query);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
