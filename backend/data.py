import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "3000"))
BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = Path(os.environ.get("DB_PATH", str(BASE_DIR / "kinta.db"))).resolve()
ADMIN_EMAIL = "admin@kinta.in"
ADMIN_PASSWORD = "kinta123"
ADMIN_SESSION_COOKIE = "kinta_admin_session"
USER_SESSION_COOKIE = "kinta_user_session"
ACTIVE_ADMIN_SESSIONS = {}
ACTIVE_USER_SESSIONS = {}
PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 310000

LAND_SEED = [
    ("Verified Paddy Land", "Nellore, Andhra Pradesh", 4.5, "Clay loam", "Canal + borewell", 18000, 92, "Rice, chillies", "High-water-retention block with road access and verified ownership documents.", "Landowner"),
    ("Vegetable Growth Cluster", "Mysuru Fringe, Karnataka", 2.2, "Red sandy loam", "Drip-ready", 26000, 88, "Tomato, beans, marigold", "Near-city plot designed for intensive seasonal vegetables and smart irrigation.", "Landowner"),
    ("Urban Weekend Farm", "Hyderabad Outer Ring, Telangana", 1.5, "Organic-balanced mix", "Automated micro-irrigation", 32000, 95, "Leafy greens, herbs", "Managed farm setup for part-time growers who want supervised production.", "Urban Farmer"),
    ("Cotton and Pulses Belt", "Warangal, Telangana", 6.0, "Black cotton soil", "Borewell + rain capture", 21000, 90, "Cotton, red gram", "Larger-acreage lease with proven seasonal productivity and equipment access nearby.", "Tenant Farmer"),
]

TENANT_SEED = [
    ("Ravi Kumar", "Nalgonda, Telangana", "Paddy, maize, chilli", 11, 4.8, "Seeks 4-8 acres with irrigation", "Uses input planning, crop rotation, and weekly digital reporting for landowners.", "Available"),
    ("Meghana Farms Collective", "Mandya, Karnataka", "Vegetables, floriculture", 7, 4.9, "Seeks peri-urban plots near Bengaluru or Mysuru", "Women-led operator team with drip irrigation experience and contract-farming discipline.", "Available"),
    ("Arjun Reddy", "Hyderabad, Telangana", "Protected cultivation, herbs", 5, 4.7, "Seeks 1-3 acres near metro", "Part-time urban farmer backed by agronomist support and supervised farm labor.", "Available"),
    ("Shreya Agro Ventures", "Guntur, Andhra Pradesh", "Seed production, pulses", 9, 4.6, "Seeks long-term lease with storage access", "Experienced team focused on timely payments, soil regeneration, and documented farming practices.", "Interviewing"),
]

INQUIRY_SEED = [
    ("Suresh Naik", "9876543210", "Nizamabad", "Landowner", "Wants verified tenant shortlist for 3-acre turmeric land."),
    ("Pallavi Shah", "9988776655", "Bengaluru", "Urban Farmer", "Looking for managed farm close to the city for weekend cultivation."),
]

USER_SEED = [
    ("Nisha Reddy", "landowner@kinta.in", "9000000001", "Hyderabad", "Landowner", "kinta123"),
    ("Ravi Kumar", "tenant@kinta.in", "9000000002", "Nalgonda", "Tenant Farmer", "kinta123"),
    ("Meera Shah", "partner@kinta.in", "9000000003", "Bengaluru", "Agri Partner", "kinta123"),
]

MATCH_SEED = [
    (1, 1, "Suresh Naik", "9876543210", "landowner@kinta.in", "Landowner", "Initial shortlist for irrigated turmeric land.", "Reviewing"),
    (3, 3, "Pallavi Shah", "9988776655", "partner@kinta.in", "Urban Farmer", "Exploring supervised urban-farm expansion.", "Pending"),
]


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def _pbkdf2_digest(raw_value, salt, iterations):
    return hashlib.pbkdf2_hmac("sha256", raw_value.encode("utf-8"), salt.encode("utf-8"), iterations).hex()


def hash_password(raw_value, salt=None, iterations=PASSWORD_ITERATIONS):
    resolved_salt = salt or secrets.token_hex(16)
    digest = _pbkdf2_digest(raw_value, resolved_salt, iterations)
    return f"{PASSWORD_ALGORITHM}${iterations}${resolved_salt}${digest}"


def verify_password(raw_value, stored_hash):
    if not stored_hash:
        return False, None

    parts = stored_hash.split("$")
    if len(parts) == 4 and parts[0] == PASSWORD_ALGORITHM:
        _, iterations_text, salt, expected_digest = parts
        try:
            iterations = int(iterations_text)
        except ValueError:
            return False, None
        actual_digest = _pbkdf2_digest(raw_value, salt, iterations)
        return hmac.compare_digest(actual_digest, expected_digest), None

    legacy_digest = hashlib.sha256(raw_value.encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy_digest, stored_hash):
        return True, hash_password(raw_value)

    return False, None


def dict_rows(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def serialize_metric_value(value):
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_database():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            city TEXT NOT NULL,
            role TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS land_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            location TEXT NOT NULL,
            acres REAL NOT NULL,
            soil TEXT NOT NULL,
            irrigation TEXT NOT NULL,
            price INTEGER NOT NULL,
            trust_score INTEGER NOT NULL,
            crops TEXT NOT NULL,
            summary TEXT NOT NULL,
            best_for TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tenant_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            base_location TEXT NOT NULL,
            specializations TEXT NOT NULL,
            experience_years INTEGER NOT NULL,
            rating REAL NOT NULL,
            lease_interest TEXT NOT NULL,
            bio TEXT NOT NULL,
            availability TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            city TEXT NOT NULL,
            interest TEXT NOT NULL,
            notes TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS match_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            land_id INTEGER NOT NULL,
            tenant_id INTEGER NOT NULL,
            requester_name TEXT NOT NULL,
            requester_phone TEXT NOT NULL,
            requester_email TEXT NOT NULL,
            requester_role TEXT NOT NULL,
            notes TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )

    cursor.execute(
        "INSERT OR IGNORE INTO admins (email, password_hash, created_at) VALUES (?, ?, ?)",
        (ADMIN_EMAIL, hash_password(ADMIN_PASSWORD), utc_now()),
    )

    if cursor.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"] == 0:
        cursor.executemany(
            "INSERT INTO users (name, email, phone, city, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [(name, email, phone, city, role, hash_password(password), utc_now()) for name, email, phone, city, role, password in USER_SEED],
        )

    if cursor.execute("SELECT COUNT(*) AS count FROM land_listings").fetchone()["count"] == 0:
        cursor.executemany(
            "INSERT INTO land_listings (title, location, acres, soil, irrigation, price, trust_score, crops, summary, best_for, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [entry + (utc_now(),) for entry in LAND_SEED],
        )

    if cursor.execute("SELECT COUNT(*) AS count FROM tenant_profiles").fetchone()["count"] == 0:
        cursor.executemany(
            "INSERT INTO tenant_profiles (name, base_location, specializations, experience_years, rating, lease_interest, bio, availability, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [entry + (utc_now(),) for entry in TENANT_SEED],
        )

    if cursor.execute("SELECT COUNT(*) AS count FROM inquiries").fetchone()["count"] == 0:
        cursor.executemany(
            "INSERT INTO inquiries (name, phone, city, interest, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [entry + (utc_now(),) for entry in INQUIRY_SEED],
        )

    if cursor.execute("SELECT COUNT(*) AS count FROM match_requests").fetchone()["count"] == 0:
        cursor.executemany(
            "INSERT INTO match_requests (land_id, tenant_id, requester_name, requester_phone, requester_email, requester_role, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [entry + (utc_now(),) for entry in MATCH_SEED],
        )

    connection.commit()
    connection.close()
