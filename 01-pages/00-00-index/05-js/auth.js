/* ============================================================
   WARSTWA AUTORYZACJI — sessionStorage jako tymczasowa sesja
   ============================================================
   Aby przejść na backend, zamień metody login i logout na fetch.

   Przykład podmiany na fetch + JWT / cookie-session:
   ──────────────────────────────────────────────────
   async login(login, haslo) {
     const res = await fetch('/api/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',           // wysyła cookie sesji
       body: JSON.stringify({ login, haslo }),
     });
     if (!res.ok) return false;
     const { user } = await res.json();
     sessionStorage.setItem(_AUTH_KEY, JSON.stringify(user));
     return true;
   }

   logout() {
     fetch('/api/logout', { method: 'POST', credentials: 'include' });
     sessionStorage.removeItem(_AUTH_KEY);
   }
   ============================================================

   Dane testowe (lokalnie):
     login: admin
     hasło: 1234
   ============================================================ */

const _AUTH_KEY = 'pk_auth_v1';

const Auth = {

  /**
   * Loguje użytkownika.
   * Zwraca Promise<boolean> — true przy poprawnych danych.
   */
  async login(login, haslo) {
    // Symulacja opóźnienia sieciowego — usuń przy podmianie na fetch
    await new Promise(r => setTimeout(r, 250));

    // Weryfikacja lokalna — podmień na odpowiedź z serwera
    if (login === 'admin' && haslo === '1234') {
      sessionStorage.setItem(_AUTH_KEY, JSON.stringify({ login, role: 'redaktor' }));
      return true;
    }
    return false;
  },

  /** Wylogowuje użytkownika */
  logout() {
    sessionStorage.removeItem(_AUTH_KEY);
  },

  /** Czy użytkownik jest aktualnie zalogowany? */
  isLoggedIn() {
    return window.APP_IS_LOGGED_IN === true;
  },

  /** Dane zalogowanego użytkownika lub null */
  getUser() {
    const raw = sessionStorage.getItem(_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  },
};
