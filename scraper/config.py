DB = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "academiccalendar",
}

GEMINI_API_KEY = "AIzaSyB6UQLVqNcHK27lwaKjKjdHVZjgXlP3IXo"
GEMINI_MODEL   = "gemini-3.1-flash-lite"

DELAY       = 1.2
TIMEOUT     = 15
MAX_RETRIES = 3
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pl-PL,pl;q=0.9",
}

WEEIA_BASE        = "https://weeia.p.lodz.pl"
ANNOUNCEMENTS_URL = WEEIA_BASE + "/wydzial/ogloszenia-dziekanatu"

PL_BASE           = "https://p.lodz.pl"
CALENDAR_URL      = PL_BASE + "/studenci/podzial-roku-akademickiego"

# source_types
SOURCE_SCRAPER  = 1
SOURCE_REDACTOR = 2

# event_types
EVENT_UCZELNIANE   = 1
EVENT_REKTORSKIE   = 2
EVENT_DZIEN_WOLNY  = 3
EVENT_DZIEKANSKIE  = 2

# semester_types
SEMESTR_ZIMOWY = 1
SEMESTR_LETNI  = 2

# week_parities
PARITY_X2_PARZYSTY   = 1
PARITY_X1_NIEPARZYSTY = 2

# week_days
WEEK_DAYS = {"mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5}

# semester_halves
HALF_PIERWSZA = 1
HALF_DRUGA    = 2
