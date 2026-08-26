#!/usr/bin/env python3
"""Preflight verification script for official NARA GRS sources.

Asserts every production evidence URL:
- Returns HTTP 2xx
- Returns non-empty content
- Matches expected Content-Type
- Measured size is under the 350,000 byte cap
- Contains required schedule markers and CSV rows with exact authorities
"""

import csv
import sys
import urllib.error
import urllib.request

MAX_EVIDENCE_BYTES = 350_000

SOURCES = [
    {
        "name": "NARA GRS Index",
        "url": "https://www.archives.gov/records-mgmt/grs.html",
        "expected_type_substr": "text/html",
        "required_markers": ["General Records Schedules", "GRS"],
    },
    {
        "name": "NARA GRS Master CSV (Transmittal 36)",
        "url": "https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv",
        "expected_type_substr": "text/csv",
        "required_markers": ["GRS ID", "DAA-GRS-2013-0003-0001", "DAA-GRS-2016-0016-0001"],
        "validate_csv": True,
    },
    {
        "name": "NARA GRS 1.1 FAQ",
        "url": "https://www.archives.gov/records-mgmt/grs/faqs-for-grs-1-1",
        "expected_type_substr": "text/html",
        "required_markers": ["Financial Management", "GRS 1.1"],
    },
    {
        "name": "NARA GRS 1.1 Provenance PDF",
        "url": "https://www.archives.gov/files/records-mgmt/grs/grs01-1.pdf",
        "expected_type_substr": "application/pdf",
        "required_markers": [],
    },
    {
        "name": "NARA GRS 5.1 Provenance PDF",
        "url": "https://www.archives.gov/files/records-mgmt/grs/grs05-1.pdf",
        "expected_type_substr": "application/pdf",
        "required_markers": [],
    },
]


def check_url(source: dict) -> dict:
    url = source["url"]
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GenLayer/Preflight 1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        status = resp.status
        content_type = resp.headers.get("Content-Type", "")
        body = resp.read()
        byte_size = len(body)

    if status != 200:
        raise ValueError(f"HTTP {status} != 200 for {url}")
    if byte_size == 0:
        raise ValueError(f"Empty body for {url}")
    if byte_size > MAX_EVIDENCE_BYTES:
        raise ValueError(f"Size {byte_size} exceeds {MAX_EVIDENCE_BYTES} for {url}")
    if source["expected_type_substr"] not in content_type:
        raise ValueError(f"Content-Type '{content_type}' does not match expected '{source['expected_type_substr']}'")

    for marker in source.get("required_markers", []):
        if marker.encode("utf-8") not in body:
            raise ValueError(f"Required marker '{marker}' missing in {url}")

    if source.get("validate_csv"):
        text = body.decode("utf-8")
        reader = csv.reader(text.splitlines())
        raw_header = None
        for row in reader:
            if row and any(h.strip() for h in row):
                raw_header = row
                break
        if not raw_header:
            raise ValueError("CSV header not found")
        header = [h.strip().lstrip("﻿") for h in raw_header]
        required_cols = {
            "GRS ID",
            "Record Title",
            "Classification (General)",
            "Disposition",
            "Retention (Years)",
            "Event Type (General)",
            "Disposition Authority",
        }
        if not required_cols.issubset(set(header)):
            raise ValueError(f"Missing required CSV columns in {url}")

        col_idx = {h: i for i, h in enumerate(header)}
        found = {}
        for row in reader:
            if not row or len(row) <= max(col_idx.values()):
                continue
            grs_id = row[col_idx["GRS ID"]].strip().lstrip("﻿")
            if grs_id in {"GRS 1.1.010", "GRS 1.1.011", "GRS 5.1.010"}:
                if grs_id in found:
                    raise ValueError(f"Duplicate {grs_id} row in CSV")
                found[grs_id] = {
                    "title": row[col_idx["Record Title"]].strip(),
                    "classification": row[col_idx["Classification (General)"]].strip(),
                    "authority": row[col_idx["Disposition Authority"]].strip(),
                    "disposition": row[col_idx["Disposition"]].strip(),
                    "retention": row[col_idx["Retention (Years)"]].strip(),
                    "event": row[col_idx["Event Type (General)"]].strip(),
                }

        if "GRS 1.1.010" not in found or found["GRS 1.1.010"]["authority"] != "DAA-GRS-2013-0003-0001":
            raise ValueError("GRS 1.1.010 authority mismatch or missing in CSV")
        if "GRS 1.1.011" not in found or found["GRS 1.1.011"]["authority"] != "DAA-GRS-2013-0003-0002":
            raise ValueError("GRS 1.1.011 authority mismatch or missing in CSV")
        if "GRS 5.1.010" not in found or found["GRS 5.1.010"]["authority"] != "DAA-GRS-2016-0016-0001":
            raise ValueError("GRS 5.1.010 authority mismatch or missing in CSV")
        expected = {
            "GRS 1.1.010": ("Financial transaction records related to procuring goods and services, paying bills, collecting debts, and accounting - Official record held in the office of record", "Financial Management", "Temporary", "6", "Final action", "DAA-GRS-2013-0003-0001"),
            "GRS 1.1.011": ("Financial transaction records related to procuring goods and services, paying bills, collecting debts, and accounting - All other copies (Copies used for administrative or reference purposes)", "Financial Management", "Temporary", "0", "No longer needed", "DAA-GRS-2013-0003-0002"),
            "GRS 5.1.010": ("Administrative records maintained in any agency office", "Common Office Records", "Temporary", "0", "No longer needed", "DAA-GRS-2016-0016-0001"),
        }
        for grs_id, values in found.items():
            actual = (values["title"], values["classification"], values["disposition"], values["retention"], values["event"], values["authority"])
            if actual != expected[grs_id]:
                raise ValueError(f"{grs_id} consequential fields mismatch")

    return {
        "name": source["name"],
        "url": url,
        "status": status,
        "content_type": content_type,
        "byte_size": byte_size,
    }


def main():
    print("=" * 80)
    print("NARA Official Source Real-Network Preflight Check")
    print(f"Evidence Size Cap: {MAX_EVIDENCE_BYTES:,} bytes")
    print("=" * 80)

    results = []
    failed = False
    for s in SOURCES:
        try:
            res = check_url(s)
            results.append(res)
            print(f"[PASS] {res['name']}")
            print(f"       URL:          {res['url']}")
            print(f"       Status:       HTTP {res['status']}")
            print(f"       Content-Type: {res['content_type']}")
            print(f"       Byte Size:    {res['byte_size']:,} bytes (< {MAX_EVIDENCE_BYTES:,})")
            print()
        except (ValueError, OSError, urllib.error.URLError) as e:
            failed = True
            print(f"[FAIL] {s['name']}")
            print(f"       URL:   {s['url']}")
            print(f"       Error: {e}")
            print()

    print("=" * 80)
    if failed:
        print("PREFLIGHT RESULT: FAILED")
        sys.exit(1)
    else:
        print("PREFLIGHT RESULT: ALL 5 SOURCES REACHABLE AND VALIDATED")
        sys.exit(0)


if __name__ == "__main__":
    main()
