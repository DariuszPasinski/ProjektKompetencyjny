import logging
import pymysql
import pymysql.cursors
from config import DB

log = logging.getLogger(__name__)


def get_conn() -> pymysql.Connection:
    return pymysql.connect(
        **DB,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def init_db() -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT IGNORE INTO event_types (id, name, color)
                VALUES (9, 'Godziny dziekańskie', '#E91E63')
            """)
        conn.commit()
        log.info("Baza gotowa.")
    finally:
        conn.close()



# university_events – godziny rektorskie / dziekańskie / dni wolne
def insert_university_event(conn, data: dict) -> int:
    """
    data: {
        event_type_id, title, start_datetime, end_datetime,
        location, description, source_type_id
    }
    Zwraca id wstawionego rekordu.
    """
    sql = """
        INSERT INTO university_events
            (event_type_id, title, start_datetime, end_datetime,
             location, description, source_type_id)
        VALUES
            (%(event_type_id)s, %(title)s, %(start_datetime)s, %(end_datetime)s,
             %(location)s, %(description)s, %(source_type_id)s)
    """
    with conn.cursor() as cur:
        cur.execute(sql, data)
        return cur.lastrowid


def insert_university_event_target_all(conn, event_id: int) -> None:
    """Przypisuje wydarzenie do wszystkich studentów (target_type_id=1)."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT IGNORE INTO university_event_targets
                (university_event_id, target_type_id, target_id)
            VALUES (%s, 1, NULL)
        """, (event_id,))


# semester_days – parzystość tygodni z PDF
def insert_semester_day(conn, data: dict) -> None:
    """
    data: {
        academic_year, semester_type_id, date,
        week_number, week_parity_id, week_day_id,
        semester_half_id, source_type_id
    }
    """
    sql = """
        INSERT INTO semester_days
            (academic_year, semester_type_id, `date`, week_number,
             week_parity_id, week_day_id, semester_half_id, source_type_id)
        VALUES
            (%(academic_year)s, %(semester_type_id)s, %(date)s, %(week_number)s,
             %(week_parity_id)s, %(week_day_id)s, %(semester_half_id)s, %(source_type_id)s)
        ON DUPLICATE KEY UPDATE
            week_number      = VALUES(week_number),
            week_parity_id   = VALUES(week_parity_id),
            week_day_id      = VALUES(week_day_id),
            semester_half_id = VALUES(semester_half_id)
    """
    with conn.cursor() as cur:
        cur.execute(sql, data)
