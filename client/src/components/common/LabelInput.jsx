import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* ══ Label input ══════════════════════════════════════════
   A field whose label is its placeholder until you are in it.
   On focus the label lifts into the top edge with a small hop
   running along its letters, the outline darkens in place, and
   the top line parts under the label from its middle outward.

   ── ONE THING MOVES ─────────────────────────────────────
   It used to DRAW its outline out of the notch, both ways
   round the field — and that was the field performing, which
   is too much for a thing you focus forty times a day. Now the
   outline is always whole; focus only changes its ink and
   opens the gap. The label is the event, and the line makes
   room for it.

   The gap is two short paths across the notch, each from the
   middle to one side, retracted from the middle outward by a
   negative dash offset.

   ── PORTED FROM TSX ──────────────────────────────────────
   Written as TypeScript upstream. This app is plain JSX, so the
   type annotations are gone and the `as React.CSSProperties`
   casts are dropped; everything else is byte-for-byte. Two
   project-specific notes:

   - The custom properties it reads (--ink, --ink-3, --ink-4,
     --ink-rgb, --fill-on, --font-ui) are NOT Bencho's. They are
     defined locally on `.lbi` and mapped onto this project's own
     palette. See the token block in src/index.css.
   - It is deliberately UNLAYERED in index.css. `@layer base` there
     force-sets `background-color` and `color` on every input, and
     unlayered rules outrank layered ones — that is what keeps this
     field's `background: transparent` intact. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const W = 280;
const H = 52;
/* the lifted label's size, against its resting one */
const S = 0.78;
/* the stroke sits half a stroke inside the box so none of it
   is clipped by the svg's own edge */
const IN = 0.75;

export function LabelInput({
  field = "Email",
  /* what the label reads. Defaults to the field's own name, which
     is all the showcase ever needs; a real form passes its own
     translated string. */
  label: labelProp,
  /* the field's corner, px — at half the height it is a pill */
  corner = 14,
  /* a showcase, not a form: on a touch screen, keep the device's
     keyboard down. Off by default — a real field wants its
     keyboard — and the bench turns it on for its feed */
  showcase = false,

  /* ── FORM WIRING (added for this app) ─────────────────────
     Upstream this owns its own value, which is fine on a bench and
     useless in a form. Passing `value` hands control to the parent;
     omitting it keeps the original self-contained behaviour, so
     nothing else about the component has to change. */
  value: valueProp,
  onChange,
  name,
  required = false,
  autoComplete,
}) {
  const r = clamp(corner, 0, H / 2);
  const secret = field === "Password";
  const label = labelProp ?? (secret ? "Password" : "Email");
  const id = `lbi-${useId().replace(/:/g, "")}`;

  const [focus, setFocus] = useState(false);
  const [quiet] = useState(() => showcase && typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  /* controlled when the parent passes `value`, self-owned otherwise */
  const [internal, setInternal] = useState("");
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : internal;
  const setValue = (next) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  const [show, setShow] = useState(false);
  const [flip, setFlip] = useState(0);
  const input = useRef(null);

  /* the notch is the label's own width, so it is measured */
  const lab = useRef(null);
  const [lw, setLw] = useState(40);
  useLayoutEffect(() => {
    if (lab.current) setLw(lab.current.offsetWidth);
  }, [label]);

  /* a different kind of field starts empty — an email left in
     a password box would be shown in the clear. The first run is
     skipped: controlled, that would fire onChange("") on mount and
     wipe whatever the parent had already put in the box. */
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    setValue("");
    setShow(false);
  }, [field]);

  const up = focus || value.length > 0;

  /* ── where the label sits, and the gap it leaves ─────────
     Never inside the corner's curve: the notch has to open on
     the straight part of the top edge, so a rounder field
     starts its label further in. */
  const lx = Math.max(14, r + 4);
  const x0 = Math.max(r * 0.6, lx - 5);
  const x1 = lx + lw * S + 5;
  const a = r - IN;
  const R = W - IN;
  const B = H - IN;
  const mid = W / 2;
  /* the gap, as two halves from its middle to each side */
  const nm = (x0 + x1) / 2;
  const gapL = `M${nm},${IN} L${x0},${IN}`;
  const gapR = `M${nm},${IN} L${x1},${IN}`;
  /* right: from the notch, clockwise, to the bottom middle */
  const right = r > 0
    ? `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`
    : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;
  /* left: from the notch, the other way round, to the same point */
  const left = r > 0
    ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
    : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

  const reveal = () => {
    setShow((s) => !s);
    setFlip((f) => f + 1);
  };

  return (
    <div className="lbi" data-up={up} data-focus={focus} data-filled={value.length > 0}>
      <div
        className="lbi-box"
        style={{ width: W, height: H, borderRadius: r, "--lbi-x": `${lx}px` }}
      >
        <svg className="lbi-ring" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={right} />
          <path d={left} />
          <path className="lbi-gap" d={gapL} pathLength={1} />
          <path className="lbi-gap" d={gapR} pathLength={1} />
        </svg>

        <label className="lbi-label" htmlFor={id} ref={lab}>
          {[...label].map((ch, i) => (
            <span key={i} style={{ "--i": i }}>{ch}</span>
          ))}
        </label>

        <input
          ref={input}
          id={id}
          className="lbi-field"
          data-flip={flip % 2}
          type={secret && !show ? "password" : secret ? "text" : "email"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          name={name}
          required={required}
          autoComplete={autoComplete ?? "off"}
          spellCheck={false}
          /* ── no keyboard, when it is only being shown ─────
             In a feed you are scrolling on a phone, a tap that
             lands on the field threw the keyboard up over the
             page. inputMode "none" keeps everything the block is
             about — the focus, the label lifting, the gap
             opening — and only tells the device not to raise its
             keyboard. A mouse and a hardware keyboard are
             untouched, and so is any real use of this field. */
          inputMode={quiet ? "none" : undefined}
          style={{ paddingRight: secret ? 48 : lx }}
        />

        {secret && (
          <button
            className="lbi-eye"
            type="button"
            data-show={show}
            /* keep focus in the field: the eye is a toggle on
               what you are typing, not somewhere to go */
            onPointerDown={(e) => e.preventDefault()}
            onClick={reveal}
            aria-label={show ? "Hide password" : "Show password"}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export default LabelInput;
