"use client";

import { useEffect, useRef } from "react";

/**
 * Living hero — Otto bobs on the water; real water-bubbles rise off him and pop
 * into twinkles; each "herald" bubble blooms into one of his messages, cycling
 * across two card slots. Faithful port of the approved design's hero-anim.js
 * (Web Animations API), adapted to React: structure is rendered as JSX, the
 * imperative motion runs in an effect against refs, with full teardown on unmount.
 *
 * Client component (timers + WAAPI + DOM nodes). The continuous bob/ripple/glow
 * and card pop transitions live in marketing.css; this drives the conversation.
 */

interface Message {
  label: string;
  dot: string;
  glow: string;
  text: string;
}

const GREEN = "#10A074";
const AMBER = "#E0992B";
const SKY = "#3E91C9";

const MESSAGES: Message[] = [
  {
    label: "Otto's morning brief",
    dot: GREEN,
    glow: "rgba(16,160,116,.20)",
    text: "Payday's <b>Friday</b>, but Meralco is due <b>Saturday</b>. Want a Thursday heads-up?",
  },
  {
    label: "Gentle nudge",
    dot: AMBER,
    glow: "rgba(224,153,43,.20)",
    text: "You usually take Losartan at 8. It's 8:10 — done na?",
  },
  {
    label: "Routine",
    dot: GREEN,
    glow: "rgba(16,160,116,.20)",
    text: "Gym slot's open at 6pm. Block <b>30 minutes</b> for a workout?",
  },
  {
    label: "Money",
    dot: SKY,
    glow: "rgba(62,145,201,.20)",
    text: "<b>₱1,200</b> left in this week's food budget — right on track.",
  },
];

export default function HeroArt() {
  const layerRef = useRef<HTMLDivElement>(null);
  const slot1Ref = useRef<HTMLDivElement>(null);
  const slot2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const slots = [slot1Ref.current, slot2Ref.current];
    if (!layer || !slots[0] || !slots[1]) return;

    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    /** setTimeout that self-cleans and no-ops after teardown. */
    const after = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };

    function setCard(slot: HTMLElement, m: Message) {
      const label = slot.querySelector<HTMLElement>(".fc-label");
      const text = slot.querySelector<HTMLElement>(".fc-text");
      const dot = slot.querySelector<HTMLElement>(".dot");
      if (label) label.textContent = m.label;
      if (text) text.innerHTML = m.text;
      if (dot) {
        dot.style.background = m.dot;
        dot.style.boxShadow = "0 0 0 4px " + m.glow;
      }
    }

    const [m0, m1] = MESSAGES;
    if (!m0 || !m1) return;

    // Reduced motion: show two static cards, no animation.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCard(slots[0], m0);
      slots[0].classList.add("is-on");
      setCard(slots[1], m1);
      slots[1].classList.add("is-on");
      return;
    }

    /* ----- sparkle / twinkle burst at (x,y) within the layer ----- */
    function sparkle(x: number, y: number, big: boolean) {
      const host = layer as HTMLDivElement;
      const star = document.createElement("span");
      star.className = "spark-star";
      const s = big ? 26 : 18;
      star.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:translate(-50%,-50%)`;
      host.appendChild(star);
      star.animate(
        [
          { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 0 },
          { transform: "translate(-50%,-50%) scale(1) rotate(45deg)", opacity: 1, offset: 0.4 },
          { transform: "translate(-50%,-50%) scale(.2) rotate(90deg)", opacity: 0 },
        ],
        { duration: big ? 720 : 540, easing: "ease-out" },
      ).onfinish = () => star.remove();

      const ring = document.createElement("span");
      ring.className = "spark-ring";
      ring.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%)`;
      host.appendChild(ring);
      ring.animate(
        [
          { transform: "translate(-50%,-50%) scale(.2)", opacity: 0.8 },
          { transform: `translate(-50%,-50%) scale(${big ? 1.7 : 1.3})`, opacity: 0 },
        ],
        { duration: big ? 640 : 470, easing: "ease-out" },
      ).onfinish = () => ring.remove();

      const n = big ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const d = document.createElement("span");
        d.className = "spark-drop";
        d.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%)`;
        host.appendChild(d);
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
        const dist = (big ? 28 : 17) + Math.random() * 10;
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist;
        d.animate(
          [
            { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 },
          ],
          { duration: big ? 580 : 440, easing: "ease-out" },
        ).onfinish = () => d.remove();
      }
    }

    /* ----- ambient water bubbles drifting up off Otto ----- */
    function ambientBubble() {
      const host = layer as HTMLDivElement;
      const w = host.clientWidth;
      const h = host.clientHeight;
      // Don't pile up while the tab is backgrounded (WAAPI pauses, onfinish stalls).
      if (!w || document.hidden || host.childElementCount > 22) return;
      const size = 6 + Math.random() * 15;
      const x = w * (0.24 + Math.random() * 0.56);
      const startY = h * (0.56 + Math.random() * 0.22);
      const rise = 120 + Math.random() * 180;
      const drift = (Math.random() - 0.5) * 70;
      const b = document.createElement("span");
      b.className = "bubble";
      b.style.cssText = `left:${x - size / 2}px;top:${startY - size / 2}px;width:${size}px;height:${size}px`;
      host.appendChild(b);
      let done = false;
      const end = () => {
        if (done || cancelled) {
          b.remove();
          return;
        }
        done = true;
        sparkle(x + drift, startY - rise, false);
        b.remove();
      };
      b.animate(
        [
          { transform: "translate(0,0) scale(.4)", opacity: 0 },
          { transform: `translate(${drift * 0.3}px,${-rise * 0.15}px) scale(1)`, opacity: 0.85, offset: 0.15 },
          { transform: `translate(${drift}px,${-rise}px) scale(1.05)`, opacity: 0.6, offset: 0.92 },
          { transform: `translate(${drift}px,${-rise - 6}px) scale(1.5)`, opacity: 0 },
        ],
        { duration: 2600 + Math.random() * 2200, easing: "cubic-bezier(.42,0,.5,1)" },
      ).onfinish = end;
      after(() => {
        if (!done) b.remove();
      }, 6000); // hard fallback cleanup
    }

    /* ----- a herald bubble rises into a card slot, pops, reveals it ----- */
    function herald(slot: HTMLElement, cb: () => void) {
      const host = layer as HTMLDivElement;
      const cx = slot.offsetLeft + slot.offsetWidth / 2 + 6; // layer is inset; +6 ~ corrects offset
      const cy = slot.offsetTop + slot.offsetHeight / 2 + 24;
      const size = 30;
      const b = document.createElement("span");
      b.className = "bubble";
      b.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px`;
      host.appendChild(b);
      b.animate(
        [
          { transform: "translateY(72px) scale(.2)", opacity: 0 },
          { transform: "translateY(36px) scale(.7)", opacity: 0.85, offset: 0.42 },
          { transform: "translateY(0) scale(1)", opacity: 0.95, offset: 0.8 },
          { transform: "translateY(-4px) scale(1.5)", opacity: 0 },
        ],
        { duration: 780, easing: "cubic-bezier(.3,.7,.3,1)" },
      ).onfinish = () => {
        b.remove();
        if (cancelled) return;
        sparkle(cx, cy, true);
        cb();
      };
    }

    /* ----- the conversation loop ----- */
    let idx = 0;
    let slotI = 0;
    function cycle() {
      if (cancelled) return;
      const slot = slots[slotI % 2] as HTMLElement;
      const m = MESSAGES[idx % MESSAGES.length];
      if (!m) return;
      setCard(slot, m);
      herald(slot, () => {
        slot.classList.remove("is-off");
        slot.classList.add("is-on");
        after(() => {
          slot.classList.remove("is-on");
          slot.classList.add("is-off");
          const x = slot.offsetLeft + slot.offsetWidth / 2 + 6;
          const y = slot.offsetTop + 30;
          sparkle(x, y, false);
        }, 3500);
      });
      idx++;
      slotI++;
      after(cycle, 4700);
    }

    // kick things off
    after(cycle, 600);
    const interval = setInterval(() => {
      if (!cancelled) ambientBubble();
    }, 720);
    ambientBubble();
    ambientBubble();

    return () => {
      cancelled = true;
      clearInterval(interval);
      timers.forEach(clearTimeout);
      timers.clear();
      layer.replaceChildren();
      slots.forEach((s) => s?.classList.remove("is-on", "is-off"));
    };
  }, []);

  return (
    <div className="hero__art">
      <img className="hero__otter" src="/otto/assets/otto-mascot.png" alt="Otto the otter, floating" />
      <div className="bubble-layer" ref={layerRef} aria-hidden="true" />
      <div className="float-card fc-1" ref={slot1Ref}>
        <div className="fc-top">
          <span className="dot" /> <span className="fc-label">Otto&apos;s morning brief</span>
        </div>
        <p className="fc-text">
          Payday&apos;s <b>Friday</b>, but Meralco is due <b>Saturday</b>. Want a Thursday heads-up?
        </p>
      </div>
      <div className="float-card fc-2" ref={slot2Ref}>
        <div className="fc-top">
          <span className="dot" /> <span className="fc-label">Gentle nudge</span>
        </div>
        <p className="fc-text">You usually take Losartan at 8. It&apos;s 8:10 — done na?</p>
      </div>
    </div>
  );
}
