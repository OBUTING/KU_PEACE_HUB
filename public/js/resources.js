// Public Resources page — fetches /api/resources and renders cards with
// search + category filtering, plus a real download link per resource.

(function () {
  "use strict";

  const grid = document.getElementById("resourcesGrid");
  const loading = document.getElementById("resourcesLoading");
  const searchInput = document.getElementById("resourceSearch");
  const categorySelect = document.getElementById("resourceCategoryFilter");
  if (!grid) return;

  let allResources = [];

  function iconFor(fileType) {
    const type = (fileType || "").toUpperCase();
    if (type === "PDF") return "fa-solid fa-file-pdf";
    if (["DOC", "DOCX"].includes(type)) return "fa-solid fa-file-word";
    if (["PPT", "PPTX"].includes(type)) return "fa-solid fa-file-powerpoint";
    if (["ZIP", "RAR"].includes(type)) return "fa-solid fa-file-zipper";
    if (["JPG", "JPEG", "PNG"].includes(type)) return "fa-solid fa-file-image";
    return "fa-regular fa-file-lines";
  }

  function render() {
    const query = (searchInput.value || "").toLowerCase().trim();
    const category = categorySelect.value;

    const filtered = allResources.filter((r) => {
      const matchesQuery =
        !query ||
        r.title.toLowerCase().includes(query) ||
        (r.description || "").toLowerCase().includes(query);
      const matchesCategory = !category || r.category === category;
      return matchesQuery && matchesCategory;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="resources-empty">No resources match yet — check back soon.</p>';
      return;
    }

    grid.innerHTML = filtered
      .map((r) => {
        const downloadBtn = r.hasFile
          ? `<a class="resource-download-btn" href="/api/resources/${encodeURIComponent(r.id)}/download">
               <i class="fa-solid fa-download"></i> Download
             </a>`
          : `<span class="resource-download-btn is-disabled">No file attached</span>`;

        return `
          <article class="resource-card reveal is-visible">
            <div class="resource-card-top">
              <span class="resource-icon"><i class="${iconFor(r.fileType)}"></i></span>
              <div>
                <span class="resource-category">${escapeHtml(r.category || "General")}</span>
                <h3>${escapeHtml(r.title)}</h3>
              </div>
            </div>
            <p class="resource-desc">${escapeHtml(r.description || "")}</p>
            <p class="resource-meta">${escapeHtml(r.fileType || "FILE")} · ${escapeHtml(r.size || "—")} · ${r.downloads || 0} downloads</p>
            ${downloadBtn}
          </article>`;
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function populateCategoryFilter() {
    const categories = [...new Set(allResources.map((r) => r.category).filter(Boolean))].sort();
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  async function load() {
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      if (data.ok) {
        allResources = data.resources;
        populateCategoryFilter();
        render();
      } else {
        grid.innerHTML = '<p class="resources-empty">Could not load resources right now.</p>';
      }
    } catch (err) {
      grid.innerHTML = '<p class="resources-empty">Could not reach the server.</p>';
    } finally {
      if (loading) loading.remove();
    }
  }

  searchInput.addEventListener("input", render);
  categorySelect.addEventListener("change", render);

  load();
})();
