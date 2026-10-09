/* ==========================================
   UNSTABLE REUNION — URANIUM-235 ATOM
   Exactly 92 protons + 143 neutrons
   Exactly 92 electrons
   No external libraries.
   ========================================== */

   (() => {
    "use strict";

    const canvas = document.getElementById("uranium-atom-canvas");
    if (!canvas || canvas.dataset.initialized === "true") return;
    canvas.dataset.initialized = "true";

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const PROTONS = 92;
    const NEUTRONS = 143;
    const ELECTRONS = 92;
    const shells = [2, 8, 18, 32, 21, 9, 2];

    // Scales the orbital system independently of the nucleus.
    // This prevents the outermost shell from being clipped.
    const ORBIT_SCALE = 0.875;

    const nucleons = [];
    const electrons = [];

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nucleusRadius = 0;
    let animationFrame = 0;
    let previousTime = 0;
    let rotationX = -0.25;
    let rotationY = 0.35;
    let spinVelocityX = 0;
    let spinVelocityY = 0;
    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let visible = !document.hidden;
    let destroyed = false;

    const TAU = Math.PI * 2;

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // --------------------------------------
    // NUCLEUS: exactly 235 nucleons
    // --------------------------------------
    function createNucleus() {
        nucleons.length = 0;

        for (let i = 0; i < PROTONS + NEUTRONS; i++) {
            const z = random(-1, 1);
            const angle = random(0, TAU);
            const radial = Math.sqrt(1 - z * z);
            const distance = Math.cbrt(Math.random()) * 0.91;

            nucleons.push({
                x: distance * radial * Math.cos(angle),
                y: distance * radial * Math.sin(angle),
                z: distance * z,
                phase: random(0, TAU),
                size: random(0.88, 1.12),
                proton: i < PROTONS
            });
        }
    }

    // --------------------------------------
    // ELECTRONS: exactly 92, in 7 shells
    // --------------------------------------
    function createElectrons() {
        electrons.length = 0;

        shells.forEach((count, shellIndex) => {
            for (let i = 0; i < count; i++) {
                electrons.push({
                    shell: shellIndex,
                    angle: (i / count) * TAU + shellIndex * 0.31,
                    speed: 0.22 + shellIndex * 0.035,
                    direction: shellIndex % 2 === 0 ? 1 : -1,
                    phase: random(0, TAU),
                    size: shellIndex < 2 ? 2.5 : 2.1
                });
            }
        });
    }

    createNucleus();
    createElectrons();

    // --------------------------------------
    // CANVAS SIZE
    // --------------------------------------
    function resize() {
        const rect = canvas.getBoundingClientRect();

        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Keep the nucleus prominent.
        // Orbit scaling is handled separately below.
        nucleusRadius = Math.min(width, height) * 0.15;
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // --------------------------------------
    // 3D ROTATION AND PERSPECTIVE
    // --------------------------------------
    function rotate3D(point, rx, ry) {
        const cx = Math.cos(rx);
        const sx = Math.sin(rx);
        const cy = Math.cos(ry);
        const sy = Math.sin(ry);

        const x1 = point.x * cy - point.z * sy;
        const z1 = point.x * sy + point.z * cy;
        const y2 = point.y * cx - z1 * sx;
        const z2 = point.y * sx + z1 * cx;

        return {
            x: x1,
            y: y2,
            z: z2
        };
    }

    function project(point, centerX, centerY, scale, depthUnit = 1) {
        const normalizedDepth = point.z / depthUnit;

        const perspective = clamp(
            3.4 / (3.4 + normalizedDepth * 0.32),
            0.65,
            1.35
        );

        return {
            x: centerX + point.x * scale * perspective,
            y: centerY + point.y * scale * perspective,
            z: point.z,
            perspective
        };
    }

    // --------------------------------------
    // BACKGROUND AURA
    // --------------------------------------
    function drawAura(cx, cy, time) {
        const pulse = reducedMotion
            ? 1
            : 1 + Math.sin(time * 1.2) * 0.035;

        // Smaller aura to keep its glow comfortably inside the canvas.
        const radius = nucleusRadius * 2.6 * pulse;

        const gradient = ctx.createRadialGradient(
            cx,
            cy,
            nucleusRadius * 0.1,
            cx,
            cy,
            radius
        );

        gradient.addColorStop(0, "rgba(255, 45, 65, 0.17)");
        gradient.addColorStop(0.25, "rgba(0, 145, 255, 0.10)");
        gradient.addColorStop(0.65, "rgba(120, 50, 255, 0.045)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.fill();
    }

    // --------------------------------------
    // ELECTRON ORBITAL SHELLS
    // --------------------------------------
    function orbitalPoint(angle, shellIndex, time) {
        // Original orbital spacing formula — preserved.
        const orbitRadius =
            nucleusRadius * (1.48 + shellIndex * 0.30);

        const planeAngle = shellIndex * 0.57;
        const planeTilt = 0.48 + shellIndex * 0.105;

        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;

        // Tilt each orbital plane differently in 3D.
        const y1 = y * Math.cos(planeTilt);
        const z1 = y * Math.sin(planeTilt);

        const x2 =
            x * Math.cos(planeAngle) -
            z1 * Math.sin(planeAngle);

        const z2 =
            x * Math.sin(planeAngle) +
            z1 * Math.cos(planeAngle);

        const rotated = rotate3D(
            { x: x2, y: y1, z: z2 },
            rotationX,
            rotationY
        );

        // Crucial fix: scale orbital coordinates after rotation.
        // The nucleus is not scaled or reduced by this factor.
        return {
            x: rotated.x * ORBIT_SCALE,
            y: rotated.y * ORBIT_SCALE,
            z: rotated.z * ORBIT_SCALE
        };
    }

    function drawOrbitals(cx, cy, time) {
        for (let shell = 0; shell < shells.length; shell++) {
            ctx.beginPath();

            const steps = 140;

            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * TAU;
                const point = orbitalPoint(angle, shell, time);

                const p = project(
                    point,
                    cx,
                    cy,
                    1,
                    nucleusRadius
                );

                if (i === 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }

            ctx.closePath();

            ctx.strokeStyle = shell % 2 === 0
                ? "rgba(0, 210, 255, 0.22)"
                : "rgba(165, 100, 255, 0.22)";

            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function drawElectrons(cx, cy, time) {
        const projectedElectrons = [];

        for (const electron of electrons) {
            const angle = reducedMotion
                ? electron.angle
                : electron.angle +
                  time * electron.speed * electron.direction;

            const point = orbitalPoint(
                angle,
                electron.shell,
                time
            );

            const p = project(
                point,
                cx,
                cy,
                1,
                nucleusRadius
            );

            projectedElectrons.push({
                ...p,
                electron
            });
        }

        projectedElectrons.sort((a, b) => a.z - b.z);

        for (const p of projectedElectrons) {
            const radius = p.electron.size * p.perspective;

            ctx.beginPath();
            ctx.fillStyle = "#8cecff";
            ctx.shadowColor = "#00d9ff";
            ctx.shadowBlur = reducedMotion ? 0 : 12;
            ctx.arc(p.x, p.y, radius, 0, TAU);
            ctx.fill();

            // Tiny bright core makes each electron look luminous.
            ctx.beginPath();
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.arc(
                p.x,
                p.y,
                radius * 0.42,
                0,
                TAU
            );
            ctx.fill();
        }

        ctx.shadowBlur = 0;
    }

    // --------------------------------------
    // SHADED SPHERES: PROTONS + NEUTRONS
    // --------------------------------------
    function drawSphere(x, y, radius, proton, depth) {
        const color = proton
            ? {
                light: "#ffb0b5",
                mid: "#ff3548",
                dark: "#70091d"
            }
            : {
                light: "#c0e7ff",
                mid: "#168dff",
                dark: "#082c70"
            };

        const gradient = ctx.createRadialGradient(
            x - radius * 0.32,
            y - radius * 0.38,
            radius * 0.05,
            x,
            y,
            radius * 1.12
        );

        gradient.addColorStop(0, color.light);
        gradient.addColorStop(0.28, color.mid);
        gradient.addColorStop(
            0.78,
            proton ? "#bd102f" : "#0756bd"
        );
        gradient.addColorStop(1, color.dark);

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();

        // Fine rim lighting creates a more spherical appearance.
        ctx.beginPath();
        ctx.strokeStyle = proton
            ? "rgba(255, 135, 150, 0.55)"
            : "rgba(110, 195, 255, 0.55)";

        ctx.lineWidth = Math.max(0.45, radius * 0.075);

        ctx.arc(
            x,
            y,
            radius * 0.94,
            -Math.PI * 0.82,
            Math.PI * 0.45
        );

        ctx.stroke();

        // Small specular highlight.
        ctx.beginPath();
        ctx.fillStyle =
            `rgba(255,255,255,${0.35 + depth * 0.04})`;

        ctx.arc(
            x - radius * 0.31,
            y - radius * 0.34,
            radius * 0.17,
            0,
            TAU
        );

        ctx.fill();
    }

    function drawNucleus(cx, cy, time) {
        const projected = [];

        for (const particle of nucleons) {
            const animated = {
                x: particle.x + (
                    reducedMotion
                        ? 0
                        : Math.sin(
                            time * 0.75 + particle.phase
                        ) * 0.012
                ),

                y: particle.y + (
                    reducedMotion
                        ? 0
                        : Math.cos(
                            time * 0.68 + particle.phase
                        ) * 0.012
                ),

                z: particle.z
            };

            const rotated = rotate3D(
                animated,
                rotationX,
                rotationY
            );

            const p = project(
                rotated,
                cx,
                cy,
                nucleusRadius
            );

            projected.push({
                ...p,
                proton: particle.proton,
                size: particle.size
            });
        }

        // Far-side nucleons are painted first.
        projected.sort((a, b) => a.z - b.z);

        for (const particle of projected) {
            const radius =
                nucleusRadius *
                0.128 *
                particle.size *
                particle.perspective;

            drawSphere(
                particle.x,
                particle.y,
                radius,
                particle.proton,
                particle.z
            );
        }
    }

    // --------------------------------------
    // MAIN RENDER LOOP
    // --------------------------------------
    function render(timestamp) {
        if (destroyed || !visible) return;

        const time = timestamp * 0.001;

        const delta = previousTime
            ? Math.min(
                (timestamp - previousTime) / 1000,
                0.05
            )
            : 0;

        previousTime = timestamp;

        if (!dragging && !reducedMotion) {
            // Keep the momentum from the user's last drag.
            rotationY += spinVelocityY * delta;
            rotationX += spinVelocityX * delta;
        
            // Gradually slow the spin, like physical friction.
            const friction = Math.pow(0.35, delta);
            spinVelocityX *= friction;
            spinVelocityY *= friction;
        
            // Continue the subtle idle rotation once the spin settles.
            if (
                Math.abs(spinVelocityX) < 0.025 &&
                Math.abs(spinVelocityY) < 0.025
            ) {
                rotationY += delta * 0.18;
                rotationX += Math.sin(time * 0.24) * delta * 0.035;
            }
        }

        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height * 0.455;

        drawAura(cx, cy, time);
        drawOrbitals(cx, cy, time);
        drawElectrons(cx, cy, time);
        drawNucleus(cx, cy, time);

        animationFrame = requestAnimationFrame(render);
    }

    // --------------------------------------
    // MOUSE / TOUCH ROTATION
    // --------------------------------------
    canvas.addEventListener("pointerdown", event => {
        dragging = true;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;

        if (canvas.setPointerCapture) {
            canvas.setPointerCapture(event.pointerId);
        }
    });

    canvas.addEventListener("pointermove", event => {
        if (!dragging) return;

        const dx = event.clientX - lastPointerX;
        const dy = event.clientY - lastPointerY;

        const sensitivity = 0.008;

        rotationY += dx * sensitivity;
        
        rotationX = clamp(
            rotationX + dy * sensitivity,
            -1.35,
            1.35
        );
        
        // Store the latest drag velocity for release momentum.
        spinVelocityY = dx * sensitivity * 12;
        spinVelocityX = dy * sensitivity * 12;
        
        // Prevent absurdly fast spins from a sudden large pointer jump.
        spinVelocityY = clamp(spinVelocityY, -8, 8);
        spinVelocityX = clamp(spinVelocityX, -8, 8);

        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
    });

    function stopDragging() {
        dragging = false;
    }

    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);
    canvas.addEventListener(
        "lostpointercapture",
        stopDragging
    );

    // --------------------------------------
    // PAUSE WHEN THE TAB IS HIDDEN
    // --------------------------------------
    document.addEventListener("visibilitychange", () => {
        visible = !document.hidden;

        if (visible && !destroyed) {
            previousTime = 0;
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(render);
        } else {
            cancelAnimationFrame(animationFrame);
        }
    });

    // Start rendering.
    animationFrame = requestAnimationFrame(render);

    // Clean up if the page is removed.
    window.addEventListener("pagehide", () => {
        destroyed = true;
        cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
    }, { once: true });


    // ==========================================
    // SECRET EASTER EGG: 235 INTERACTIONS
    // ==========================================
    let atomClicks = 0;
    let explosionTriggered = false;

    canvas.addEventListener("pointerdown", () => {
        if (explosionTriggered) return;

        atomClicks++;
        if (atomClicks >= 235) {
            explosionTriggered = true;
            triggerAtomExplosion();
        }
    });

    function triggerAtomExplosion() {
        const atom = canvas.closest(".uranium-atom");
        const avatar = canvas.closest(".member-avatar");
        const target = atom || canvas;

        destroyed = true;
        cancelAnimationFrame(animationFrame);

        const overlay = document.createElement("div");

        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            zIndex: "2147483647",
            overflow: "hidden",
            pointerEvents: "none"
        });

        document.body.appendChild(overlay);

        const flash = document.createElement("div");

        Object.assign(flash.style, {
            position: "absolute",
            inset: "0",
            background: "white",
            opacity: "0"
        });

        overlay.appendChild(flash);

        const particleCount = 470;
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const colors = [
            "#ffffff", "#ff3548", "#ff8b36",
            "#00d9ff", "#168dff", "#b56bff"
        ];

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement("div");
            const angle = Math.random() * Math.PI * 2;
            const distance =
                Math.hypot(window.innerWidth, window.innerHeight) *
                (0.45 + Math.random() * 0.65);
            const size = 2 + Math.random() * 6;

            Object.assign(particle.style, {
                position: "absolute",
                left: `${centerX}px`,
                top: `${centerY}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: Math.random() > 0.5 ? "50%" : "1px",
                background: colors[
                    Math.floor(Math.random() * colors.length)
                ],
                boxShadow: "0 0 10px currentColor",
                opacity: "1"
            });

            overlay.appendChild(particle);

            particle.animate([
                {
                    transform: "translate(-50%, -50%) scale(1)",
                    opacity: 1
                },
                {
                    transform:
                        `translate(calc(-50% + ${Math.cos(angle) * distance}px), ` +
                        `calc(-50% + ${Math.sin(angle) * distance}px)) ` +
                        `scale(${0.2 + Math.random() * 1.5})`,
                    opacity: 0
                }
            ], {
                duration: 1100 + Math.random() * 900,
                easing: "cubic-bezier(0.12, 0.7, 0.2, 1)",
                fill: "forwards"
            });
        }

        flash.animate([
            { opacity: 0, offset: 0 },
            { opacity: 1, offset: 0.12 },
            { opacity: 1, offset: 0.25 },
            { opacity: 1, offset: 0.40 },
            { opacity: 0, offset: 1 }
        ], {
            duration: 6500,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards"
        });

        setTimeout(() => {
            target.style.transition = "opacity 450ms ease";
            target.style.opacity = "0";

            if (avatar) {
                avatar.style.transition = "opacity 450ms ease";
                avatar.style.opacity = "0";
            }
        }, 500);

        setTimeout(() => {
            overlay.remove();

            if (typeof window.__urRadiationOverdrive === "function") {
                window.__urRadiationOverdrive();
            }
        }, 7000);
    }

    // Expose counts for browser-console debugging.
    canvas.dataset.protons = String(PROTONS);
    canvas.dataset.neutrons = String(NEUTRONS);
    canvas.dataset.electrons = String(ELECTRONS);
    canvas.dataset.nucleons = String(nucleons.length);
})();