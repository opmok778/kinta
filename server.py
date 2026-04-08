from http.server import ThreadingHTTPServer

from backend.data import HOST, PORT, ensure_database
from backend.handler import KintaRequestHandler


if __name__ == "__main__":
    ensure_database()
    server = ThreadingHTTPServer((HOST, PORT), KintaRequestHandler)
    print(f"KINTA server running on http://{HOST}:{PORT}")
    server.serve_forever()
