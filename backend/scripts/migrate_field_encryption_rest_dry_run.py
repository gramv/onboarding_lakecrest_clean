"""
REST-based dry-run: scan Supabase tables for legacy/plaintext sensitive fields without writes.

- No asyncpg or supabase client dependency; uses urllib to call PostgREST.
- Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from backend/.env (simple parser).
"""

import os
import json
import logging
from typing import Dict, Any, List, Tuple
from urllib import request, parse, error

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(BACKEND_DIR, ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_env_simple(path: str) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not os.path.exists(path):
        return env
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            env[k] = v
    return env


def fetch_rows(base_url: str, service_key: str, table: str, select: str, limit: int, offset: int) -> List[Dict[str, Any]]:
    qs = parse.urlencode({"select": select, "limit": str(limit), "offset": str(offset)})
    url = f"{base_url}/rest/v1/{table}?{qs}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
        "Prefer": "count=exact"
    }
    req = request.Request(url, headers=headers, method="GET")
    try:
        with request.urlopen(req, timeout=30) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except error.HTTPError as he:
        logger.error(f"HTTP {he.code} for {table}: {he.read().decode('utf-8', 'ignore')}")
        return []
    except Exception as e:
        logger.error(f"Request failed for {table}: {e}")
        return []


def classify_value(value: Any) -> str:
    # Returns one of: aes_json, fernet, plaintext, empty, other
    if value is None or value == "":
        return "empty"
    if isinstance(value, dict):
        if "v" in value and "c" in value and "t" in value and "s" in value and "n" in value:
            return "aes_json"
        return "other"
    if isinstance(value, str):
        if value.startswith("gAAAA"):
            return "fernet"
        if value.startswith("{") and value.endswith("}"):
            try:
                obj = json.loads(value)
                if isinstance(obj, dict) and all(k in obj for k in ("v","c","t","s","n")):
                    return "aes_json"
            except Exception:
                pass
        return "plaintext"
    return "other"


def scan_table(base_url: str, service_key: str, table: str, id_col: str, fields: List[str], batch_size: int = 200) -> Dict[str, int]:
    counts = {"rows": 0, "aes_json": 0, "fernet": 0, "plaintext": 0, "empty": 0, "other": 0}
    offset = 0
    while True:
        rows = fetch_rows(base_url, service_key, table, select=f"{id_col}," + ",".join(fields), limit=batch_size, offset=offset)
        if not rows:
            break
        for row in rows:
            counts["rows"] += 1
            for f in fields:
                cls = classify_value(row.get(f))
                counts[cls] = counts.get(cls, 0) + 1
        offset += batch_size
        if len(rows) < batch_size:
            break
    return counts


def main() -> None:
    env = load_env_simple(ENV_PATH)
    base_url = env.get("SUPABASE_URL")
    service_key = env.get("SUPABASE_SERVICE_KEY")
    if not base_url or not service_key:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_KEY must be present in backend/.env for REST dry-run")

    targets: List[Tuple[str, str, List[str]]] = [
        ("employees", "id", ["ssn"]),
        ("job_applications", "id", ["ssn"]),
    ]

    summary: Dict[str, Dict[str, int]] = {}
    for table, id_col, fields in targets:
        logger.info(f"Scanning {table} for fields {fields} (dry-run)")
        counts = scan_table(base_url, service_key, table, id_col, fields, batch_size=200)
        summary[table] = counts

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()


