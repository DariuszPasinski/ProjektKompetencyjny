<?php
session_start();

$isLoggedIn = isset($_SESSION["user_id"]);
$userFullName = "";
$roleName = "";

if ($isLoggedIn) {
    $userFullName = trim(($_SESSION["first_name"] ?? "") . " " . ($_SESSION["last_name"] ?? ""));
    $roleName = $_SESSION["role_name"] ?? "";
}
?>
<!DOCTYPE html>
<html lang="pl">
<head>
    <title>Kalendarz Akademicki Politechniki Łódzkiej</title>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="11-resources/01-css/style.css?v=4" class="css-light">
    <link rel="stylesheet" href="01-pages/00-00-index/01-css/calendar.css?v=4" class="css-light">
    <link rel="stylesheet" href="11-resources/01-css/styleDark.css?v=4" class="css-dark">
    <link rel="stylesheet" href="01-pages/00-00-index/01-css/calendarDark.css?v=4" class="css-dark">
    <link rel="stylesheet" href="11-resources/01-css/styleContrast.css?v=4" class="css-contrast">
    <link rel="stylesheet" href="01-pages/00-00-index/01-css/calendarContrast.css?v=4" class="css-contrast">
    <link rel="icon" href="11-resources/02-image/Favico.jpg">
    <!-- Kolejność ważna: db → auth → index → editor -->
	<script>
		window.APP_IS_LOGGED_IN = <?php echo $isLoggedIn ? "true" : "false"; ?>;
		window.APP_USER_ID = <?php echo $isLoggedIn ? (int)$_SESSION["user_id"] : "null"; ?>;
		window.APP_ROLE_NAME = "<?php echo $isLoggedIn ? htmlspecialchars($_SESSION["role_name"]) : ""; ?>";
	</script>
    <script src="11-resources/05-js/mobile-detect.js?v=4"></script>
    <script src="11-resources/05-js/stylesheet-change.js?v=4"></script>
    <script src="01-pages/00-00-index/05-js/db.js?v=4"></script>
    <script src="01-pages/00-00-index/05-js/auth.js?v=4"></script>
    <script src="01-pages/00-00-index/05-js/index.js?v=4"></script>
    <script src="01-pages/00-00-index/05-js/filters.js?v=4"></script>
    <script src="01-pages/00-00-index/05-js/editor.js?v=5"></script>
    <script src="01-pages/00-00-index/05-js/legend-color.js?v=4"></script>
</head>
<body>
    <header class="app-header">
        <span class="lang-indicator">[PL]</span>
        <div class="header-filters">
            <span class="filters-label">Filtry:</span>
            <button class="tab-btn tab-btn--active" id="tab-calendar">Kalendarz</button>
			<button class="tab-btn" id="tab-events">Wydarzenia</button>
			<button class="tab-btn" id="tab-assessments">Zaliczenia</button>
			
			<?php if ($isLoggedIn && ($roleName === "REDAKTOR" || $roleName === "REDACTOR")): ?>
				<button class="tab-btn" id="tab-my-events">Moje wpisy</button>
			<?php endif; ?>
			
            <?php if ($isLoggedIn): ?>
				<button class="tab-btn" id="tab-edit">Edytuj</button>
			<?php endif; ?>
        </div>
        <div class="header-actions">
            <button class="btn-login" id="css-button">Dark</button>
            <?php if ($isLoggedIn): ?>
				<?php
			$roleClass = "";

			if ($roleName === "ADMIN") {
				$roleClass = "editor-badge--admin";
			} elseif ($roleName === "REDAKTOR" || $roleName === "REDACTOR") {
				$roleClass = "editor-badge--redactor";
			}
			?>

			<span class="editor-badge <?php echo htmlspecialchars($roleClass); ?>" id="editor-badge">
				<?php echo htmlspecialchars($roleName); ?>
			</span>
			<?php endif; ?>
            <?php if ($isLoggedIn): ?>
				<div class="user-menu">
					<button class="btn-login" id="user-menu-button">
						<?php echo htmlspecialchars($userFullName); ?>
					</button>

					<div class="user-dropdown" id="user-dropdown" hidden>
						<div class="user-dropdown-name">
							<?php echo htmlspecialchars($_SESSION["first_name"] . " " . $_SESSION["last_name"]); ?>
						</div>

						<div class="user-dropdown-role">
							<?php echo htmlspecialchars($_SESSION["role_name"]); ?>
						</div>

						<a href="logout.php" class="user-dropdown-logout">Wyloguj</a>
					</div>
				</div>
			<?php else: ?>
				<button class="btn-login" id="login-button">login</button>
			<?php endif; ?>
        </div>
    </header>

    <main>
        <div class="calendar-wrapper">
            <nav class="month-nav">
                <button class="btn-nav" id="prev-month-button">&#8592;</button>
                <p id="current-date-paragraph"></p>
                <button class="btn-nav" id="next-month-button">&#8594;</button>
            </nav>

            <section id="calendar">
                <!-- Siatka kalendarza -->
                <section id="calendar-main">
                    <table>
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </section>

                <!-- Legenda (widok widza) -->
                <section id="calendar-legend">
                    <button class="btn-legend" id="legend-button">Filtry</button>
                    <section class="legend-section" id="calendar-legend-items">
                        <h3 class="legend-title">LEGENDA</h3>
                    </section>
                    <section class="legend-section" hidden>
                        <h3 class="legend-title">FILTERS</h3>
                        <section class="filers-section">

                        </section>
                        <!-- Semester -->
                        <!-- Kierunek -->
                        <!-- Grupa / Specjalizacja  -->
                        <!-- Obieralny 1 -->
                        <!-- Obieralny 2 -->
                    </section>
				</section>

                <section id="calendar-color" class="editor-panel" hidden>
                    <h3 class="color-title">COLOR</h3>
                    <div class="legend-item">
                        <label class="legend-dot legend-dot--color" for="color-input"></label>
                        <input type="color" class="color-input" id="color-input" value="#000000"><br>
                        <button class="btn-color" id="color-confirm">Zatwierdź</button>
                        <button id="color-exit">Wyjdź</button>
                    </div>
                </section>

                <!-- Panel redaktora (tryb Edytuj) — domyślnie ukryty -->
                <aside id="editor-panel" class="editor-panel" hidden>
                    <div class="editor-panel__title" id="editor-date-title">Wybierz datę ↑</div>

                    <ul class="event-list" id="event-list"></ul>

                    <form class="event-form" action="" method="POST" id="event-form" hidden novalidate>
                        <!-- Krok 1: siatka kategorii -->
                        <div class="form-kat-grid" id="form-kat-grid">
							<!-- Tutaj JS wstawi typy z bazy: assessment_types i event_types -->
						</div>
                        <!-- Krok 2: banner wybranej kategorii -->
                        <div class="form-kat-banner" id="form-kat-banner" hidden></div>
                        <!-- Pola wspólne -->
                        <label class="event-form__label">dnia
                            <input type="date" class="event-form__input" id="form-data" required>
                        </label>
                        <label class="event-form__label">w godzinach
                            <div class="event-form__time-row">
                                <input type="time" class="event-form__input" id="form-czas-od">
                                <span>–</span>
                                <input type="time" class="event-form__input" id="form-czas-do">
                            </div>
                        </label>
                        <label class="event-form__label" id="form-title-label" hidden>tytuł
							<input type="text" class="event-form__input" id="form-title"
								   placeholder="np. Juwenalia, Dzień wolny...">
						</label>
                        <!-- Pola tylko dla egzaminu / kolokwium -->
                        <div id="form-assessment-fields" hidden>
							<label class="event-form__label">przedmiot
								<select class="event-form__input" id="form-subject-id">
									<option value="">-- wybierz przedmiot --</option>
								</select>
							</label>

							<label class="event-form__label">prowadzący
								<select class="event-form__input" id="form-lecturer-id">
									<option value="">-- wybierz prowadzącego --</option>
								</select>
							</label>

							<label class="event-form__label">grupa
								<select class="event-form__input" id="form-student-group-id">
									<option value="">-- wybierz grupę --</option>
								</select>
							</label>
						</div>

						<label class="event-form__label" id="form-location-label" hidden>miejsce / sala
							<input type="text" class="event-form__input" id="form-location" placeholder="np. C2.WEIA">
						</label>
						<div class="event-form__label" id="form-target-groups-wrapper" hidden>
							<div>grupy docelowe</div>
							<small>Jeśli nic nie zaznaczysz, wydarzenie będzie dla wszystkich.</small>

							<div id="form-target-groups-list"></div>
						</div>
                        <label class="event-form__label">opis
							<textarea class="event-form__textarea" id="form-description"
									  placeholder="dodatkowe informacje..."></textarea>
						</label>
                        <div class="event-form-buttons">
                            <button type="submit" class="btn-confirm" name="submit" id="btn-confirm" >ZATWIERDŹ</button>
                            <button type="button" class="btn-odrzuc" id="btn-odrzuc">ODRZUĆ</button>
                        </div>
                    </form>
                </aside>

                <section id="filers-section" class="editor-panel" hidden>
                    <!-- Wszytko tworzone jest w pliku filtry js -->
                </section>
            </section>
        </div>
    </main>

    <footer class="mobile-footer">
        <button class="footer-tab footer-tab--active">Kalendarz &#9660;</button>
        <button class="footer-tab">Pogoda</button>
        <button class="footer-tab">Legenda</button>
    </footer>

    <!-- Dymek informacyjny (macOS-style popover) -->
    <div id="event-popover" class="event-popover" hidden>
        <div class="popover-header" id="popover-header"></div>
        <div class="popover-body">
            <div class="popover-main"     id="popover-main"></div>
            <div class="popover-time"     id="popover-time"     hidden></div>
            <div class="popover-group"    id="popover-group"    hidden></div>
            <div class="popover-location" id="popover-location" hidden></div>
            <div class="popover-details"  id="popover-details"  hidden></div>
			<div class="popover-report-view" id="popover-report-view" hidden></div>
            <!-- Przyciski akcji — widoczne tylko dla redaktora -->
            <div class="popover-report-button-wrapper">
				<button type="button" class="btn-popover-report" id="btn-popover-report">⚠ Zgłoś</button>
			</div>

			<div class="popover-report-form" id="popover-report-form" hidden>
				<textarea id="popover-report-text" placeholder="Opisz problem ze wpisem..."></textarea>

				<div>
					<button type="button" id="btn-report-submit">Zgłoś</button>
					<button type="button" id="btn-report-cancel">Anuluj</button>
				</div>
			</div>

			<div class="popover-actions" id="popover-actions" hidden>
				<button class="btn-popover-edit"   id="btn-popover-edit">Edytuj</button>
				<button class="btn-popover-cancel" id="btn-popover-cancel">Odwołaj</button>
			</div>
			
        </div>
    </div>

    <script>
        let currentColor = null;
        let currentFilter = []; // ID filtrowanych grup

        document.addEventListener("DOMContentLoaded", function ()
        {
            start();
            colorRead();

            disableStylesheet(document.getElementsByClassName("css-dark")[0]);
            disableStylesheet(document.getElementsByClassName("css-dark")[1]);
            disableStylesheet(document.getElementsByClassName("css-contrast")[0]);
            disableStylesheet(document.getElementsByClassName("css-contrast")[1]);
        });

        // -- Color Picker --
        document.getElementById("color-exit").addEventListener("click", function () {
            currentColor = null;
            closePicker();
        })
        document.getElementById("color-confirm").addEventListener("click", function () {
            // console.log("ButtonPressed");
            colorEdit(currentColor);
            //colorSet(currentColor, document.getElementById("color-input").value);
            currentColor = null;
            closePicker();
        });
        document.addEventListener("calendarRendered", function() {
            // console.log("calendarRendered");
            colorRead();
        });

        // -- CSS Change --
        document.getElementById("css-button").addEventListener("click", function () {
            if (document.getElementById("css-button").innerText === "Dark") {
                enableStylesheet(document.getElementsByClassName("css-dark")[0]);
                enableStylesheet(document.getElementsByClassName("css-dark")[1]);
                disableStylesheet(document.getElementsByClassName("css-light")[0]);
                disableStylesheet(document.getElementsByClassName("css-light")[1]);
                document.getElementById("css-button").innerText = "Contrast";
            } else if (document.getElementById("css-button").innerText === "Contrast") {
                enableStylesheet(document.getElementsByClassName("css-contrast")[0]);
                enableStylesheet(document.getElementsByClassName("css-contrast")[1]);
                disableStylesheet(document.getElementsByClassName("css-dark")[0]);
                disableStylesheet(document.getElementsByClassName("css-dark")[1]);
                document.getElementById("css-button").innerText = "Light";
            } else {
                enableStylesheet(document.getElementsByClassName("css-light")[0]);
                enableStylesheet(document.getElementsByClassName("css-light")[1]);
                disableStylesheet(document.getElementsByClassName("css-contrast")[0]);
                disableStylesheet(document.getElementsByClassName("css-contrast")[1]);
                document.getElementById("css-button").innerText = "Dark";
            }
        });

        <?php if ($isLoggedIn): ?>
			document.getElementById("user-menu-button").addEventListener("click", function () {
				const dropdown = document.getElementById("user-dropdown");
				dropdown.hidden = !dropdown.hidden;
			});
		<?php else: ?>
			document.getElementById("login-button").addEventListener("click", function () {
				window.location = "00-01-login.php";
			});
		<?php endif; ?>
        document.getElementById("next-month-button").addEventListener("click", () => nextMonth());
        document.getElementById("prev-month-button").addEventListener("click", () => prevMonth());

        document.getElementById("legend-button").addEventListener("click", function() {
            openFilter();
        })
    </script>
</body>
</html>
