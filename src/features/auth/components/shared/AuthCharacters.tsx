"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";

import "./auth-stage.css";

export interface CastHandle {
  error: () => void;
  happy: () => void;
}

interface Character {
  cx: number;
  k: number;
  i: number;
  d: string;
  body: React.ReactNode;
  eyes: [number, number][];
  scleras: boolean;
  mouth: [number, number, number];
  sy: number;
}

const CHARACTERS: Character[] = [
  {
    cx: 210, k: 1, i: 0, d: ".15s",
    body: <rect x="150" y="90" width="120" height="310" fill="#7e2bf1" />,
    eyes: [[188, 140], [232, 140]], scleras: true, mouth: [211, 172, 1], sy: 0.93,
  },
  {
    cx: 292, k: 0.7, i: 1, d: ".3s",
    body: (
      <>
        <rect x="252" y="205" width="80" height="195" fill="#2a1659" />
        <path d="M244 200l48-18 48 18-48 18z" fill="#12082b" />
        <path d="M340 200v20" stroke="#f4c01e" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
    eyes: [[276, 244], [308, 244]], scleras: true, mouth: [292, 268, 0.9], sy: 0.97,
  },
  {
    cx: 150, k: 0.25, i: 2, d: "0s",
    body: <path d="M42 400A108 108 0 0 1 258 400Z" fill="#ff8a2b" />,
    eyes: [[118, 354], [162, 354]], scleras: false, mouth: [140, 376, 1], sy: 0.97,
  },
  {
    cx: 372, k: 0.5, i: 3, d: ".45s",
    body: <path d="M335 400V292a37 37 0 0 1 74 0V400Z" fill="#f4c01e" />,
    eyes: [[355, 294], [389, 294]], scleras: false, mouth: [372, 318, 0.8], sy: 0.97,
  },
];

function Mouth({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g
      className="mouth"
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke="#111"
      strokeWidth="2.6"
      strokeLinecap="round"
    >
      <path className="m-idle" d="M-8 0q8 7 16 0" />
      <path className="m-flat" d="M-7 2h14" />
      <ellipse className="m-o" rx="3.5" ry="4.5" fill="#111" />
      <path className="m-sad" d="M-8 5q8-8 16 0" />
      <path className="m-happy" d="M-11-2q11 16 22 0z" fill="#111" />
    </g>
  );
}

/**
 * Decorative characters whose eyes follow the cursor / the focused field.
 * Purely visual: it only reads focus + mouse position from the document and
 * never touches form state. Parent calls ref.error() / ref.happy().
 */
export default function AuthCharacters({ ref }: { ref?: Ref<CastHandle> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const state = useRef({ happy: false, errorUntil: 0 });
  const renderRef = useRef<() => void>(() => {});

  useImperativeHandle(ref, () => ({
    error() {
      const svg = svgRef.current;
      if (!svg) return;
      state.current.happy = false;
      state.current.errorUntil = Date.now() + 2600;
      svg.classList.remove("shake");
      void svg.getBoundingClientRect();
      svg.classList.add("shake");
      renderRef.current();
      window.setTimeout(() => renderRef.current(), 2650);
    },
    happy() {
      state.current.happy = true;
      renderRef.current();
    },
  }));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const chars = CHARACTERS.map((c, n) => {
      const el = svg.querySelector<SVGGElement>(`#auth-c${n}`)!;
      return { ...c, el, eyes: Array.from(el.querySelectorAll<SVGGElement>(".eye")) };
    });

    let mouse = { x: window.innerWidth * 0.35, y: window.innerHeight * 0.4 };

    function mood(): string {
      if (state.current.happy) return "happy";
      if (Date.now() < state.current.errorUntil) return "error";
      const a = document.activeElement as HTMLInputElement | null;
      if (a && a.matches?.("input[data-pw]")) return a.type === "text" ? "peek" : "pass";
      if (a && a.matches?.("input:not([type=checkbox])")) return "email";
      return "idle";
    }

    function render() {
      if (!svg) return;
      const m = mood();
      svg.dataset.mood = m;
      const r = svg.getBoundingClientRect();
      const sc = r.width / 480;
      const a = document.activeElement as HTMLInputElement | null;
      let t = mouse;
      if (m === "email" && a) {
        const b = a.getBoundingClientRect();
        t = { x: Math.min(b.left + 12 + a.value.length * 9, b.right), y: b.top + b.height / 2 };
      } else if (m === "peek" && a) {
        const b = a.getBoundingClientRect();
        t = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      } else if (m === "pass") {
        t = { x: r.left - 600, y: r.top + r.height * 0.7 };
      }

      chars.forEach((c) => {
        let lean = Math.max(-1, Math.min(1, (t.x - (r.left + c.cx * sc)) / (110 * sc))) * 6 * c.k;
        let sy = 1;
        if (m === "pass") lean = -8 * c.k;
        if (m === "error") { lean = -6 * c.k; sy = c.sy; }
        if (m === "happy") lean = 0;
        c.el.style.setProperty("--lean", lean.toFixed(2));
        c.el.style.setProperty("--sy", String(sy));

        c.eyes.forEach((e) => {
          const pu = e.querySelector<SVGElement>(".pu");
          if (!pu) return;
          const b = e.getBoundingClientRect();
          const max = Number(pu.dataset.max);
          let dx = t.x - (b.left + b.width / 2);
          let dy = t.y - (b.top + b.height / 2);
          if (m === "error") { dx = 0; dy = 1; }
          if (m === "happy") { dx = 0; dy = 0; }
          const d = Math.hypot(dx, dy) || 1;
          const f = Math.min(1, d / 80) * max;
          pu.style.transform = `translate(${((dx / d) * f).toFixed(2)}px,${((dy / d) * f).toFixed(2)}px)`;
        });
      });
    }
    renderRef.current = render;

    const onMove = (e: MouseEvent) => { mouse = { x: e.clientX, y: e.clientY }; render(); };
    // Password show/hide toggles input.type after React re-renders.
    const onClick = () => window.setTimeout(render, 0);
    const onFocusOut = () => window.setTimeout(render, 0);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", render);
    document.addEventListener("focusin", render);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", render);
    document.addEventListener("click", onClick);

    const blink = window.setInterval(() => {
      if (svg.dataset.mood === "pass" || svg.dataset.mood === "happy") return;
      const es = svg.querySelectorAll(".eye");
      es.forEach((e) => e.classList.add("blink"));
      window.setTimeout(() => es.forEach((e) => e.classList.remove("blink")), 130);
    }, 3200);

    render();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", render);
      document.removeEventListener("focusin", render);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", render);
      document.removeEventListener("click", onClick);
      window.clearInterval(blink);
      renderRef.current = () => {};
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="auth-cast block w-full overflow-visible max-md:mx-auto max-md:w-[min(100%,380px)]"
      viewBox="0 0 480 400"
      data-mood="idle"
      aria-hidden="true"
    >
      {CHARACTERS.map((c, n) => (
        <g key={n} className="rise" style={{ "--d": c.d } as React.CSSProperties}>
          <g className="bob" style={{ "--i": c.i } as React.CSSProperties}>
            <g className="char" id={`auth-c${n}`}>
              {c.body}
              {c.eyes.map(([x, y], j) => (
                <g key={j} transform={`translate(${x} ${y})`}>
                  <g className="eye">
                    <circle r={c.scleras ? 6.5 : 5} fill={c.scleras ? "#fff" : "none"} />
                    <circle
                      className="pu"
                      r={c.scleras ? 2.8 : 3.6}
                      fill="#111"
                      data-max={c.scleras ? 3.2 : 2}
                    />
                  </g>
                </g>
              ))}
              <Mouth x={c.mouth[0]} y={c.mouth[1]} s={c.mouth[2]} />
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
