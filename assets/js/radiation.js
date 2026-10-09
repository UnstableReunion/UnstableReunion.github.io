
/* ==========================================
   UNSTABLE REUNION — UNIVERSAL RADIATION
   Automatically installs on every page
   ========================================== */

   (() => {
    "use strict";

    // Prevent accidental duplicate installation.
    if (window.__universalRadiationLoaded) return;
    window.__universalRadiationLoaded = true;

    const script = document.currentScript;

    // Page-level configuration through HTML attributes.
    const settings = {
        enabled: document.documentElement.dataset.radiation !== "off",
        count: Number(document.documentElement.dataset.radiationCount) || 1,
        opacity: Number(document.documentElement.dataset.radiationOpacity) || 0.85
    };

    if (!settings.enabled) return;

    const colors = [
        "#00e5ff",
        "#a855f7",
        "#ff3cac",
        "#7cff6b",
        "#ffffff"
    ];

    const canvas = document.createElement("canvas");
    canvas.id = "radiation-canvas";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "0",
        opacity: String(Math.min(1, Math.max(0, settings.opacity)))
    });

    // Insert behind the page's visible content.
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        canvas.remove();
        return;
    }

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let width = 0;
    let height = 0;
    let particles = [];
    let animationId = null;
    let lastFrame = 0;

    // Radiation intensity increases over time.
    const START_PARTICLES = Math.min(60, Math.max(1, settings.count));
    const MAX_PARTICLES = 60;
    const GROWTH_INTERVAL = 5000; // Add intensity every 5 seconds

    let activeParticleCount = START_PARTICLES;
    let elapsedGrowthTime = 0;

    window.__urRadiationOverdrive = () => {
        activeParticleCount = Math.min(
            MAX_PARTICLES,
            activeParticleCount * 2
        );
    
        for (let i = 0; i < activeParticleCount; i++) {
            if (!particles[i]) {
                particles[i] = createParticle(true);
            }
        }
    };

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createParticle(initial = false) {
        const angle = random(0, Math.PI * 2);
        const speed = random(280, 950);

        return {
            x: random(0, width),
            y: random(0, height),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle,
            life: initial ? random(0, 1) : 0,
            maxLife: random(0.25, 1.1),
            length: random(10, 42),
            thickness: random(0.7, 2),
            color: colors[Math.floor(Math.random() * colors.length)]
        };
    }

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        particles = Array.from(
            { length: MAX_PARTICLES },
            (_, i) => i < activeParticleCount
                ? createParticle(true)
                : null
        );
    }

    function drawParticle(p) {
        const fade = Math.min(
            1,
            p.life / 0.12,
            (p.maxLife - p.life) / 0.12
        );

        if (fade <= 0) return;

        ctx.globalAlpha = fade;

        ctx.beginPath();
        ctx.moveTo(
            p.x - Math.cos(p.angle) * p.length,
            p.y - Math.sin(p.angle) * p.length
        );
        ctx.lineTo(p.x, p.y);

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.thickness;
        ctx.lineCap = "round";
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.thickness * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function animate(timestamp) {
        if (reducedMotion.matches || document.hidden) {
            stop();
            return;
        }

        const dt = lastFrame
            ? Math.min((timestamp - lastFrame) / 1000, 0.05)
            : 0;

            const elapsed = lastFrame ? (timestamp - lastFrame) / 1000 : 0;
            lastFrame = timestamp;
            
            elapsedGrowthTime += elapsed * 1000;
            
            while (
                elapsedGrowthTime >= GROWTH_INTERVAL &&
                activeParticleCount < MAX_PARTICLES
            ) {
                elapsedGrowthTime -= GROWTH_INTERVAL;
                activeParticleCount++;
            
                // Introduce a new particle as the intensity grows.
                particles[activeParticleCount - 1] = createParticle(true);
            }
            
            ctx.clearRect(0, 0, width, height);
            
            for (let i = 0; i < activeParticleCount; i++) {
            const p = particles[i];

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life += dt;

            const outside =
                p.x < -60 || p.x > width + 60 ||
                p.y < -60 || p.y > height + 60;

            if (p.life >= p.maxLife || outside) {
                particles[i] = createParticle();
                continue;
            }

            drawParticle(p);
        }

        animationId = requestAnimationFrame(animate);
    }

    function start() {
        if (animationId !== null || reducedMotion.matches || document.hidden) {
            return;
        }

        lastFrame = 0;
        animationId = requestAnimationFrame(animate);
    }

    function stop() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        ctx.clearRect(0, 0, width, height);
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden || reducedMotion.matches) {
            stop();
        } else {
            start();
        }
    });

    reducedMotion.addEventListener("change", () => {
        if (reducedMotion.matches) {
            stop();
        } else {
            start();
        }
    });

    window.addEventListener("resize", resizeCanvas);

    // Keep the canvas behind ordinary page content.
    document.addEventListener("DOMContentLoaded", () => {
        canvas.style.zIndex = "0";
    });

    resizeCanvas();
    start();
})();