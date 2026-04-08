import json
import secrets
import sqlite3
from http import cookies
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .data import (
    ACTIVE_ADMIN_SESSIONS,
    ACTIVE_USER_SESSIONS,
    ADMIN_SESSION_COOKIE,
    PUBLIC_DIR,
    USER_SESSION_COOKIE,
    dict_rows,
    get_connection,
    hash_password,
    verify_password,
    serialize_metric_value,
    utc_now,
)


class KintaRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200, extra_headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        if extra_headers:
            for name, value in extra_headers.items():
                self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, file_path: Path):
        if not file_path.exists() or not file_path.is_file():
            self._send_json({"error": "Not found"}, status=404)
            return

        content_type = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".ico": "image/x-icon",
        }.get(file_path.suffix.lower(), "application/octet-stream")
        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.end_headers()
        self.wfile.write(content)

    def _parse_json_body(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _cookies(self):
        parsed = cookies.SimpleCookie()
        parsed.load(self.headers.get("Cookie", ""))
        return parsed

    def _path_parts(self):
        return [part for part in self.path.split("?", 1)[0].strip("/").split("/") if part]

    def _cookie_header(self, cookie_name, token_value=None):
        jar = cookies.SimpleCookie()
        jar[cookie_name] = token_value or ""
        jar[cookie_name]["path"] = "/"
        jar[cookie_name]["httponly"] = True
        jar[cookie_name]["samesite"] = "Lax"
        if not token_value:
            jar[cookie_name]["expires"] = "Thu, 01 Jan 1970 00:00:00 GMT"
        return jar.output(header="").strip()

    def _current_admin_session(self):
        jar = self._cookies()
        if ADMIN_SESSION_COOKIE not in jar:
            return None
        return ACTIVE_ADMIN_SESSIONS.get(jar[ADMIN_SESSION_COOKIE].value)

    def _current_user_session(self):
        jar = self._cookies()
        if USER_SESSION_COOKIE not in jar:
            return None
        return ACTIVE_USER_SESSIONS.get(jar[USER_SESSION_COOKIE].value)

    def _require_admin(self):
        session = self._current_admin_session()
        if not session:
            self._send_json({"error": "Unauthorized"}, status=401)
            return None
        return session

    def _land_detail_payload(self, land_id):
        connection = get_connection()
        land = connection.execute(
            "SELECT id, title, location, acres, soil, irrigation, price, trust_score, crops, summary, best_for, created_at FROM land_listings WHERE id = ?",
            (land_id,),
        ).fetchone()
        if not land:
            connection.close()
            return None

        recommended_tenants = dict_rows(
            connection.execute(
                "SELECT id, name, base_location, specializations, experience_years, rating, lease_interest, bio, availability FROM tenant_profiles ORDER BY CASE WHEN availability = 'Available' THEN 0 ELSE 1 END, rating DESC, experience_years DESC LIMIT 4"
            )
        )
        recent_matches = dict_rows(
            connection.execute(
                """
                SELECT mr.id, mr.requester_name, mr.requester_role, mr.status, mr.notes, mr.created_at, tp.name AS tenant_name
                FROM match_requests mr
                JOIN tenant_profiles tp ON tp.id = mr.tenant_id
                WHERE mr.land_id = ?
                ORDER BY mr.id DESC
                LIMIT 5
                """,
                (land_id,),
            )
        )
        connection.close()
        return {"listing": dict(land), "recommendedTenants": recommended_tenants, "recentMatches": recent_matches}

    def _tenant_detail_payload(self, tenant_id):
        connection = get_connection()
        tenant = connection.execute(
            "SELECT id, name, base_location, specializations, experience_years, rating, lease_interest, bio, availability, created_at FROM tenant_profiles WHERE id = ?",
            (tenant_id,),
        ).fetchone()
        if not tenant:
            connection.close()
            return None

        recommended_lands = dict_rows(
            connection.execute(
                "SELECT id, title, location, acres, soil, irrigation, price, trust_score, crops, summary, best_for FROM land_listings ORDER BY trust_score DESC, id DESC LIMIT 4"
            )
        )
        recent_matches = dict_rows(
            connection.execute(
                """
                SELECT mr.id, mr.requester_name, mr.requester_role, mr.status, mr.notes, mr.created_at, ll.title AS land_title
                FROM match_requests mr
                JOIN land_listings ll ON ll.id = mr.land_id
                WHERE mr.tenant_id = ?
                ORDER BY mr.id DESC
                LIMIT 5
                """,
                (tenant_id,),
            )
        )
        connection.close()
        return {"tenant": dict(tenant), "recommendedLands": recommended_lands, "recentMatches": recent_matches}

    def _dashboard_payload(self):
        connection = get_connection()
        cursor = connection.cursor()
        summary = cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM land_listings) AS land_count,
                (SELECT COUNT(*) FROM tenant_profiles) AS tenant_count,
                (SELECT COUNT(*) FROM inquiries) AS inquiry_count,
                (SELECT COUNT(*) FROM match_requests) AS match_count,
                (SELECT COUNT(*) FROM users) AS user_count,
                (SELECT ROUND(AVG(trust_score), 1) FROM land_listings) AS avg_trust_score
            """
        ).fetchone()
        inquiries = dict_rows(cursor.execute("SELECT id, name, phone, city, interest, notes, created_at FROM inquiries ORDER BY id DESC LIMIT 8"))
        matches = dict_rows(
            cursor.execute(
                """
                SELECT mr.id, mr.requester_name, mr.requester_role, mr.status, mr.notes, mr.created_at, ll.title AS land_title, tp.name AS tenant_name
                FROM match_requests mr
                JOIN land_listings ll ON ll.id = mr.land_id
                JOIN tenant_profiles tp ON tp.id = mr.tenant_id
                ORDER BY mr.id DESC
                LIMIT 8
                """
            )
        )
        users = dict_rows(cursor.execute("SELECT id, name, email, city, role, created_at FROM users ORDER BY id DESC LIMIT 8"))
        lands = dict_rows(cursor.execute("SELECT id, title, location, acres, soil, irrigation, price, trust_score, crops, summary, best_for FROM land_listings ORDER BY id DESC LIMIT 12"))
        tenants = dict_rows(cursor.execute("SELECT id, name, base_location, specializations, experience_years, rating, lease_interest, bio, availability FROM tenant_profiles ORDER BY id DESC LIMIT 12"))
        connection.close()
        return {
            "summary": {
                "landCount": summary["land_count"],
                "tenantCount": summary["tenant_count"],
                "inquiryCount": summary["inquiry_count"],
                "matchCount": summary["match_count"],
                "userCount": summary["user_count"],
                "avgTrustScore": serialize_metric_value(summary["avg_trust_score"] or 0),
            },
            "recentInquiries": inquiries,
            "recentMatches": matches,
            "latestUsers": users,
            "manageableLands": lands,
            "manageableTenants": tenants,
        }

    def _public_overview(self):
        connection = get_connection()
        stats = connection.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM land_listings) AS land_count,
                (SELECT COUNT(*) FROM tenant_profiles) AS tenant_count,
                (SELECT COUNT(DISTINCT location) FROM land_listings) AS markets,
                (SELECT COUNT(*) FROM users) AS user_count,
                (SELECT COUNT(*) FROM match_requests) AS match_count,
                (SELECT ROUND(AVG(trust_score), 1) FROM land_listings) AS avg_trust_score
            """
        ).fetchone()
        connection.close()
        return {
            "metrics": {
                "landListings": f"{stats['land_count']}+",
                "tenantProfiles": f"{stats['tenant_count']}+",
                "activeMarkets": f"{stats['markets']}",
                "registeredUsers": f"{stats['user_count']}",
                "matchRequests": f"{stats['match_count']}",
                "avgTrustScore": f"{serialize_metric_value(stats['avg_trust_score'] or 0)}/100",
            }
        }

    def _list_lands(self, query):
        location = query.get("location", [""])[0].strip().lower()
        best_for = query.get("best_for", [""])[0].strip().lower()
        sql = "SELECT id, title, location, acres, soil, irrigation, price, trust_score, crops, summary, best_for FROM land_listings WHERE 1=1"
        params = []
        if location:
            sql += " AND LOWER(location) LIKE ?"
            params.append(f"%{location}%")
        if best_for:
            sql += " AND LOWER(best_for) LIKE ?"
            params.append(f"%{best_for}%")
        sql += " ORDER BY trust_score DESC, id DESC"
        connection = get_connection()
        rows = dict_rows(connection.execute(sql, params))
        connection.close()
        return {"listings": rows}

    def _list_tenants(self, query):
        location = query.get("location", [""])[0].strip().lower()
        availability = query.get("availability", [""])[0].strip().lower()
        sql = "SELECT id, name, base_location, specializations, experience_years, rating, lease_interest, bio, availability FROM tenant_profiles WHERE 1=1"
        params = []
        if location:
            sql += " AND LOWER(base_location) LIKE ?"
            params.append(f"%{location}%")
        if availability:
            sql += " AND LOWER(availability) = ?"
            params.append(availability)
        sql += " ORDER BY rating DESC, experience_years DESC, id DESC"
        connection = get_connection()
        rows = dict_rows(connection.execute(sql, params))
        connection.close()
        return {"tenants": rows}

    def _upsert_land(self, payload, land_id=None):
        required = ("title", "location", "acres", "soil", "irrigation", "price", "trust_score", "crops", "summary", "best_for")
        missing = [field for field in required if str(payload.get(field, "")).strip() == ""]
        if missing:
            self._send_json({"error": "Missing required fields", "missing": missing}, status=400)
            return

        values = (
            str(payload["title"]).strip(),
            str(payload["location"]).strip(),
            float(payload["acres"]),
            str(payload["soil"]).strip(),
            str(payload["irrigation"]).strip(),
            int(payload["price"]),
            int(payload["trust_score"]),
            str(payload["crops"]).strip(),
            str(payload["summary"]).strip(),
            str(payload["best_for"]).strip(),
        )
        connection = get_connection()
        cursor = connection.cursor()
        if land_id is None:
            cursor.execute(
                "INSERT INTO land_listings (title, location, acres, soil, irrigation, price, trust_score, crops, summary, best_for, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values + (utc_now(),),
            )
            result_id, message, status = cursor.lastrowid, "Land listing added", 201
        else:
            existing = cursor.execute("SELECT id FROM land_listings WHERE id = ?", (land_id,)).fetchone()
            if not existing:
                connection.close()
                self._send_json({"error": "Land listing not found"}, status=404)
                return
            cursor.execute(
                "UPDATE land_listings SET title = ?, location = ?, acres = ?, soil = ?, irrigation = ?, price = ?, trust_score = ?, crops = ?, summary = ?, best_for = ? WHERE id = ?",
                values + (land_id,),
            )
            result_id, message, status = land_id, "Land listing updated", 200
        connection.commit()
        connection.close()
        self._send_json({"message": message, "id": result_id}, status=status)

    def _upsert_tenant(self, payload, tenant_id=None):
        required = ("name", "base_location", "specializations", "experience_years", "rating", "lease_interest", "bio", "availability")
        missing = [field for field in required if str(payload.get(field, "")).strip() == ""]
        if missing:
            self._send_json({"error": "Missing required fields", "missing": missing}, status=400)
            return

        values = (
            str(payload["name"]).strip(),
            str(payload["base_location"]).strip(),
            str(payload["specializations"]).strip(),
            int(payload["experience_years"]),
            float(payload["rating"]),
            str(payload["lease_interest"]).strip(),
            str(payload["bio"]).strip(),
            str(payload["availability"]).strip(),
        )
        connection = get_connection()
        cursor = connection.cursor()
        if tenant_id is None:
            cursor.execute(
                "INSERT INTO tenant_profiles (name, base_location, specializations, experience_years, rating, lease_interest, bio, availability, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values + (utc_now(),),
            )
            result_id, message, status = cursor.lastrowid, "Tenant profile added", 201
        else:
            existing = cursor.execute("SELECT id FROM tenant_profiles WHERE id = ?", (tenant_id,)).fetchone()
            if not existing:
                connection.close()
                self._send_json({"error": "Tenant profile not found"}, status=404)
                return
            cursor.execute(
                "UPDATE tenant_profiles SET name = ?, base_location = ?, specializations = ?, experience_years = ?, rating = ?, lease_interest = ?, bio = ?, availability = ? WHERE id = ?",
                values + (tenant_id,),
            )
            result_id, message, status = tenant_id, "Tenant profile updated", 200
        connection.commit()
        connection.close()
        self._send_json({"message": message, "id": result_id}, status=status)

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        parts = self._path_parts()

        if parsed.path == "/api/overview":
            self._send_json(self._public_overview())
            return
        if parsed.path == "/api/health":
            self._send_json({"status": "ok", "timestamp": utc_now()})
            return
        if parsed.path == "/api/lands":
            self._send_json(self._list_lands(query))
            return
        if parsed.path == "/api/tenants":
            self._send_json(self._list_tenants(query))
            return
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "lands" and parts[2].isdigit():
            payload = self._land_detail_payload(int(parts[2]))
            self._send_json(payload if payload else {"error": "Land listing not found"}, status=200 if payload else 404)
            return
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "tenants" and parts[2].isdigit():
            payload = self._tenant_detail_payload(int(parts[2]))
            self._send_json(payload if payload else {"error": "Tenant profile not found"}, status=200 if payload else 404)
            return
        if parsed.path == "/api/inquiries":
            connection = get_connection()
            inquiries = dict_rows(connection.execute("SELECT id, name, phone, city, interest, notes, created_at FROM inquiries ORDER BY id DESC"))
            connection.close()
            self._send_json({"submissions": inquiries})
            return
        if parsed.path == "/api/auth/session":
            session = self._current_user_session()
            self._send_json({"authenticated": bool(session), "user": session})
            return
        if parsed.path == "/api/admin/session":
            session = self._current_admin_session()
            self._send_json({"authenticated": bool(session), "admin": session})
            return
        if parsed.path == "/api/admin/dashboard":
            if not self._require_admin():
                return
            self._send_json(self._dashboard_payload())
            return

        relative_path = "index.html" if parsed.path in ("", "/") else parsed.path.lstrip("/")
        target = (PUBLIC_DIR / relative_path).resolve()
        if PUBLIC_DIR.resolve() not in target.parents and target != PUBLIC_DIR.resolve():
            self._send_json({"error": "Forbidden"}, status=403)
            return
        self._serve_file(target)

    def do_POST(self):
        parsed = urlparse(self.path)
        parts = self._path_parts()
        try:
            payload = self._parse_json_body()
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON payload"}, status=400)
            return

        if parsed.path == "/api/inquiries":
            missing = [field for field in ("name", "phone", "interest") if not str(payload.get(field, "")).strip()]
            if missing:
                self._send_json({"error": "Missing required fields", "missing": missing}, status=400)
                return
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute(
                "INSERT INTO inquiries (name, phone, city, interest, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (str(payload.get("name", "")).strip(), str(payload.get("phone", "")).strip(), str(payload.get("city", "")).strip(), str(payload.get("interest", "")).strip(), str(payload.get("notes", "")).strip(), utc_now()),
            )
            connection.commit()
            connection.close()
            self._send_json({"message": "Inquiry received"}, status=201)
            return

        if parsed.path == "/api/matches":
            current_user = self._current_user_session() or {}
            requester_name = str(payload.get("requester_name", "")).strip() or current_user.get("name", "")
            requester_phone = str(payload.get("requester_phone", "")).strip() or current_user.get("phone", "")
            requester_email = str(payload.get("requester_email", "")).strip() or current_user.get("email", "")
            requester_role = str(payload.get("requester_role", "")).strip() or current_user.get("role", "")
            land_id = int(payload.get("land_id", 0) or 0)
            tenant_id = int(payload.get("tenant_id", 0) or 0)
            missing = []
            if not land_id:
                missing.append("land_id")
            if not tenant_id:
                missing.append("tenant_id")
            if not requester_name:
                missing.append("requester_name")
            if not requester_phone:
                missing.append("requester_phone")
            if not requester_role:
                missing.append("requester_role")
            if missing:
                self._send_json({"error": "Missing required fields", "missing": missing}, status=400)
                return

            connection = get_connection()
            cursor = connection.cursor()
            land = cursor.execute("SELECT id FROM land_listings WHERE id = ?", (land_id,)).fetchone()
            tenant = cursor.execute("SELECT id FROM tenant_profiles WHERE id = ?", (tenant_id,)).fetchone()
            if not land or not tenant:
                connection.close()
                self._send_json({"error": "Selected land or tenant does not exist"}, status=400)
                return
            cursor.execute(
                "INSERT INTO match_requests (land_id, tenant_id, requester_name, requester_phone, requester_email, requester_role, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (land_id, tenant_id, requester_name, requester_phone, requester_email, requester_role, str(payload.get("notes", "")).strip(), "Pending", utc_now()),
            )
            connection.commit()
            connection.close()
            self._send_json({"message": "Match request submitted"}, status=201)
            return

        if parsed.path == "/api/auth/register":
            required = ("name", "email", "phone", "city", "role", "password")
            missing = [field for field in required if not str(payload.get(field, "")).strip()]
            if missing:
                self._send_json({"error": "Missing required fields", "missing": missing}, status=400)
                return
            email = str(payload["email"]).strip().lower()
            connection = get_connection()
            cursor = connection.cursor()
            try:
                cursor.execute(
                    "INSERT INTO users (name, email, phone, city, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (str(payload["name"]).strip(), email, str(payload["phone"]).strip(), str(payload["city"]).strip(), str(payload["role"]).strip(), hash_password(str(payload["password"]).strip()), utc_now()),
                )
            except sqlite3.IntegrityError:
                connection.close()
                self._send_json({"error": "An account with this email already exists"}, status=409)
                return
            user_id = cursor.lastrowid
            row = cursor.execute("SELECT id, name, email, phone, city, role FROM users WHERE id = ?", (user_id,)).fetchone()
            connection.commit()
            connection.close()
            session_payload = dict(row)
            token = secrets.token_hex(24)
            ACTIVE_USER_SESSIONS[token] = session_payload
            self._send_json({"message": "Account created", "user": session_payload}, status=201, extra_headers={"Set-Cookie": self._cookie_header(USER_SESSION_COOKIE, token)})
            return

        if parsed.path == "/api/auth/login":
            email = str(payload.get("email", "")).strip().lower()
            raw_password = str(payload.get("password", "")).strip()
            connection = get_connection()
            row = connection.execute("SELECT id, name, email, phone, city, role, password_hash FROM users WHERE email = ?", (email,)).fetchone()
            if not row:
                connection.close()
                self._send_json({"error": "Invalid credentials"}, status=401)
                return
            is_valid, replacement_hash = verify_password(raw_password, row["password_hash"])
            if not is_valid:
                connection.close()
                self._send_json({"error": "Invalid credentials"}, status=401)
                return
            if replacement_hash:
                connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", (replacement_hash, row["id"]))
                connection.commit()
            session_payload = {key: row[key] for key in ("id", "name", "email", "phone", "city", "role")}
            connection.close()
            token = secrets.token_hex(24)
            ACTIVE_USER_SESSIONS[token] = session_payload
            self._send_json({"message": "User login successful", "user": session_payload}, extra_headers={"Set-Cookie": self._cookie_header(USER_SESSION_COOKIE, token)})
            return

        if parsed.path == "/api/auth/logout":
            jar = self._cookies()
            if USER_SESSION_COOKIE in jar:
                ACTIVE_USER_SESSIONS.pop(jar[USER_SESSION_COOKIE].value, None)
            self._send_json({"message": "Logged out"}, extra_headers={"Set-Cookie": self._cookie_header(USER_SESSION_COOKIE)})
            return

        if parsed.path == "/api/admin/login":
            email = str(payload.get("email", "")).strip().lower()
            raw_password = str(payload.get("password", "")).strip()
            connection = get_connection()
            row = connection.execute("SELECT id, email, password_hash FROM admins WHERE email = ?", (email,)).fetchone()
            if not row:
                connection.close()
                self._send_json({"error": "Invalid credentials"}, status=401)
                return
            is_valid, replacement_hash = verify_password(raw_password, row["password_hash"])
            if not is_valid:
                connection.close()
                self._send_json({"error": "Invalid credentials"}, status=401)
                return
            if replacement_hash:
                connection.execute("UPDATE admins SET password_hash = ? WHERE id = ?", (replacement_hash, row["id"]))
                connection.commit()
            session_payload = {"email": email}
            connection.close()
            token = secrets.token_hex(24)
            ACTIVE_ADMIN_SESSIONS[token] = session_payload
            self._send_json({"message": "Login successful", "admin": session_payload}, extra_headers={"Set-Cookie": self._cookie_header(ADMIN_SESSION_COOKIE, token)})
            return

        if parsed.path == "/api/admin/logout":
            jar = self._cookies()
            if ADMIN_SESSION_COOKIE in jar:
                ACTIVE_ADMIN_SESSIONS.pop(jar[ADMIN_SESSION_COOKIE].value, None)
            self._send_json({"message": "Logged out"}, extra_headers={"Set-Cookie": self._cookie_header(ADMIN_SESSION_COOKIE)})
            return

        if parsed.path == "/api/admin/lands":
            if not self._require_admin():
                return
            self._upsert_land(payload)
            return

        if parsed.path == "/api/admin/tenants":
            if not self._require_admin():
                return
            self._upsert_tenant(payload)
            return

        if len(parts) == 4 and parts[:3] == ["api", "admin", "matches"] and parts[3].isdigit():
            if not self._require_admin():
                return
            status_value = str(payload.get("status", "")).strip()
            if not status_value:
                self._send_json({"error": "Missing required fields", "missing": ["status"]}, status=400)
                return
            connection = get_connection()
            cursor = connection.cursor()
            updated = cursor.execute("UPDATE match_requests SET status = ? WHERE id = ?", (status_value, int(parts[3]))).rowcount
            connection.commit()
            connection.close()
            self._send_json({"message": "Match request updated"} if updated else {"error": "Match request not found"}, status=200 if updated else 404)
            return

        self._send_json({"error": "Not found"}, status=404)

    def do_PUT(self):
        parts = self._path_parts()
        if not self._require_admin():
            return
        try:
            payload = self._parse_json_body()
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON payload"}, status=400)
            return

        if len(parts) == 4 and parts[:3] == ["api", "admin", "lands"] and parts[3].isdigit():
            self._upsert_land(payload, int(parts[3]))
            return
        if len(parts) == 4 and parts[:3] == ["api", "admin", "tenants"] and parts[3].isdigit():
            self._upsert_tenant(payload, int(parts[3]))
            return
        self._send_json({"error": "Not found"}, status=404)

    def do_DELETE(self):
        parts = self._path_parts()
        if not self._require_admin():
            return
        connection = get_connection()
        cursor = connection.cursor()

        if len(parts) == 4 and parts[:3] == ["api", "admin", "lands"] and parts[3].isdigit():
            deleted = cursor.execute("DELETE FROM land_listings WHERE id = ?", (int(parts[3]),)).rowcount
            connection.commit()
            connection.close()
            self._send_json({"message": "Land listing deleted"} if deleted else {"error": "Land listing not found"}, status=200 if deleted else 404)
            return

        if len(parts) == 4 and parts[:3] == ["api", "admin", "tenants"] and parts[3].isdigit():
            deleted = cursor.execute("DELETE FROM tenant_profiles WHERE id = ?", (int(parts[3]),)).rowcount
            connection.commit()
            connection.close()
            self._send_json({"message": "Tenant profile deleted"} if deleted else {"error": "Tenant profile not found"}, status=200 if deleted else 404)
            return

        connection.close()
        self._send_json({"error": "Not found"}, status=404)

    def log_message(self, format, *args):
        return
