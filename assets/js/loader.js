
/* ==========================================
   UNSTABLE REUNION — UNIVERSAL LOADER
   File: assets/js/loader.js
   No external libraries required.
   ========================================== */

   (() => {
    "use strict";

    // Avoid duplicate loaders if this script is accidentally included twice.
    if (window.__urLoaderInstalled) return;
    window.__urLoaderInstalled = true;

    const MIN_DISPLAY_TIME = 1300;
    const MAX_WAIT_TIME = 12000;
    const EXPLOSION_TIME = 1500;

    const startedAt = performance.now();
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    // Respect a page-level opt-out:
    // <html lang="en" data-loader="off">
    if (document.documentElement.dataset.loader === "off") return;

    // Don't replay the loader when restoring a page from browser cache.
    if (performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
        return;
    }

    const root = document.documentElement;
    root.classList.add("ur-loader-active");

    // ---------- Build the loader DOM ----------

    const loader = document.createElement("div");
    loader.id = "ur-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "Loading Unstable Reunion");
    loader.setAttribute("aria-live", "polite");

    const canvas = document.createElement("canvas");
    canvas.id = "ur-loader-canvas";
    canvas.setAttribute("aria-hidden", "true");

    const shockwave = document.createElement("div");
    shockwave.id = "ur-loader-shockwave";
    shockwave.setAttribute("aria-hidden", "true");

    const flash = document.createElement("div");
    flash.id = "ur-loader-flash";
    flash.setAttribute("aria-hidden", "true");

    loader.append(canvas, shockwave, flash);
    document.body.prepend(loader);

    const ctx = canvas.getContext("2d", { alpha: false });

    // ---------- Nucleus model ----------

    // A stylized visual cluster, not an exact nuclear simulation.
    const PROTON_COUNT = 92;
    const NEUTRON_COUNT = 143;
    const NUCLEON_COUNT = PROTON_COUNT + NEUTRON_COUNT;

    const nucleons = [];

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    // Distribute particles throughout a sphere.
    for (let i = 0; i < NUCLEON_COUNT; i++) {
        const z = random(-1, 1);
        const angle = random(0, Math.PI * 2);
        const radius = Math.cbrt(Math.random()) * 0.75;
        const ring = Math.sqrt(1 - z * z);

        nucleons.push({
            x: radius * ring * Math.cos(angle),
            y: radius * ring * Math.sin(angle),
            z: radius * z,
            phase: random(0, Math.PI * 2),
            speed: random(0.6, 1.4),
            proton: i < PROTON_COUNT
        });
    }

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;
    let progress = 0;
    let loaded = document.readyState === "complete";
    let detonated = false;
    let dismissed = false;

    function resizeCanvas() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    window.addEventListener("resize", resizeCanvas, { passive: true });
    resizeCanvas();

    // ---------- Draw the animated particle cluster ----------

    function drawNucleus(now, instability) {
        const centerX = width / 2;
        const centerY = height / 2;

        // Keep the cluster compact on small screens.
        const size = Math.min(width, height) * 0.118;
        const time = now * 0.001;

        // Rotation becomes less predictable as instability increases.
        const rotationY = time * 0.55 + Math.sin(time * 1.7) * instability * 0.35;
        const rotationX = time * 0.28 + Math.cos(time * 1.3) * instability * 0.3;

        const sinY = Math.sin(rotationY);
        const cosY = Math.cos(rotationY);
        const sinX = Math.sin(rotationX);
        const cosX = Math.cos(rotationX);

        const projected = [];

        for (const particle of nucleons) {
            let x = particle.x;
            let y = particle.y;
            let z = particle.z;

            // Rotate around the Y axis.
            const rotatedX = x * cosY - z * sinY;
            const rotatedZ = x * sinY + z * cosY;

            // Rotate around the X axis.
            const rotatedY = y * cosX - rotatedZ * sinX;
            const finalZ = y * sinX + rotatedZ * cosX;

            const jitter = reducedMotion ? 0 : instability * size * 0.12;
            const shakeX = Math.sin(time * 13 * particle.speed + particle.phase) * jitter;
            const shakeY = Math.cos(time * 11 * particle.speed + particle.phase) * jitter;

            const perspective = 2.8 / (2.8 + finalZ);
            const depthScale = perspective;

            projected.push({
                x: centerX + rotatedX * size * perspective + shakeX,
                y: centerY + rotatedY * size * perspective + shakeY,
                z: finalZ,
                radius: (particle.proton ? 6 : 5) * depthScale,
                proton: particle.proton,
                alpha: Math.max(0.22, Math.min(1, 0.68 + finalZ * 0.25))
            });
        }

        // Back particles first, front particles last.
        projected.sort((a, b) => a.z - b.z);

        // Subtle aura around the cluster.
        const auraRadius = size * (1.1 + instability * 0.12);
        const aura = ctx.createRadialGradient(
            centerX, centerY, size * 0.08,
            centerX, centerY, auraRadius
        );

        aura.addColorStop(0, `rgba(168, 85, 247, ${0.13 + instability * 0.08})`);
        aura.addColorStop(0.55, `rgba(0, 229, 255, ${0.055 + instability * 0.03})`);
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw individual nucleons.
        for (const particle of projected) {
            const color = particle.proton
                ? `rgba(255, 60, 172, ${particle.alpha})`
                : `rgba(0, 229, 255, ${particle.alpha})`;

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.shadowBlur = reducedMotion ? 0 : 5 + instability * 5;
            ctx.shadowColor = particle.proton ? "#ff3cac" : "#00e5ff";
            ctx.arc(
                particle.x,
                particle.y,
                particle.radius * (1 + instability * 0.06),
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.shadowBlur = 0;
    }

    // ---------- Loading progress and instability ----------

    function animate(now) {
        if (dismissed || !ctx) return;

        const elapsed = now - startedAt;
        const timeProgress = Math.min(elapsed / MAX_WAIT_TIME, 1);

        // Progress rises quickly at first, then slows while waiting.
        const targetProgress = loaded
            ? 1
            : Math.min(0.9, 1 - Math.pow(1 - timeProgress, 2));

        progress += (targetProgress - progress) * 0.035;

        // Instability grows gradually as loading approaches completion.
        const instability = reducedMotion
            ? 0
            : Math.min(1, Math.pow(progress, 1.7) * 1.25);

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);

        drawNucleus(now, instability);

        // Once loading finishes, wait a little so the effect is visible.
        const displayTimeReached = elapsed >= MIN_DISPLAY_TIME;
        const timedOut = elapsed >= MAX_WAIT_TIME;

        if ((loaded && displayTimeReached) || timedOut) {
            detonate();
            return;
        }

        animationFrame = requestAnimationFrame(animate);
    }

    // ---------- Shockwave, whiteout, and exit ----------

    function detonate() {
        if (detonated || dismissed) return;
        detonated = true;

        cancelAnimationFrame(animationFrame);

        loader.classList.add("ur-loader--detonating");

        // Give the shockwave room to cover the screen, then reveal the page.
        window.setTimeout(() => {
            loader.classList.add("ur-loader--exit");
            root.classList.remove("ur-loader-active");
        }, EXPLOSION_TIME);

        window.setTimeout(() => {
            dismissed = true;
            cancelAnimationFrame(animationFrame);
            window.removeEventListener("resize", resizeCanvas);
            loader.remove();
        }, EXPLOSION_TIME + 5100);
    }

    // The load event means the document and its dependent resources have loaded.
    window.addEventListener("load", () => {
        loaded = true;
    }, { once: true });

    // In case this script runs after the load event.
    if (document.readyState === "complete") {
        loaded = true;
    }

    animationFrame = requestAnimationFrame(animate);
})();