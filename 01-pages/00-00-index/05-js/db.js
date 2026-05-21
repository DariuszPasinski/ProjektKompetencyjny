/* ============================================================
   WARSTWA DANYCH — localStorage jako tymczasowa baza
   ============================================================
   Kontrakt: każda metoda zwraca Promise (tak jak fetch).
   Aby przejść na backend, zamień tylko tę warstwę.

   Przykład podmiany konkretnej metody na fetch:
   ──────────────────────────────────────────────
   async getAll() {
     const res = await fetch('/api/events', { credentials: 'include' });
     if (!res.ok) throw new Error(res.statusText);
     return res.json();
   }

   async create(event) {
     const res = await fetch('/api/events', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify(event),
     });
     return res.json();
   }
   ============================================================

   Struktura obiektu wydarzenia:
   {
     id:          string  – unikalny identyfikator (UUID)
     data:        string  – "YYYY-MM-DD"
     kategoria:   string  – "rektorskie" | "dziekanskie" | "egzamin" | "kolokwium" | "imprezy" | "inne"
     skrot:       string  – skrót wyświetlany na kafelku kalendarza
     czasOd:      string  – "HH:MM"
     czasDo:      string  – "HH:MM"
     szczegoly:   string  – dłuższy opis (opcjonalny)
     // tylko dla egzamin / kolokwium:
     grupa?:      string
     przedmiot?:  string
     sala?:       string
   }
   ============================================================ */

const _DB_KEY = 'pk_events_v2';

const _SAMPLE_EVENTS = [
  { id: 'demo-01', data: '2026-05-05', kategoria: 'rektorskie',  skrot: 'Godziny rek.',    czasOd: '09:00', czasDo: '11:00', szczegoly: 'Spotkanie z rektorem PŁ' },
  { id: 'demo-02', data: '2026-05-07', kategoria: 'dziekanskie', skrot: 'Godziny dziek.',  czasOd: '11:15', czasDo: '13:00', szczegoly: '' },
  { id: 'demo-03', data: '2026-05-07', kategoria: 'imprezy',     skrot: 'Turniej sport.',  czasOd: '13:15', czasDo: '15:00', szczegoly: 'Szczegóły na stronie wydziału' },
  { id: 'demo-04', data: '2026-05-12', kategoria: 'kolokwium',   skrot: 'Fizyka',          czasOd: '10:00', czasDo: '12:00', szczegoly: 'Materiał: mechanika kwantowa', grupa: 'I1', przedmiot: 'Fizyka 2', sala: 'C2.WEIA' },
  { id: 'demo-05', data: '2026-05-14', kategoria: 'egzamin',     skrot: 'AM2',             czasOd: '09:00', czasDo: '11:30', szczegoly: 'Obowiązuje całość materiału semestru', grupa: 'I1-I2', przedmiot: 'Analiza Matematyczna 2', sala: 'Aula B' },
  { id: 'demo-06', data: '2026-05-14', kategoria: 'rektorskie',  skrot: 'Godziny rek.',    czasOd: '09:00', czasDo: '11:00', szczegoly: '' },
  { id: 'demo-07', data: '2026-05-19', kategoria: 'imprezy',     skrot: 'Dni Studenta',    czasOd: '14:00', czasDo: '22:00', szczegoly: 'Koncert + integracja wydziałowa' },
  { id: 'demo-08', data: '2026-05-21', kategoria: 'inne',        skrot: 'Warsztaty Git',   czasOd: '10:00', czasDo: '16:00', szczegoly: 'Rejestracja wymagana przez dziekanat' },
  { id: 'demo-09', data: '2026-05-26', kategoria: 'egzamin',     skrot: 'PP2',             czasOd: '09:00', czasDo: '12:00', szczegoly: 'Egzamin pisemny + krótka rozmowa', grupa: 'I1', przedmiot: 'Podstawy Programowania 2', sala: 'Aula A' },
  { id: 'demo-10', data: '2026-05-29', kategoria: 'imprezy',     skrot: 'Juwenalia',       czasOd: '12:00', czasDo: '23:59', szczegoly: '' },
  { id: 'demo-11', data: '2026-06-02', kategoria: 'egzamin',     skrot: 'PP2 końc.',       czasOd: '09:00', czasDo: '12:00', szczegoly: 'Projekty oddane do 01.06', grupa: 'I1', przedmiot: 'Podstawy Programowania 2', sala: 'Aula B' },
  { id: 'demo-12', data: '2026-06-10', kategoria: 'imprezy',     skrot: 'Piknik wyd.',     czasOd: '11:00', czasDo: '20:00', szczegoly: '' },
  { id: 'demo-13', data: '2026-06-16', kategoria: 'egzamin',     skrot: 'Sieci',           czasOd: '10:00', czasDo: '12:00', szczegoly: '', grupa: 'I2', przedmiot: 'Sieci Komputerowe', sala: 'C2.WEIA' },
];

const Api = {

  async getAll() {
    const raw = localStorage.getItem(_DB_KEY);
    if (!raw) {
      localStorage.setItem(_DB_KEY, JSON.stringify(_SAMPLE_EVENTS));
      return [..._SAMPLE_EVENTS];
    }
    return JSON.parse(raw);
  },

  async getByMonth(year, monthIdx) {
    const all = await this.getAll();
    const prefix = `${year}-${String(monthIdx).padStart(2, '0')}`;
    return all.filter(e => e.data.startsWith(prefix));
  },

  async getByDate(dateStr) {
    const all = await this.getAll();
    return all.filter(e => e.data === dateStr);
  },

  async create(event) {
    const all = await this.getAll();
    const newEvent = { ...event, id: crypto.randomUUID() };
    localStorage.setItem(_DB_KEY, JSON.stringify([...all, newEvent]));
    return newEvent;
  },

  async update(id, changes) {
    const all = await this.getAll();
    const updated = all.map(e => e.id === id ? { ...e, ...changes } : e);
    localStorage.setItem(_DB_KEY, JSON.stringify(updated));
    return updated.find(e => e.id === id);
  },

  async delete(id) {
    const all = await this.getAll();
    localStorage.setItem(_DB_KEY, JSON.stringify(all.filter(e => e.id !== id)));
  },

  async reset() {
    localStorage.removeItem(_DB_KEY);
  },
};
