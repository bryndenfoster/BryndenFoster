const currentYear = document.getElementById("current-year");
if (currentYear) currentYear.textContent = new Date().getFullYear();

const eventsList = document.querySelector("[data-events-list]");

if (eventsList) {
  const renderEvents = (events) => {
    eventsList.replaceChildren();

    if (!events.length) {
      const message = document.createElement("p");
      message.className = "events-no-dates";
      message.textContent = "No upcoming dates are listed right now. Check back soon.";
      eventsList.append(message);
      return;
    }

    events.forEach((event) => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : null;
      const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: event.timeZone });
      const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: event.timeZone });
      const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: event.timeZone });
      const card = document.createElement("article");
      card.className = "event-card";

      const date = document.createElement("div");
      date.className = "event-date";
      const dateMain = document.createElement("strong");
      dateMain.textContent = dateFormatter.format(start);
      const weekday = document.createElement("span");
      weekday.textContent = weekdayFormatter.format(start);
      date.append(dateMain, weekday);

      const details = document.createElement("div");
      details.className = "event-details";
      const status = document.createElement("p");
      status.className = "events-status";
      status.textContent = "Live performance";
      const title = document.createElement("h3");
      title.textContent = event.title;
      const meta = document.createElement("p");
      meta.className = "event-meta";
      const time = event.allDay ? "All day" : `${timeFormatter.format(start)}${end ? `–${timeFormatter.format(end)}` : ""}`;
      meta.textContent = [time, event.location].filter(Boolean).join(" · ");
      details.append(status, title, meta);

      if (event.url) {
        const link = document.createElement("a");
        link.className = "event-link";
        link.href = event.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Event details ↗";
        details.append(link);
      }

      card.append(date, details);
      eventsList.append(card);
    });
  };

  const loadEvents = async () => {
    try {
      let data = null;
      const sources = [
        { url: "api/events", options: {} },
        { url: `events.json?t=${Date.now()}`, options: { cache: "no-store" } },
      ];

      for (const source of sources) {
        try {
          const response = await fetch(source.url, source.options);
          if (!response.ok) continue;
          data = await response.json();
          break;
        } catch {
          // Try the static calendar fallback next.
        }
      }

      if (!data) throw new Error("Calendar unavailable");
      renderEvents(Array.isArray(data.events) ? data.events.slice(0, 3) : []);
    } catch {
      const status = eventsList.querySelector(".events-status");
      if (status) status.textContent = "Calendar temporarily unavailable";
    }
  };

  loadEvents();
  window.setInterval(loadEvents, 60 * 60 * 1000);
}

const carousel = document.querySelector("[data-carousel]");

if (carousel) {
  const slides = Array.from(carousel.querySelectorAll("[data-slide]"));
  const position = carousel.querySelector("[data-carousel-position]");
  const previousButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  let currentSlide = 0;
  let pointerStartX = null;

  const showSlide = (nextIndex) => {
    currentSlide = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      const isActive = index === currentSlide;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    position.textContent = `${currentSlide + 1} / ${slides.length}`;
  };

  previousButton.addEventListener("click", () => showSlide(currentSlide - 1));
  nextButton.addEventListener("click", () => showSlide(currentSlide + 1));

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(currentSlide - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(currentSlide + 1);
    }
  });

  carousel.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
  });

  carousel.addEventListener("pointerup", (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;

    if (Math.abs(distance) < 45) return;
    showSlide(currentSlide + (distance < 0 ? 1 : -1));
  });

  carousel.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });
}

const resumeFormToggle = document.querySelector("[data-resume-form-toggle]");
const resumeFormPanel = document.getElementById("portfolio-contact-form");

if (resumeFormToggle && resumeFormPanel) {
  const closeResumeForm = () => {
    resumeFormPanel.hidden = true;
    resumeFormToggle.setAttribute("aria-expanded", "false");
    resumeFormToggle.querySelector("span").textContent = "↓";
  };

  resumeFormToggle.addEventListener("click", () => {
    const shouldOpen = resumeFormPanel.hidden;
    resumeFormPanel.hidden = !shouldOpen;
    resumeFormToggle.setAttribute("aria-expanded", String(shouldOpen));
    resumeFormToggle.querySelector("span").textContent = shouldOpen ? "↑" : "↓";

    if (shouldOpen) {
      resumeFormPanel.querySelector("input").focus();
    }
  });

  resumeFormPanel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResumeForm();
      resumeFormToggle.focus();
    }
  });
}
