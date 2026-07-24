// Report / Get Help page — submits anonymous reports to /api/reports.
// No name or contact field exists anywhere on this form by design.

(function () {
  "use strict";

  const form = document.getElementById("reportForm");
  if (!form) return;

  const categorySelect = document.getElementById("reportCategory");
  const countySelect = document.getElementById("reportCounty");
  const descriptionInput = document.getElementById("reportDescription");
  const submitBtn = document.getElementById("reportSubmitBtn");
  const errorEl = document.getElementById("reportError");
  const successEl = document.getElementById("reportSuccess");

  const KENYA_COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay",
    "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu",
    "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru",
    "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
    "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia",
    "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
  ];
  KENYA_COUNTIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countySelect.appendChild(opt);
  });

  function setError(message) {
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "Submitting…" : "Submit anonymously";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("");
    successEl.hidden = true;

    const description = descriptionInput.value.trim();
    if (!description) {
      setError("Please describe what happened.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categorySelect.value,
          county: countySelect.value,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Something went wrong. Please try again.");

      form.reset();
      successEl.hidden = false;
      if (window.cgToast) window.cgToast("Report submitted anonymously.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  });
})();
