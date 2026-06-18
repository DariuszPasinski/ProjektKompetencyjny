<?php
require_once "db.php";

header("Content-Type: application/json; charset=utf-8");

$year = (int)($_GET["year"] ?? 0);
$month = (int)($_GET["month"] ?? 0);

if (!$year || !$month) {
    echo json_encode([]);
    exit;
}

$start = sprintf("%04d-%02d-01", $year, $month);
$end = date("Y-m-d", strtotime("$start +1 month"));

$stmt = $pdo->prepare("
    SELECT
        semester_days.date,
        semester_days.week_number,
        semester_types.name AS semester_type,
        week_parities.name AS week_parity,
        week_days.name AS week_day,
        semester_halves.name AS semester_half
    FROM semester_days
    JOIN semester_types ON semester_types.id = semester_days.semester_type_id
    JOIN week_parities ON week_parities.id = semester_days.week_parity_id
    JOIN week_days ON week_days.id = semester_days.week_day_id
    JOIN semester_halves ON semester_halves.id = semester_days.semester_half_id
    WHERE semester_days.date >= :start
      AND semester_days.date < :end
    ORDER BY semester_days.date
");

$stmt->execute([
    ":start" => $start,
    ":end" => $end
]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);