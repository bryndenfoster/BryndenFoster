const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Netlify-CDN-Cache-Control": "public, durable, max-age=3600, stale-while-revalidate=86400",
};

const unfoldLines = (text) => text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);

const unescapeValue = (value) => value
  .replace(/\\n/gi, "\n")
  .replace(/\\,/g, ",")
  .replace(/\\;/g, ";")
  .replace(/\\\\/g, "\\");

const getTimeZone = (key) => key.match(/(?:^|;)TZID=([^;:]+)/)?.[1] || "UTC";

const parseCalendarDate = (key, value) => {
  const timeZone = getTimeZone(key);
  const allDay = /^\d{8}$/.test(value);

  if (allDay) {
    return { date: new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`), allDay, timeZone };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) throw new Error(`Unsupported calendar date: ${value}`);

  const [, year, month, day, hour, minute, second, utc] = match;
  if (utc) return { date: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`), allDay, timeZone: "UTC" };

  // Determine the UTC instant represented by a local time in the calendar's zone.
  const assumedUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(assumedUtc)).map(({ type, value: part }) => [type, part]));
  const representedUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return { date: new Date(assumedUtc + (assumedUtc - representedUtc)), allDay, timeZone };
};

const parseEvents = (calendarText) => {
  const rawEvents = [];
  let current = null;

  for (const line of unfoldLines(calendarText)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      rawEvents.push(current);
      current = null;
    } else if (current && line.includes(":")) {
      const colon = line.indexOf(":");
      current[line.slice(0, colon)] = unescapeValue(line.slice(colon + 1));
    }
  }

  const now = Date.now();
  return rawEvents.flatMap((item) => {
    const startKey = Object.keys(item).find((key) => key.startsWith("DTSTART"));
    const endKey = Object.keys(item).find((key) => key.startsWith("DTEND"));
    if (!startKey || !item.SUMMARY) return [];

    try {
      const start = parseCalendarDate(startKey, item[startKey]);
      const end = endKey ? parseCalendarDate(endKey, item[endKey]) : null;
      if ((end?.date || start.date).getTime() < now) return [];

      return [{
        title: item.SUMMARY,
        start: start.date.toISOString(),
        end: end?.date.toISOString() || null,
        allDay: start.allDay,
        timeZone: start.timeZone,
        location: item.LOCATION || "",
        url: item.URL || "",
      }];
    } catch {
      return [];
    }
  }).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
};

export default async () => {
  const calendarUrl = process.env.ICLOUD_CALENDAR_URL?.replace(/^webcal:/, "https:");
  if (!calendarUrl) {
    return new Response(JSON.stringify({ error: "Calendar is not configured" }), { status: 500, headers: jsonHeaders });
  }

  try {
    const response = await fetch(calendarUrl, { headers: { "User-Agent": "BryndenFoster.com events" } });
    if (!response.ok) throw new Error(`Calendar returned ${response.status}`);
    const events = parseEvents(await response.text());
    return new Response(JSON.stringify({ events }), { status: 200, headers: jsonHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "Calendar temporarily unavailable" }), {
      status: 502,
      headers: { ...jsonHeaders, "Netlify-CDN-Cache-Control": "no-store" },
    });
  }
};

export { parseEvents };
