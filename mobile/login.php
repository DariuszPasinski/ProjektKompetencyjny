<?php
session_start();

if (isset($_SESSION["user_id"])) {
    header("Location: index.php");
    exit;
}

require_once "../db.php";

$error = false;

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $login = trim($_POST["login"] ?? "");
    $haslo = $_POST["haslo"] ?? "";

    $sql = "
        SELECT 
            users.id,
            users.email,
            users.password_hash,
            users.first_name,
            users.last_name,
            roles.id AS role_id,
            roles.name AS role_name,
            roles.permission_level
        FROM users
        JOIN user_roles ON user_roles.user_id = users.id
        JOIN roles ON roles.id = user_roles.role_id
        WHERE users.email = :login
          AND users.is_active = 1
        ORDER BY roles.permission_level ASC
        LIMIT 1
    ";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ":login" => $login
        ]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($haslo, $user["password_hash"])) {
            $_SESSION["user_id"] = $user["id"];
            $_SESSION["email"] = $user["email"];
            $_SESSION["first_name"] = $user["first_name"];
            $_SESSION["last_name"] = $user["last_name"];
            $_SESSION["role_id"] = $user["role_id"];
            $_SESSION["role_name"] = $user["role_name"];
            $_SESSION["permission_level"] = $user["permission_level"];

            header("Location: index.php");
            exit;
        } else {
            $error = true;
        }
    } catch (PDOException $e) {
        error_log($e->getMessage());
        $error = true;
    }
}
?>
<!DOCTYPE html>
<html lang="pl">
<head>
    <title>Logowanie — Mobile</title>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <link rel="stylesheet" href="../11-resources/01-css/style.css">
    <link rel="stylesheet" href="mobile.css">
    <link rel="icon" href="../11-resources/02-image/Favico.jpg">
</head>
<body class="login-page">
    <header class="app-header">
        <span class="lang-indicator">[PL]</span>
    </header>

    <main>
        <div class="login-card">
            <h2 class="login-title">zaloguj się do konta redaktora</h2>

            <form id="login-form" class="login-form" method="POST" action="login.php">
                <input
                    type="text"
                    id="login-input"
                    name="login"
                    class="form-input"
                    placeholder="email"
                    autocomplete="username"
                    required
                    value="<?php echo htmlspecialchars($_POST["login"] ?? ""); ?>"
                />

                <input
                    type="password"
                    id="password-input"
                    name="haslo"
                    class="form-input"
                    placeholder="hasło"
                    autocomplete="current-password"
                    required
                />

                <div class="login-buttons">
                    <button type="submit" class="btn-primary" id="btn-submit">zaloguj się</button>
                    <button type="button" class="btn-secondary" id="cancel-button">Anuluj</button>
                </div>

                <div class="login-error" id="login-error" <?php if (!$error) echo "hidden"; ?>>
                    Nieprawidłowy login lub hasło
                </div>
            </form>
        </div>
    </main>

    <script>
        document.getElementById("cancel-button").addEventListener("click", function () {
            window.location = "index.php";
        });
    </script>
</body>
</html>