// Portable Peace Dialogue Tree page — a small interactive stand-in for the
// tree's physical spinning wheel: Conflict → Talk → Understand → Peace.

(function () {
  "use strict";

  const wheel = document.getElementById("ptWheel");
  const btn = document.getElementById("ptWheelBtn");
  const readout = document.getElementById("ptWheelReadout");
  if (!wheel || !btn || !readout) return;

  const stages = ["Conflict", "Talk", "Understand", "Peace"];
  let stageIndex = 0;
  let rotation = 0;

  btn.addEventListener("click", () => {
    stageIndex = (stageIndex + 1) % stages.length;
    rotation -= 90; // rotate the wheel so the next quadrant lines up with the pointer
    wheel.style.transform = `rotate(${rotation}deg)`;
    readout.textContent = `Stage: ${stages[stageIndex]}`;

    if (stages[stageIndex] === "Peace" && window.cgToast) {
      window.cgToast("From conflict to peace — that's the whole wheel.");
    }
  });
})();
