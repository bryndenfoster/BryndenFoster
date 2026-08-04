document.getElementById("current-year").textContent = new Date().getFullYear();

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
