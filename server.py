import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "portfolio.sqlite3"


def initialize_database():
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS portfolio (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL DEFAULT '',
                bio TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                location TEXT NOT NULL DEFAULT '',
                profile_image TEXT NOT NULL DEFAULT ''
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT ''
            )"""
        )
        connection.execute("INSERT OR IGNORE INTO portfolio (id) VALUES (1)")


class PortfolioHandler(SimpleHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/api/portfolio":
            return super().do_GET()

        with sqlite3.connect(DATABASE_PATH) as connection:
            connection.row_factory = sqlite3.Row
            profile = dict(connection.execute("SELECT * FROM portfolio WHERE id = 1").fetchone())
            projects = connection.execute(
                "SELECT id, title, description AS desc FROM projects ORDER BY rowid"
            ).fetchall()

        self.send_json(200, {
            "name": profile["name"],
            "role": profile["role"],
            "bio": profile["bio"],
            "email": profile["email"],
            "location": profile["location"],
            "profileImage": profile["profile_image"],
            "projects": [dict(project) for project in projects],
        })

    def do_PUT(self):
        if self.path != "/api/portfolio":
            return self.send_json(404, {"error": "Not found"})

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length > 20 * 1024 * 1024:
                return self.send_json(413, {"error": "Portfolio is too large"})
            data = json.loads(self.rfile.read(content_length))
            projects = data.get("projects", [])
            if not isinstance(projects, list):
                return self.send_json(400, {"error": "Projects must be a list"})

            with sqlite3.connect(DATABASE_PATH) as connection:
                connection.execute(
                    """UPDATE portfolio SET name = ?, role = ?, bio = ?, email = ?,
                        location = ?, profile_image = ? WHERE id = 1""",
                    tuple(data.get(field, "") for field in (
                        "name", "role", "bio", "email", "location", "profileImage"
                    )),
                )
                connection.execute("DELETE FROM projects")
                connection.executemany(
                    "INSERT INTO projects (id, title, description) VALUES (?, ?, ?)",
                    [
                        (int(project["id"]), str(project.get("title", "")), str(project.get("desc", "")))
                        for project in projects
                    ],
                )
            self.send_json(200, {"saved": True})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})


if __name__ == "__main__":
    initialize_database()
    server = ThreadingHTTPServer(("127.0.0.1", 8000), PortfolioHandler)
    print("Portfolio Generator running at http://127.0.0.1:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()