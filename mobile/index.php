<?php
session_start();

$isLoggedIn = isset($_SESSION["user_id"]);
$userId = $isLoggedIn ? (int)$_SESSION["user_id"] : null;
$roleName = $_SESSION["role_name"] ?? "";
$userName = $_SESSION["user_name"] ?? ($_SESSION["name"] ?? "Użytkownik");

$roleClass = "";
if ($roleName === "ADMIN") {
    $roleClass = "editor-badge--admin";
} elseif ($roleName === "REDAKTOR" || $roleName === "REDACTOR") {
    $roleClass = "editor-badge--redactor";
}
?>
<!DOCTYPE html>
<html lang="pl">
<head>
    <title>Kalendarz Akademicki — Mobile</title>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

    <base href="../">

    <link rel="stylesheet" href="11-resources/01-css/style.css?v=2">
    <link rel="stylesheet" href="01-pages/00-00-index/01-css/calendar.css?v=2">
    <link rel="stylesheet" href="mobile/mobile.css?v=2">
    <link rel="icon" href="11-resources/02-image/Favico.jpg">

    <script>
        window.APP_IS_LOGGED_IN = <?php echo $isLoggedIn ? "true" : "false"; ?>;
        window.APP_USER_ID = <?php echo $userId !== null ? $userId : "null"; ?>;
        window.APP_ROLE_NAME = <?php echo json_encode($roleName, JSON_UNESCAPED_UNICODE); ?>;
        let currentFilter = [];
    </script>

    <script src="01-pages/00-00-index/05-js/index.js?v=2"></script>
    <script src="01-pages/00-00-index/05-js/editor.js?v=2"></script>
    <script src="01-pages/00-00-index/05-js/filters.js?v=2"></script>
    <script src="mobile/mobile.js?v=2"></script>
</head>
<body>
    <header class="app-header">
        <span class="lang-indicator">[PL]</span>

        <div class="header-actions" style="margin-left:auto">
            <button class="btn-login" id="css-button-mobile">Ciemny</button>
            <?php if ($isLoggedIn): ?>
                <span class="editor-badge <?php echo htmlspecialchars($roleClass); ?>" id="editor-badge">
                    <?php echo htmlspecialchars($roleName); ?>
                </span>

                <button class="btn-login" id="user-menu-button">
					<?php echo htmlspecialchars(trim(($_SESSION["first_name"] ?? "") . " " . ($_SESSION["last_name"] ?? ""))); ?>
				</button>

				<div class="user-dropdown" id="user-dropdown" hidden>
					<strong>
						<?php echo htmlspecialchars(trim(($_SESSION["first_name"] ?? "") . " " . ($_SESSION["last_name"] ?? ""))); ?>
					</strong>
					<div><?php echo htmlspecialchars($roleName); ?></div>

					<a href="mobile/logout.php" class="btn-logout">Wyloguj</a>
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
                <section id="calendar-main">
                    <table>
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </section>

                <section id="calendar-legend" hidden>
                    <h3 class="legend-title">LEGENDA</h3>
                    <div id="calendar-legend-items"></div>
                </section>

                <aside id="editor-panel" class="editor-panel" hidden>
                    <div class="mobile-sheet-handle"></div>
                    <div class="editor-panel__title" id="editor-date-title">Wybierz datę ↑</div>

                    <ul class="event-list" id="event-list"></ul>

                    <form class="event-form" id="event-form" hidden novalidate>
                        <div class="form-kat-grid" id="form-kat-grid"></div>

                        <div class="form-kat-banner" id="form-kat-banner" hidden></div>

                        <label class="event-form__label" id="form-title-label" hidden>tytuł
                            <input type="text" class="event-form__input" id="form-title" placeholder="np. Juwenalia">
                        </label>

                        <div id="form-assessment-fields" hidden>
                            <label class="event-form__label">przedmiot
                                <select class="event-form__input event-form__select" id="form-subject-id">
                                    <option value="">-- wybierz przedmiot --</option>
                                </select>
                            </label>

                            <label class="event-form__label">prowadzący
                                <select class="event-form__input event-form__select" id="form-lecturer-id">
                                    <option value="">-- wybierz prowadzącego --</option>
                                </select>
                            </label>

                            <label class="event-form__label">grupa
                                <select class="event-form__input event-form__select" id="form-student-group-id">
                                    <option value="">-- wybierz grupę --</option>
                                </select>
                            </label>
                        </div>

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

                        <label class="event-form__label" id="form-location-label" hidden>miejsce / sala
                            <input type="text" class="event-form__input" id="form-location" placeholder="np. C2">
                        </label>

                        <div id="form-target-groups-wrapper" hidden>
                            <div class="event-form__label">grupy</div>
                            <div id="form-target-groups-list"></div>
                        </div>

                        <label class="event-form__label">opis
                            <textarea class="event-form__textarea" id="form-description" placeholder="dodatkowe informacje..."></textarea>
                        </label>

                        <div class="event-form-buttons">
                            <button type="submit" class="btn-confirm" id="btn-confirm">ZATWIERDŹ</button>
                            <button type="button" class="btn-odrzuc" id="btn-odrzuc">ODRZUĆ</button>
                        </div>
                    </form>
                </aside>
            </section>
        </div>
    </main>

    <div class="mobile-sheet-backdrop" id="mobile-sheet-backdrop" hidden></div>

    <div class="mobile-legend-panel" id="mobile-legend" hidden>
        <div class="legend-title">LEGENDA</div>
        <div id="mobile-legend-items"></div>
    </div>

    <!-- Panel filtrów mobilnych -->
    <div class="mobile-filter-panel" id="mobile-filter-panel" hidden>
        <div class="mobile-filter-handle"></div>
        <div class="mobile-filter-header">
            <span class="mobile-filter-title">Filtry grup</span>
            <button class="mobile-filter-close" id="mobile-filter-close">✕</button>
        </div>
        <div id="filers-section" class="mobile-filter-body"></div>
    </div>

    <div id="event-popover" class="event-popover" hidden>
        <div class="popover-header" id="popover-header"></div>

        <div class="popover-body">
            <div class="popover-main" id="popover-main"></div>
            <div class="popover-time" id="popover-time" hidden></div>
            <div class="popover-group" id="popover-group" hidden></div>
            <div class="popover-location" id="popover-location" hidden></div>
            <div class="popover-details" id="popover-details" hidden></div>
            <div class="popover-report-view" id="popover-report-view" hidden></div>

            <button type="button" class="btn-popover-report" id="btn-popover-report">⚠ Zgłoś</button>

            <div class="popover-report-form" id="popover-report-form" hidden>
                <textarea id="popover-report-text" class="event-form__textarea" placeholder="Opisz problem..."></textarea>
                <div class="event-form-buttons">
                    <button type="button" class="btn-confirm" id="btn-report-submit">Zgłoś</button>
                    <button type="button" class="btn-odrzuc" id="btn-report-cancel">Anuluj</button>
                </div>
            </div>

            <div class="popover-actions" id="popover-actions" hidden>
                <button class="btn-popover-edit" id="btn-popover-edit">Edytuj</button>
                <button class="btn-popover-cancel" id="btn-popover-cancel">Odwołaj</button>
            </div>
        </div>
    </div>

    <footer class="mobile-footer">
        <button class="footer-tab tab-btn--active tab-btn" id="tab-calendar">Kalendarz</button>
        <button class="footer-tab tab-btn" id="tab-events">Wydarzenia</button>
        <button class="footer-tab tab-btn" id="tab-assessments">Zaliczenia</button>

		<?php if ($isLoggedIn && ($roleName === "REDAKTOR" || $roleName === "REDACTOR")): ?>
			<button class="footer-tab tab-btn" id="tab-my-events">Moje wpisy</button>
		<?php endif; ?>

        <button class="footer-tab" id="tab-legend">Legenda</button>
        <button class="footer-tab" id="tab-filters">Filtry</button>
        <button class="footer-tab tab-btn" id="tab-edit" hidden>Edytuj</button>
    </footer>

    <script>
        document.addEventListener("DOMContentLoaded", () => start());

        <?php if ($isLoggedIn): ?>
		document.getElementById("user-menu-button").addEventListener("click", function () {
			const dropdown = document.getElementById("user-dropdown");
			dropdown.hidden = !dropdown.hidden;
		});
		<?php else: ?>
		document.getElementById("login-button").addEventListener("click", function () {
			window.location = "mobile/login.php";
		});
		<?php endif; ?>

        document.getElementById("next-month-button").addEventListener("click", () => nextMonth());
        document.getElementById("prev-month-button").addEventListener("click", () => prevMonth());

        /* --- Przełącznik motywu --- */
        (function () {
            const btn = document.getElementById("css-button-mobile");
            const themes = ["", "dark", "contrast"];
            const labels = ["Ciemny", "Kontrast", "Jasny"];
            let idx = 0;

            const saved = localStorage.getItem("mobile-theme");
            if (saved) {
                idx = themes.indexOf(saved);
                if (idx < 0) idx = 0;
                document.documentElement.dataset.theme = saved || "";
                if (!saved) delete document.documentElement.dataset.theme;
                btn.textContent = labels[idx];
            }

            btn.addEventListener("click", function () {
                idx = (idx + 1) % themes.length;
                const theme = themes[idx];
                if (theme) {
                    document.documentElement.dataset.theme = theme;
                } else {
                    delete document.documentElement.dataset.theme;
                }
                localStorage.setItem("mobile-theme", theme);
                btn.textContent = labels[idx];
            });
        })();

        /* --- Legenda --- */
        document.getElementById("tab-legend").addEventListener("click", function () {
            const panel = document.getElementById("mobile-legend");
            const filterPanel = document.getElementById("mobile-filter-panel");

            const source = document.getElementById("calendar-legend-items");
            const target = document.getElementById("mobile-legend-items");
            if (source && target) target.innerHTML = source.innerHTML;

            if (!filterPanel.hidden) {
                filterPanel.hidden = true;
                document.getElementById("tab-filters").classList.remove("footer-tab--active");
            }

            panel.hidden = !panel.hidden;
            this.classList.toggle("footer-tab--active", !panel.hidden);
        });

        /* --- Filtry --- */
        function openMobileFilter() {
            const panel = document.getElementById("mobile-filter-panel");
            const legend = document.getElementById("mobile-legend");
            if (!legend.hidden) {
                legend.hidden = true;
                document.getElementById("tab-legend").classList.remove("footer-tab--active");
            }
            panel.hidden = false;
            document.getElementById("tab-filters").classList.add("footer-tab--active");
        }

        function closeMobileFilter() {
            const panel = document.getElementById("mobile-filter-panel");
            panel.hidden = true;
            document.getElementById("tab-filters").classList.remove("footer-tab--active");
        }

        /* Override openFilter/closeFilter z filters.js dla mobile */
        function openFilter()  { openMobileFilter(); }
        function closeFilter() { closeMobileFilter(); }

        document.getElementById("tab-filters").addEventListener("click", function () {
            const panel = document.getElementById("mobile-filter-panel");
            if (panel.hidden) {
                openMobileFilter();
            } else {
                closeMobileFilter();
            }
        });

        document.getElementById("mobile-filter-close").addEventListener("click", closeMobileFilter);

        document.getElementById("tab-edit").addEventListener("click", function () {
            const legend = document.getElementById("mobile-legend");
            const filterPanel = document.getElementById("mobile-filter-panel");
            if (!legend.hidden) {
                legend.hidden = true;
                document.getElementById("tab-legend").classList.remove("footer-tab--active");
            }
            if (!filterPanel.hidden) closeMobileFilter();
        });

        ["tab-calendar", "tab-events", "tab-assessments"].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener("click", () => {
                const legend = document.getElementById("mobile-legend");
                const filterPanel = document.getElementById("mobile-filter-panel");
                if (!legend.hidden) {
                    legend.hidden = true;
                    document.getElementById("tab-legend").classList.remove("footer-tab--active");
                }
                if (!filterPanel.hidden) closeMobileFilter();
            });
        });
    </script>
</body>
</html>