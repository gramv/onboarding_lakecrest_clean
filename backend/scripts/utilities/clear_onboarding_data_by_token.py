#!/usr/bin/env python3
"""
Clear all onboarding-related saved data for a specific onboarding token (employee) from Supabase (Heroku DB).

Usage:
  python3 clear_onboarding_data_by_token.py --token <ONBOARDING_TOKEN> \
      [--database-url $DATABASE_URL] [--dry-run]

Notes:
- This script deletes rows tied to the employee in these tables (if they exist):
  i9_forms, i9_section2_documents, w4_forms, signed_documents, onboarding_form_data
- It does NOT touch storage buckets; only DB rows are removed.
- It does NOT modify employees table or progress fields.
"""

import argparse
import base64
import json
import os
import sys
from typing import Optional

import psycopg2


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verifying signature."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            raise ValueError("Invalid token format")
        payload_b64 = parts[1]
        # Pad base64 string
        padding = '=' * (-len(payload_b64) % 4)
        decoded = base64.urlsafe_b64decode(payload_b64 + padding)
        return json.loads(decoded)
    except Exception as e:
        raise RuntimeError(f"Failed to decode token payload: {e}")


def _get_employee_id_from_token(token: str) -> str:
    payload = _decode_jwt_payload(token)
    employee_id = payload.get("employee_id")
    if not employee_id:
        raise RuntimeError("Token payload missing 'employee_id'")
    return employee_id


def clear_employee_data(conn, employee_id: str, dry_run: bool = False):
    """Delete rows for the given employee_id from onboarding-related tables."""
    cursor = conn.cursor()

    statements = [
        ("DELETE FROM i9_section2_documents WHERE employee_id = %s", (employee_id,)),
        ("DELETE FROM i9_forms WHERE employee_id = %s", (employee_id,)),
        ("DELETE FROM w4_forms WHERE employee_id = %s", (employee_id,)),
        (
            "DELETE FROM signed_documents WHERE employee_id = %s AND document_type IN (%s, %s, %s)",
            (employee_id, "company_policies", "i9_complete", "w4_form"),
        ),
        ("DELETE FROM onboarding_form_data WHERE employee_id = %s", (employee_id,)),
    ]

    totals = {}

    if dry_run:
        print("[DRY-RUN] Would execute deletes for employee_id=", employee_id)
        for sql, params in statements:
            print("[DRY-RUN] ", sql, params)
        return totals

    # Execute each delete and record counts where possible
    for sql, params in statements:
        try:
            cursor.execute(sql, params)
            # Some drivers support rowcount after delete
            totals[sql] = cursor.rowcount
        except Exception as e:
            # Continue if table missing; script is resilient to absent tables
            print(f"Warning: Failed '{sql}': {e}")

    cursor.close()
    return totals


def main():
    parser = argparse.ArgumentParser(description="Clear onboarding DB data for a given token")
    parser.add_argument("--token", required=True, help="Onboarding token from the URL")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="Postgres connection string (defaults to $DATABASE_URL)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print planned deletes only")
    args = parser.parse_args()

    if not args.database_url:
        print("Error: DATABASE_URL is required (pass --database-url or set env)")
        sys.exit(1)

    try:
        employee_id = _get_employee_id_from_token(args.token)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

    print(f"Target employee_id: {employee_id}")
    try:
        # Ensure SSL for Supabase connections
        db_url = args.database_url
        if "sslmode=" not in db_url:
            if "?" in db_url:
                db_url = db_url + "&sslmode=require"
            else:
                db_url = db_url + "?sslmode=require"
        conn = psycopg2.connect(db_url)
        # Avoid aborting the entire batch when one table is missing
        conn.autocommit = True
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        sys.exit(1)

    try:
        totals = clear_employee_data(conn, employee_id, dry_run=args.dry_run)
        if args.dry_run:
            print("[DRY-RUN] Completed.")
        else:
            print("Deletes committed.")
            for k, v in totals.items():
                print(f"{k} -> {v} rows")
    finally:
        conn.close()


if __name__ == "__main__":
    main()


