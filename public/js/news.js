// Public News & Events feed. Reads published items from /api/content and
// lets visitors register for events via /api/events/register — both on
// this project's own backend (see backend/server.js).

(function () {
  "use strict";

  const grid = document.getElementById("feedGrid");
  const loading = document.getElementById("feedLoading");
  const filters = document.getElementById("feedFilters");
  const galleryStatusEl = document.getElementById("gallery-status");
  const photoGridEl = document.getElementById("photo-grid");
  const videoGridEl = document.getElementById("video-grid");
  const downloadGridEl = document.getElementById("download-grid");
  if (!grid) return;

  let items = [];
  let activeFilter = "all";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
  }

  function formatEventDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatGalleryDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function cardMarkup(item) {
    const isEvent = item.type === "event";
    const icon = isEvent ? "fa-calendar-days" : "fa-newspaper";
    const tag = isEvent ? "Event" : "News";
    const metaLines = [];
    if (isEvent && item.eventAt) metaLines.push(`<div><i class="fa-regular fa-clock"></i>${escapeHtml(formatEventDate(item.eventAt))}</div>`);
    if (isEvent && item.location) metaLines.push(`<div><i class="fa-solid fa-location-dot"></i>${escapeHtml(item.location)}</div>`);

    return `
      <article class="entry-card" data-id="${escapeHtml(item.id)}">
        <div class="entry-card-top">
          <span class="entry-icon"><i class="fa-solid ${icon}"></i></span>
          <div>
            <span class="entry-tag">${tag}</span>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
        </div>
        <p class="entry-desc">${escapeHtml(item.summary || "")}</p>
        ${metaLines.length ? `<div class="entry-meta">${metaLines.join("")}</div>` : ""}
        ${isEvent ? `
          <button type="button" class="entry-primary-btn" data-action="toggle-register">Register</button>
          <form class="register-panel" data-role="register-form">
            <input type="text" name="fullName" placeholder="Your full name" required>
            <input type="email" name="email" placeholder="Email address">
            <input type="tel" name="phone" placeholder="Phone number">
            <textarea name="notes" rows="2" placeholder="Anything we should know? (optional)"></textarea>
            <button type="submit" class="entry-primary-btn">Confirm registration</button>
            <p class="register-success" hidden>You're on the list. See you there!</p>
            <p class="register-error" hidden></p>
          </form>
        ` : ""}
      </article>
    `;
  }

  function render() {
    const filtered = activeFilter === "all" ? items : items.filter((item) => item.type === activeFilter);
    if (!filtered.length) {
      grid.innerHTML = '<div class="list-empty">Nothing here yet — check back soon.</div>';
      return;
    }
    grid.innerHTML = filtered.map(cardMarkup).join("");
  }

  grid.addEventListener("click", (event) => {
    const btn = event.target.closest('[data-action="toggle-register"]');
    if (!btn) return;
    const panel = btn.nextElementSibling;
    if (panel) panel.classList.toggle("is-open");
  });

  grid.addEventListener("submit", async (event) => {
    const form = event.target.closest('[data-role="register-form"]');
    if (!form) return;
    event.preventDefault();

    const card = form.closest(".entry-card");
    const item = items.find((entry) => entry.id === card.dataset.id);
    const successEl = form.querySelector(".register-success");
    const errorEl = form.querySelector(".register-error");
    successEl.hidden = true;
    errorEl.hidden = true;

    const payload = {
      eventTitle: item ? item.title : "",
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      notes: form.notes.value.trim(),
    };

    if (!payload.fullName) {
      errorEl.textContent = "Enter your name to register.";
      errorEl.hidden = false;
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Something went wrong. Please try again.");
      form.reset();
      successEl.hidden = false;
      if (window.cgToast) window.cgToast("You're registered — see you there!");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  if (filters) {
    filters.addEventListener("click", (event) => {
      const btn = event.target.closest(".list-filter-btn");
      if (!btn) return;
      activeFilter = btn.dataset.filter;
      filters.querySelectorAll(".list-filter-btn").forEach((el) => el.classList.toggle("is-active", el === btn));
      render();
    });
  }

  async function load() {
    try {
      const res = await fetch("/api/content");
      const data = await res.json();
      if (data.ok) {
        items = data.content;
        render();
      } else {
        throw new Error(data.error || "Could not load updates.");
      }
    } catch (err) {
      grid.innerHTML = `<div class="list-empty">Could not reach the server. Is the backend running?</div>`;
    } finally {
      if (loading) loading.remove();
    }
  }

  async function loadGallery() {
    if (!galleryStatusEl || !photoGridEl) return;

    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed.");

      if (!data.images || data.images.length === 0) {
        galleryStatusEl.textContent = "No photos yet. Check back soon.";
        return;
      }

      galleryStatusEl.remove();

      const groups = data.images.reduce((acc, photo) => {
        const groupTitle = String(photo.title || "").trim() || "General gallery";
        if (!acc[groupTitle]) acc[groupTitle] = [];
        acc[groupTitle].push(photo);
        return acc;
      }, {});

      Object.entries(groups).forEach(([groupTitle, photos]) => {
        const section = document.createElement("section");
        section.className = "gallery-group";

        const heading = document.createElement("div");
        heading.className = "gallery-group-heading";
        heading.innerHTML = `<h3>${escapeHtml(groupTitle)}</h3><span>${photos.length} photo${photos.length === 1 ? "" : "s"}</span>`;
        section.appendChild(heading);

        if (photos.length >= 3) {
          const carousel = document.createElement("div");
          carousel.className = "gallery-carousel";

          const track = document.createElement("div");
          track.className = "gallery-carousel-track";

          const dots = document.createElement("div");
          dots.className = "gallery-carousel-dots";

          const showSlide = (index) => {
            const current = (index + photos.length) % photos.length;
            Array.from(track.children).forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === current));
            Array.from(dots.children).forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === current));
          };

          photos.forEach((photo, index) => {
            const slide = document.createElement("div");
            slide.className = `gallery-carousel-slide${index === 0 ? " is-active" : ""}`;

            const card = document.createElement("div");
            card.className = "photo-card";

            const img = document.createElement("img");
            img.src = `/api/gallery/${photo.id}/image`;
            img.alt = photo.caption || photo.filename;
            img.loading = "lazy";
            card.appendChild(img);

            if (photo.caption || photo.createdAt) {
              const caption = document.createElement("div");
              caption.className = "photo-caption";
              caption.innerHTML = `
                ${photo.caption ? escapeHtml(photo.caption) : ""}
                <span class="photo-date">${formatGalleryDate(photo.createdAt)}</span>
              `;
              card.appendChild(caption);
            }

            slide.appendChild(card);
            track.appendChild(slide);

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = `gallery-carousel-dot${index === 0 ? " is-active" : ""}`;
            dot.setAttribute("aria-label", `Show photo ${index + 1}`);
            dot.addEventListener("click", () => showSlide(index));
            dots.appendChild(dot);
          });

          carousel.appendChild(track);
          carousel.appendChild(dots);
          section.appendChild(carousel);
          showSlide(0);
          window.setInterval(() => showSlide((Array.from(track.children).findIndex((item) => item.classList.contains("is-active")) + 1) % photos.length), 5000);
        } else {
          const items = document.createElement("div");
          items.className = "gallery-group-items";
          photos.forEach((photo) => {
            const card = document.createElement("div");
            card.className = "photo-card";

            const img = document.createElement("img");
            img.src = `/api/gallery/${photo.id}/image`;
            img.alt = photo.caption || photo.filename;
            img.loading = "lazy";
            card.appendChild(img);

            if (photo.caption || photo.createdAt) {
              const caption = document.createElement("div");
              caption.className = "photo-caption";
              caption.innerHTML = `
                ${photo.caption ? escapeHtml(photo.caption) : ""}
                <span class="photo-date">${formatGalleryDate(photo.createdAt)}</span>
              `;
              card.appendChild(caption);
            }

            items.appendChild(card);
          });
          section.appendChild(items);
        }

        photoGridEl.appendChild(section);
      });
    } catch (err) {
      console.error(err);
      galleryStatusEl.textContent = "Could not load the gallery right now.";
    }
  }

  async function loadVideos() {
    if (!videoGridEl) return;
    try {
      const res = await fetch("/api/gallery/videos");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed.");
      if (!data.videos || data.videos.length === 0) {
        videoGridEl.innerHTML = '<div class="gallery-empty-state">No videos yet.</div>';
        return;
      }
      videoGridEl.innerHTML = "";
      data.videos.forEach((video) => {
        const card = document.createElement("div");
        card.className = "photo-card";
        card.innerHTML = `
          <video controls preload="metadata" src="/api/gallery/videos/${video.id}/file" class="gallery-video-preview"></video>
          <div class="photo-caption">
            ${video.title ? `${escapeHtml(video.title)}<br>` : ""}
            <span class="photo-date">${formatGalleryDate(video.createdAt)}</span>
          </div>
        `;
        videoGridEl.appendChild(card);
      });
    } catch (err) {
      videoGridEl.innerHTML = '<div class="gallery-empty-state">The videos could not be loaded.</div>';
    }
  }

  async function loadDownloads() {
    if (!downloadGridEl) return;
    try {
      const res = await fetch("/api/gallery/downloads");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed.");
      if (!data.downloads || data.downloads.length === 0) {
        downloadGridEl.innerHTML = '<div class="gallery-empty-state">No downloadable media yet.</div>';
        return;
      }
      downloadGridEl.innerHTML = "";
      data.downloads.forEach((item) => {
        const card = document.createElement("div");
        card.className = "photo-card";
        const link = document.createElement("a");
        link.className = "download-card";
        link.href = `/api/gallery/downloads/${item.id}/file`;
        link.download = item.filename;
        link.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i><div><strong>${escapeHtml(item.title || item.filename)}</strong><span>${escapeHtml(item.caption || item.filename)}</span></div>`;
        card.appendChild(link);
        downloadGridEl.appendChild(card);
      });
    } catch (err) {
      downloadGridEl.innerHTML = '<div class="gallery-empty-state">The downloadable media could not be loaded.</div>';
    }
  }

  load();
  loadGallery();
  loadVideos();
  loadDownloads();
})();
