<?php
require_once "db.php";

$komunikat = "";

$lecturers = $pdo->query("
    SELECT id, CONCAT(COALESCE(title, ''), ' ', first_name, ' ', last_name) AS name
    FROM lecturers
    WHERE is_active = 1
    ORDER BY last_name, first_name
")->fetchAll(PDO::FETCH_ASSOC);

$subjects = $pdo->query("
    SELECT id, name
    FROM subjects
    ORDER BY name
")->fetchAll(PDO::FETCH_ASSOC);

$studentGroups = $pdo->query("
    SELECT id, name
    FROM student_groups
    WHERE is_active = 1
    ORDER BY name
")->fetchAll(PDO::FETCH_ASSOC);

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = trim($_POST["email"] ?? "");
    $haslo = $_POST["haslo"] ?? "";
    $imie = trim($_POST["imie"] ?? "");
    $nazwisko = trim($_POST["nazwisko"] ?? "");
    $rola = (int)($_POST["rola"] ?? 2);

    $wybraniProwadzacy = $_POST["lecturers"] ?? [];
    $wybranePrzedmioty = $_POST["subjects"] ?? [];
    $wybraneGrupy = $_POST["student_groups"] ?? [];

    if ($email && $haslo && $imie && $nazwisko) {
        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
            $stmt->execute([":email" => $email]);

            if ($stmt->fetch()) {
                $komunikat = "Użytkownik o takim emailu już istnieje.";
            } else {
                $pdo->beginTransaction();

                $hash = password_hash($haslo, PASSWORD_DEFAULT);

                $stmt = $pdo->prepare("
                    INSERT INTO users (email, password_hash, first_name, last_name, is_active)
                    VALUES (:email, :password_hash, :first_name, :last_name, 1)
                ");

                $stmt->execute([
                    ":email" => $email,
                    ":password_hash" => $hash,
                    ":first_name" => $imie,
                    ":last_name" => $nazwisko
                ]);

                $userId = $pdo->lastInsertId();

                $stmt = $pdo->prepare("
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (:user_id, :role_id)
                ");

                $stmt->execute([
                    ":user_id" => $userId,
                    ":role_id" => $rola
                ]);

                if ($rola === 2) {
                    $stmtLecturer = $pdo->prepare("
                        INSERT INTO user_lecturer_assignments (user_id, lecturer_id)
                        VALUES (:user_id, :lecturer_id)
                    ");

                    foreach ($wybraniProwadzacy as $lecturerId) {
                        $stmtLecturer->execute([
                            ":user_id" => $userId,
                            ":lecturer_id" => (int)$lecturerId
                        ]);
                    }

                    $stmtSubject = $pdo->prepare("
                        INSERT INTO user_subject_assignments (user_id, subject_id)
                        VALUES (:user_id, :subject_id)
                    ");

                    foreach ($wybranePrzedmioty as $subjectId) {
                        $stmtSubject->execute([
                            ":user_id" => $userId,
                            ":subject_id" => (int)$subjectId
                        ]);
                    }

                    $stmtGroup = $pdo->prepare("
                        INSERT INTO user_student_group_assignments (user_id, student_group_id)
                        VALUES (:user_id, :student_group_id)
                    ");

                    foreach ($wybraneGrupy as $groupId) {
                        $stmtGroup->execute([
                            ":user_id" => $userId,
                            ":student_group_id" => (int)$groupId
                        ]);
                    }
                }

                $pdo->commit();

                $komunikat = "Użytkownik został dodany.";
            }
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            $komunikat = "Błąd: " . $e->getMessage();
        }
    } else {
        $komunikat = "Uzupełnij wszystkie pola.";
    }
}
?>

<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Dodaj użytkownika</title>
</head>
<body>
    <h1>Dodaj użytkownika</h1>

    <?php if ($komunikat): ?>
        <p><?php echo htmlspecialchars($komunikat); ?></p>
    <?php endif; ?>

    <form method="POST">
        <p>
            <input type="email" name="email" placeholder="email" required>
        </p>

        <p>
            <input type="password" name="haslo" placeholder="hasło" required>
        </p>

        <p>
            <input type="text" name="imie" placeholder="imię" required>
        </p>

        <p>
            <input type="text" name="nazwisko" placeholder="nazwisko" required>
        </p>

        <p>
            <select name="rola" id="rola-select">
                <option value="1">ADMIN</option>
                <option value="2" selected>REDACTOR</option>
            </select>
        </p>

        <div id="permissions-section">
            <h3>Prowadzący</h3>
            <?php foreach ($lecturers as $lecturer): ?>
                <label>
                    <input type="checkbox" name="lecturers[]" value="<?php echo $lecturer["id"]; ?>">
                    <?php echo htmlspecialchars(trim($lecturer["name"])); ?>
                </label><br>
            <?php endforeach; ?>

            <h3>Przedmioty</h3>
            <?php foreach ($subjects as $subject): ?>
                <label>
                    <input type="checkbox" name="subjects[]" value="<?php echo $subject["id"]; ?>">
                    <?php echo htmlspecialchars($subject["name"]); ?>
                </label><br>
            <?php endforeach; ?>

            <h3>Grupy studentów</h3>
            <?php foreach ($studentGroups as $group): ?>
                <label>
                    <input type="checkbox" name="student_groups[]" value="<?php echo $group["id"]; ?>">
                    <?php echo htmlspecialchars($group["name"]); ?>
                </label><br>
            <?php endforeach; ?>
        </div>

        <p>
            <button type="submit">Dodaj użytkownika</button>
        </p>
    </form>

    <script>
        const rolaSelect = document.getElementById("rola-select");
        const permissionsSection = document.getElementById("permissions-section");

        function togglePermissionsSection() {
            permissionsSection.hidden = rolaSelect.value === "1";
        }

        rolaSelect.addEventListener("change", togglePermissionsSection);
        togglePermissionsSection();
    </script>
</body>
</html>