/**
 * mobile-detect.js
 * Wykrywa urządzenia mobilne po User-Agent i przekierowuje do /mobile/.
 *
 * Użycie: dołącz jako PIERWSZY skrypt w <head> każdej strony desktopowej:
 *   <script src="11-resources/05-js/mobile-detect.js"></script>
 *
 * Aby wyłączyć redirect dla konkretnej strony (np. strona logowania),
 * ustaw przed załadowaniem skryptu:
 *   <script>window.SKIP_MOBILE_REDIRECT = true;</script>
 */

(function () {
    "use strict";

    // ── Konfiguracja ────────────────────────────────────────────────────────────

    /** Ścieżka do folderu z wersją mobilną (względna od katalogu głównego). */
    var MOBILE_ROOT = "/mobile/";

    /**
     * Mapowanie stron desktop → odpowiedniki mobile.
     * Klucz: fragment pathname strony desktopowej (bez leading slash).
     * Wartość: plik w /mobile/ do którego przekierować.
     * Jeśli strona nie jest na liście, trafia na /mobile/index.html.
     */
    var PAGE_MAP = {
        "index.html":      "index.html",
        "00-01-login.html": "login.html",
    };

    // ── Guard: nie przekierowuj jeśli flaga ustawiona ────────────────────────

    if (window.SKIP_MOBILE_REDIRECT) return;

    // ── Guard: nie przekierowuj jeśli już jesteśmy w /mobile/ ───────────────

    if (window.location.pathname.indexOf(MOBILE_ROOT) !== -1) return;

    // ── Detekcja User-Agent ──────────────────────────────────────────────────

    var UA_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

    function isMobile() {
        return UA_PATTERN.test(navigator.userAgent);
    }

    // ── Wyznacz docelowy URL ─────────────────────────────────────────────────

    function getMobileUrl() {
        var currentFile = window.location.pathname.split("/").pop() || "index.html";
        var targetFile  = PAGE_MAP[currentFile] || "index.html";
        return MOBILE_ROOT + targetFile;
    }

    // ── Przekierowanie ───────────────────────────────────────────────────────

    if (isMobile()) {
        window.location.replace(getMobileUrl());
    }

}());