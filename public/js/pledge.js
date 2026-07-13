// Youth Peace Pledge form — submits to /api/pledges on the shared backend.

(function () {
  "use strict";

  const form = document.getElementById("pledgeForm");
  if (!form) return;

  const nameInput = document.getElementById("pledgeName");
  const countySelect = document.getElementById("pledgeCounty");
  const submitBtn = document.getElementById("pledgeSubmit");
  const errorEl = document.getElementById("pledgeError");
  const confirmation = document.getElementById("pledgeConfirmation");
  const confirmationHeadline = document.getElementById("confirmationHeadline");
  const confirmationList = document.getElementById("confirmationList");
  const pledgeAnother = document.getElementById("pledgeAnother");
  const counterEl = document.getElementById("pledgeCounter");

  const KENYA_COUNTIES = [
    "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay",
    "Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu",
    "Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru",
    "Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua",
    "Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia",
    "Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
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
    submitBtn.textContent = busy ? "Recording your pledge…" : "I pledge this";
  }

  async function refreshCounter() {
    try {
      const res = await fetch("/api/pledges/count");
      const data = await res.json();
      if (data.ok) {
        counterEl.textContent = `${data.count.toLocaleString()} ${
          data.count === 1 ? "person has" : "people have"
        } taken the pledge so far.`;
      }
    } catch (err) {
      counterEl.textContent = "";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("");

    const commitments = Array.from(form.querySelectorAll('input[name="commitment"]:checked')).map(
      (el) => el.value
    );

    if (commitments.length === 0) {
      setError("Choose at least one commitment before pledging.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          county: countySelect.value,
          commitments,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Something went wrong. Please try again.");

      const displayName = data.pledge.name && data.pledge.name !== "Anonymous" ? data.pledge.name : "friend";
      confirmationHeadline.textContent = `Thank you, ${displayName} — your pledge is recorded.`;
      confirmationList.innerHTML = commitments.map((c) => `<li>${c}</li>`).join("");

      form.hidden = true;
      confirmation.hidden = false;
      refreshCounter();
      if (window.cgToast) window.cgToast("Pledge recorded — thank you for showing up for peace.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  });

  pledgeAnother.addEventListener("click", () => {
    form.reset();
    form.hidden = false;
    confirmation.hidden = true;
    setError("");
  });

  refreshCounter();
})();
