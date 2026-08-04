#!/usr/bin/env python3
"""Build the public upcoming-events JSON from Brynden's iCloud calendar."""

import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


def unfold(text):
    return re.sub(r"\r?\n[ \t]", "", text).splitlines()


def unescape(value):
    return (value.replace("\\n", "\n").replace("\\,", ",")
            .replace("\\;", ";").replace("\\\\", "\\"))


def parse_date(key, value):
    timezone_match = re.search(r"TZID=([^;:]+)", key)
    zone = ZoneInfo(timezone_match.group(1)) if timezone_match else timezone.utc
    if re.fullmatch(r"\d{8}", value):
        return datetime.strptime(value, "%Y%m%d").replace(tzinfo=zone), True
    if value.endswith("Z"):
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc), False
    return datetime.strptime(value, "%Y%m%dT%H%M%S").replace(tzinfo=zone), False


def main():
    calendar_url = os.environ["ICLOUD_CALENDAR_URL"].replace("webcal://", "https://", 1)
    request = urllib.request.Request(calendar_url, headers={"User-Agent": "BryndenFoster.com events updater"})
    with urllib.request.urlopen(request, timeout=30) as response:
        calendar = response.read().decode("utf-8")

    raw_events, current = [], None
    for line in unfold(calendar):
        if line == "BEGIN:VEVENT":
            current = {}
        elif line == "END:VEVENT" and current is not None:
            raw_events.append(current)
            current = None
        elif current is not None and ":" in line:
            key, value = line.split(":", 1)
            current[key] = unescape(value)

    now = datetime.now(timezone.utc)
    events = []
    for item in raw_events:
        start_key = next((key for key in item if key.startswith("DTSTART")), None)
        end_key = next((key for key in item if key.startswith("DTEND")), None)
        if not start_key or not item.get("SUMMARY"):
            continue
        start, all_day = parse_date(start_key, item[start_key])
        end, _ = parse_date(end_key, item[end_key]) if end_key else (None, all_day)
        if (end or start).astimezone(timezone.utc) < now:
            continue
        events.append({
            "title": item["SUMMARY"],
            "start": start.isoformat(),
            "end": end.isoformat() if end else None,
            "allDay": all_day,
            "timeZone": getattr(start.tzinfo, "key", "UTC"),
            "location": item.get("LOCATION", ""),
            "url": item.get("URL", ""),
        })

    events.sort(key=lambda event: event["start"])
    Path("events.json").write_text(json.dumps({"events": events[:3]}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
