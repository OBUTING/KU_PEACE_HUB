(function () {
  const KEY_STORAGE_NAME = "peacehub_admin_key";

  const statusEl = document.getElementById("gallery-status");
  const gridEl = document.getElementById("photo-grid");
  const keyInput = document.getElementById("admin-key-input");
  const saveKeyBtn = document.getElementById("save-key-btn");
  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const captionInput = document.getElementById("caption-input");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadStatus = document.getElementById("upload-status");

  function getKey() {
    return sessionStorage.getItem(KEY_STORAGE_NAME) || "";
  }
  function setKey(key) {
    sessionStorage.setItem(KEY_STORAGE_NAME, key);
  }

  keyInput.value = getKey();
  saveKeyBtn.addEventListener("click", () => {
    setKey(keyInput.value.trim());
    reloadGallery();
  });

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]); // strip data:...;base64, prefix
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  async function reloadGallery() {
    gridEl.innerHTML = "";
    statusEl.textContent = "Loading photos…";
    statusEl.style.display = "";

    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed.");

      if (data.images.length === 0) {
        statusEl.textContent = "No photos yet — upload the first one above.";
        return;
      }
      statusEl.style.display = "none";

      data.images.forEach((photo) => {
        const card = document.createElement("div");
        card.className = "photo-card";

        const img = document.createElement("img");
        img.src = `/api/gallery/${photo.id}/image`;
        img.alt = photo.caption || photo.filename;
        img.loading = "lazy";

        const removeBtn = document.createElement("button");
        removeBtn.className = "photo-remove-btn";
        removeBtn.textContent = "Delete";
        removeBtn.addEventListener("click", () => deletePhoto(photo.id));

        const caption = document.createElement("div");
        caption.className = "photo-caption";
        caption.innerHTML = `
          ${photo.caption ? photo.caption : ""}
          <span class="photo-date">${formatDate(photo.createdAt)}</span>
        `;

        card.appendChild(img);
        card.appendChild(removeBtn);
        card.appendChild(caption);
        gridEl.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Could not load the gallery right now.";
    }
  }

  async function deletePhoto(id) {
    const key = getKey();
    if (!key) {
      alert("Enter your admin key first.");
      return;
    }
    if (!confirm("Delete this photo? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": key },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed.");
      reloadGallery();
    } catch (err) {
      alert(err.message);
    }
  }

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = getKey();
    if (!key) {
      uploadStatus.textContent = "Enter your admin key first.";
      return;
    }
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      uploadStatus.textContent = "File is too large (max 5MB).";
      return;
    }

    uploadBtn.disabled = true;
    uploadStatus.textContent = "Uploading…";

    try {
      const dataBase64 = await fileToBase64(file);
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": key,
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          caption: captionInput.value.trim(),
          dataBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed.");

      uploadStatus.textContent = "Uploaded!";
      uploadForm.reset();
      reloadGallery();
    } catch (err) {
      uploadStatus.textContent = err.message;
    } finally {
      uploadBtn.disabled = false;
    }
  });

  reloadGallery();
})();
