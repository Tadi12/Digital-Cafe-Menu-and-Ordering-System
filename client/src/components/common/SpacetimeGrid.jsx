import React, { useEffect, useRef } from 'react';

/**
 * A spacetime grid: a dot lattice that sits almost invisible until the pointer
 * drags a singularity across it, at which point the lattice bends into the well
 * and the dots crowd into a bright ring around a dark core.
 *
 * Canvas 2D only. No WebGL, no shader, no per-pixel work — every frame is a
 * handful of path fills.
 *
 * ------------------------------------------------------------------
 * The maths, in full
 * ------------------------------------------------------------------
 * There is exactly ONE falloff function in this file, and it is a Gaussian:
 *
 *     w(r) = mass * exp( -r^2 / 2*sigma^2 )
 *
 * `w` is the DEPTH of the well at distance `r` from the singularity. Everything
 * visible is derived from that single number:
 *
 *   - The bend. The force pulling a dot inward is the gradient of the well, which
 *     for a Gaussian is proportional to (r/sigma)*w. That product is zero where the
 *     sheet is level, largest in absolute terms at r = sigma (the taut lip of the
 *     funnel), and decays away with the Gaussian (the flat plain). Using the
 *     gradient rather than `w` itself is what makes the sheet look dragged by a
 *     weight instead of merely scaled toward a point.
 *
 *   - The ring. Two things peak near the centre and reinforce each other. The
 *     radial map r -> r' compresses hardest just outside the horizon, where its
 *     derivative is smallest, and the Gaussian is at its brightest there too — so
 *     dots crowd AND light up in the same band, at roughly 3x the density of the
 *     flat plane. Nothing draws that band; the crowding is the effect. It lands at
 *     about r = 0.33*sigma, NOT at the lip: the lip is where the sheet is pulled
 *     furthest, not where it bunches.
 *
 *   - The light. `w` also drives alpha and dot size, so the lattice brightens only
 *     where the sheet is deformed. Untouched regions sit at `baseAlpha`, which is
 *     the "almost invisible until the pointer arrives" state.
 *
 *   - The core. Dots whose original OR displaced position falls inside the horizon
 *     are never drawn, and a radial gradient is painted over the top, so the
 *     lattice looks swallowed rather than merely hidden. Together with the ring
 *     above, that is what makes the centre read as a singularity: an evacuated,
 *     darkened hole ringed by brighter, denser lattice.
 *
 * `verticalSqueeze` compresses the vertical axis harder than the horizontal one.
 * Seen from directly above, a radial well is just a zoom and reads as a lens; a
 * slight camera tilt is what makes it read as a dip.
 *
 * ------------------------------------------------------------------
 * Why it is fast
 * ------------------------------------------------------------------
 * A full-screen lattice is a few thousand dots. Setting fillStyle or globalAlpha
 * per dot would dominate the frame, so dots are quantised into a fixed number of
 * buckets — each with one pre-computed colour, alpha and size — and each bucket is
 * accumulated into a single path and filled once. Thousands of state changes become
 * at most BUCKETS fill calls.
 *
 * Dots further than CULL_SIGMAS from the singularity skip the exp entirely,
 * because exp(-4.5) is ~1% of peak and invisible at these alphas. The
 * overwhelming majority of the lattice therefore costs one multiply and a compare.
 */
const TAU = Math.PI * 2;

/** Quantisation levels for (alpha, size, colour). More levels = smoother, costlier. */
const BUCKETS = 14;

/** The Gaussian is negligible past this many sigma, so cull instead of evaluating exp. */
const CULL_SIGMAS = 3;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mixChannel = (from, to, t) => Math.round(lerp(from, to, t));

/** Precompute colour/alpha/size per bucket so the hot loop never builds a string. */
const buildBuckets = (baseAlpha, maxAlpha, dotSize, dim, hot) =>
  Array.from({ length: BUCKETS }, (_, i) => {
    const d = i / (BUCKETS - 1);
    return {
      alpha: baseAlpha + d * (maxAlpha - baseAlpha),
      size: dotSize + d * dotSize * 1.5,
      color: `rgb(${mixChannel(dim[0], hot[0], d)}, ${mixChannel(dim[1], hot[1], d)}, ${mixChannel(dim[2], hot[2], d)})`,
    };
  });

/**
 * Every prop is a primitive so the effect's dependency list is stable. Array and
 * object props would be fresh literals on each parent render and would tear down
 * and rebuild the canvas every time.
 */
const SpacetimeGrid = ({
  className = '',
  /** Lattice pitch in CSS px. Smaller = denser and more expensive. */
  spacing = 26,
  /** Pointer easing per frame, 0-1. Low = the singularity trails the cursor. */
  trailEase = 0.12,
  /** How fast the well grows and decays, 0-1. */
  massEase = 0.055,
  /** Idle time in ms before the well collapses and the lattice goes flat again. */
  idleDelay = 1100,
  /** Peak well strength as a multiple of the resting field. */
  mass = 1,
  /** Alpha of the lattice with no pointer anywhere near it. Deliberately tiny. */
  baseAlpha = 0.05,
  /** Alpha of a dot at the bottom of the well. */
  maxAlpha = 0.9,
  /** Radius of a resting dot; dots grow to 2.5x this at full depth. */
  dotSize = 1.4,
  /** How far the well reaches, as a fraction of the shorter viewport edge. */
  sigmaScale = 0.24,
  /** Extra compression on the vertical axis — the implied camera tilt. */
  verticalSqueeze = 0.74,
  dimR = 212,
  dimG = 163,
  dimB = 115,
  hotR = 255,
  hotG = 244,
  hotB = 217,
  coreColor = '18, 11, 13',
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Everything the frame loop mutates lives in a ref: none of it is React state,
    // so 60fps of animation causes zero re-renders.
    const s = {
      cx: 0,
      cy: 0,
      tx: 0,
      ty: 0,
      lastMove: -Infinity,
      speed: 0,
      mass: 0,
      w: 0,
      h: 0,
      dpr: 0,
      // Canvas origin within the viewport, cached by measure() so the pointer
      // handler can stay free of layout reads.
      left: 0,
      top: 0,
      sigma: 160,
      bend: 80,
      core: 26,
      seeded: false,
      // Set by the resize handler; the frame loop only re-measures when it is
      // true, so a steady-state frame does no layout read at all.
      dirty: true,
    };

    const dim = [dimR, dimG, dimB];
    const hot = [hotR, hotG, hotB];
    const buckets = buildBuckets(baseAlpha, maxAlpha, dotSize, dim, hot);

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Match the backing store to the element's CSS size, capped so 3x phones stay
     * sane. Only ever called from the resize handler (and once at startup) —
     * getBoundingClientRect is a layout read, and doing it inside the frame loop
     * would force a layout every frame.
     */
    const measure = () => {
      s.dirty = false;
      const rect = canvas.getBoundingClientRect();
      // Cached so the pointer handler never has to read layout. Refreshed on
      // resize and on scroll, which are the only things that move the canvas
      // relative to the viewport.
      s.left = rect.left;
      s.top = rect.top;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w === s.w && h === s.h && dpr === s.dpr) return;

      s.w = w;
      s.h = h;
      s.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Work in CSS px from here on so every tunable above stays in layout units.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const shorter = Math.min(w, h);
      s.sigma = clamp(shorter * sigmaScale, 90, 260);
      // Coupling between the well and the sheet, in px. Scaling it with sigma keeps
      // the bend proportional to the field's reach, so the effect looks the same on
      // a phone and on a desktop instead of vanishing on one and tearing on the
      // other. At the lip (r = sigma) this displaces a dot by bend * e^-0.5, so
      // bend ~ 0.5*sigma lands the peak of the funnel at roughly a third of sigma.
      s.bend = s.sigma * 0.5;
      s.core = s.sigma * 0.16;

      // Grow the well out of the middle on the first frame rather than sliding in
      // from a corner.
      if (!s.seeded) {
        s.seeded = true;
        s.cx = s.tx = w / 2;
        s.cy = s.ty = h / 2;
      }
    };

    const onResize = () => {
      s.dirty = true;
    };

    // Track the pointer on the window rather than the canvas: the grid is
    // pointer-events-none so it can sit under the hero's links without intercepting
    // a click, which means it cannot be the pointer target itself.
    const onPointerMove = (event) => {
      s.tx = event.clientX - s.left;
      s.ty = event.clientY - s.top;
      s.lastMove = performance.now();
    };

    const onPointerLeave = () => {
      s.lastMove = -Infinity;
    };

    /** Paint the resting lattice: one flat, near-invisible field. */
    const drawFlat = () => {
      if (s.dirty) measure();
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.beginPath();
      for (let y = spacing * 0.5; y < s.h; y += spacing) {
        for (let x = spacing * 0.5; x < s.w; x += spacing) {
          ctx.rect(x - 0.5, y - 0.5, 1, 1);
        }
      }
      ctx.fillStyle = buckets[0].color;
      ctx.globalAlpha = buckets[0].alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    // --- Reduced motion -----------------------------------------------------
    // The well is not drawn while the field is at rest, so with motion suppressed
    // there is nothing to animate: paint the flat lattice, keep it correct across
    // resizes, and never start a loop.
    if (reducedMotion) {
      drawFlat();
      // No loop is running here, so the resize handler has to repaint itself —
      // merely flagging the geometry dirty would leave a stale backing store that
      // the browser then stretches, blurring the whole lattice.
      const onFlatResize = () => {
        s.dirty = true;
        drawFlat();
      };
      window.addEventListener('resize', onFlatResize);
      return () => window.removeEventListener('resize', onFlatResize);
    }

    // One flat list per bucket, reused every frame: truncating the length keeps the
    // backing array, so a 60fps loop does not churn ~2000 numbers a frame.
    const collected = Array.from({ length: BUCKETS }, () => []);

    // Measure once up front so the geometry and the canvas origin are valid before
    // any pointermove can be handled — otherwise the first flick of the mouse would
    // be mapped against a not-yet-measured origin.
    measure();

    let frame = window.requestAnimationFrame(function render() {
      if (s.dirty) measure();

      const now = performance.now();
      const idle = now - s.lastMove > idleDelay;

      // The well collapses once the pointer has been still (or gone) for a moment.
      const wanted = idle ? 0 : mass;
      s.mass = lerp(s.mass, wanted, massEase);
      if (Math.abs(wanted - s.mass) < 0.001) s.mass = wanted;

      // A touch of speed dependence: dragging fast deepens the well slightly, the
      // way a weight dragged across a sheet disturbs it more than one at rest.
      const moved = Math.hypot(s.tx - s.cx, s.ty - s.cy);
      s.speed = lerp(s.speed, clamp(moved * 0.02, 0, 0.45), 0.1);
      const field = s.mass * (1 + s.speed);
      const deformed = field > 0.001;

      s.cx = lerp(s.cx, s.tx, trailEase);
      s.cy = lerp(s.cy, s.ty, trailEase);

      ctx.clearRect(0, 0, s.w, s.h);

      const { cx, cy, sigma, bend, core, w: W, h: H } = s;
      const invTwoSigmaSq = 1 / (2 * sigma * sigma);
      const cullSq = (sigma * CULL_SIGMAS) ** 2;
      const lastBucket = BUCKETS - 1;

      // One flat list per bucket, filled in a single pass afterwards, so no
      // fillStyle or globalAlpha assignment happens inside the inner loop.
      for (let i = 0; i < BUCKETS; i += 1) collected[i].length = 0;

      for (let y = spacing * 0.5; y < H; y += spacing) {
        for (let x = spacing * 0.5; x < W; x += spacing) {
          const dx = x - cx;
          const dy = y - cy;
          const d2 = dx * dx + dy * dy;

          // The cull, which is also the resting case: a dot with no well near it
          // lands in bucket 0 and costs one push.
          if (!deformed || d2 > cullSq) {
            collected[0].push(x, y);
            continue;
          }

          const r = Math.sqrt(d2);
          // The horizon swallows the dot, both where it started and where the well
          // would drag it to.
          if (r < core) continue;

          // ---- the one Gaussian ----
          const well = field * Math.exp(-d2 * invTwoSigmaSq);
          // ---- end Gaussian ----

          // Inward displacement = the well's gradient, |grad| ~ (r/sigma)*w, times
          // the coupling. The (r/sigma) factor is what makes the centre flat and the
          // lip taut: it is zero where the sheet is level, peaks at r = sigma, and
          // decays with the Gaussian, so the far plain is left undisturbed.
          const rd = r - bend * (r / sigma) * well;
          if (rd <= core) continue;

          const inv = 1 / r;
          const drawX = cx + dx * inv * rd;
          const drawY = cy + dy * inv * rd * verticalSqueeze;

          const depth = clamp(well * 1.15, 0, 1);
          const index = Math.min(lastBucket, (depth * lastBucket) | 0);
          collected[index].push(drawX, drawY);
        }
      }

      for (let i = 0; i < BUCKETS; i += 1) {
        const points = collected[i];
        if (!points.length) continue;
        const bucket = buckets[i];
        const half = bucket.size * 0.5;

        ctx.beginPath();
        for (let p = 0; p < points.length; p += 2) {
          ctx.rect(points[p] - half, points[p + 1] - half, bucket.size, bucket.size);
        }
        ctx.fillStyle = bucket.color;
        ctx.globalAlpha = bucket.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (deformed) {
        // --- The horizon ---------------------------------------------------
        // Painted OVER the lattice so the inner dots are occluded rather than
        // merely undrawn, which turns a hole in the dots into a hole in space.
        // Its width is tied to the Gaussian's own sigma so the darkness and the
        // bend agree on where the sheet begins to drop.
        const shade = ctx.createRadialGradient(cx, cy, core * 0.35, cx, cy, sigma * 0.62);
        shade.addColorStop(0, `rgba(${coreColor}, 0.92)`);
        shade.addColorStop(0.55, `rgba(${coreColor}, 0.5)`);
        shade.addColorStop(1, `rgba(${coreColor}, 0)`);
        ctx.fillStyle = shade;
        ctx.fillRect(cx - sigma, cy - sigma, sigma * 2, sigma * 2);

        // A thin warm rim on the horizon. Two arcs rather than shadowBlur, which
        // would be the one genuinely expensive call in the frame.
        ctx.beginPath();
        ctx.arc(cx, cy, core, 0, TAU);
        ctx.strokeStyle = `rgba(255, 226, 178, ${0.16 * s.mass})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, core * 0.86, 0, TAU);
        ctx.strokeStyle = `rgba(255, 240, 214, ${0.4 * s.mass})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      frame = window.requestAnimationFrame(render);
    });

    const onVisibility = () => {
      // Don't burn frames on a background tab.
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        frame = window.requestAnimationFrame(render);
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    spacing,
    trailEase,
    massEase,
    idleDelay,
    mass,
    baseAlpha,
    maxAlpha,
    dotSize,
    sigmaScale,
    verticalSqueeze,
    dimR,
    dimG,
    dimB,
    hotR,
    hotG,
    hotB,
    coreColor,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{
        // Fade the lattice out toward the edges so the field has no visible border
        // against the hero photograph. Compositor-only, so it costs nothing.
        WebkitMaskImage:
          'radial-gradient(ellipse 78% 72% at 50% 50%, #000 42%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 78% 72% at 50% 50%, #000 42%, transparent 100%)',
      }}
    />
  );
};

export default SpacetimeGrid;
