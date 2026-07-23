// Home page only: a quiet ambient hero canvas, and the click-to-ripple demo.

(function () {
  "use strict";

  /* ---------------- Hero ambient canvas ---------------- */
  const heroCanvas = document.getElementById("heroCanvas");
  if (heroCanvas) {
    const ctx = heroCanvas.getContext("2d");
    let particles = [];
    let w, h;

    function resize() {
      const rect = heroCanvas.parentElement.getBoundingClientRect();
      w = heroCanvas.width = rect.width;
      h = heroCanvas.height = rect.height;
    }

    function makeParticles() {
      const count = Math.max(24, Math.floor((w * h) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(79, 111, 82, 0.35)";
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      // faint connecting lines between nearby particles
      ctx.strokeStyle = "rgba(176, 141, 87, 0.12)";
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(step);
    }

    resize();
    makeParticles();
    requestAnimationFrame(step);
    window.addEventListener("resize", () => {
      resize();
      makeParticles();
    });
  }

  /* ---------------- Ripple demo ---------------- */
  const rippleCanvas = document.getElementById("rippleCanvas");
  const rippleStage = document.getElementById("rippleStage");
  const rippleReset = document.getElementById("rippleReset");
  const rippleHint = rippleStage ? rippleStage.querySelector(".ripple-hint") : null;

  if (rippleCanvas && rippleStage) {
    const rctx = rippleCanvas.getContext("2d");
    let nodes = [];
    let rw, rh;

    function rresize() {
      const rect = rippleStage.getBoundingClientRect();
      rw = rippleCanvas.width = rect.width;
      rh = rippleCanvas.height = rect.height;
    }

    function addNode(x, y, generation) {
      nodes.push({ x, y, r: 0, maxR: 70 - generation * 12, generation, alpha: 1 });
      if (rippleHint) rippleHint.style.display = "none";

      // ripple out to nearby nodes, up to 2 generations deep
      if (generation < 2) {
        nodes
          .filter((n) => n !== nodes[nodes.length - 1])
          .forEach((n) => {
            const dist = Math.hypot(n.x - x, n.y - y);
            if (dist > 0 && dist < 160) {
              setTimeout(() => {
                const ang = Math.random() * Math.PI * 2;
                const nx = x + Math.cos(ang) * (30 + Math.random() * 40);
                const ny = y + Math.sin(ang) * (30 + Math.random() * 40);
                if (nx > 0 && nx < rw && ny > 0 && ny < rh) addNode(nx, ny, generation + 1);
              }, 260 * (generation + 1));
            }
          });
      }
    }

    function rstep() {
      rctx.clearRect(0, 0, rw, rh);
      nodes.forEach((n) => {
        if (n.r < n.maxR) n.r += 1.1;
        else n.alpha = Math.max(0, n.alpha - 0.01);
        const hue = n.generation === 0 ? "79, 111, 82" : "176, 141, 87";
        rctx.beginPath();
        rctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        rctx.strokeStyle = `rgba(${hue}, ${n.alpha * 0.6})`;
        rctx.lineWidth = 1.6;
        rctx.stroke();
      });
      nodes = nodes.filter((n) => n.alpha > 0.02);
      requestAnimationFrame(rstep);
    }

    rresize();
    requestAnimationFrame(rstep);
    window.addEventListener("resize", rresize);

    rippleStage.addEventListener("click", (e) => {
      const rect = rippleStage.getBoundingClientRect();
      addNode(e.clientX - rect.left, e.clientY - rect.top, 0);
    });

    if (rippleReset) {
      rippleReset.addEventListener("click", () => {
        nodes = [];
        if (rippleHint) rippleHint.style.display = "";
      });
    }
  }
})();
