"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";
import { VolleyballIcon } from "./volleyball";

/** Read by the inline script in the root layout too, so returning visitors never see a flash of it. */
const SEEN_KEY = "convoley:intro-seen";

// Silhouette sprite: a real spike rotoscoped from a free Pexels clip, one 287x360 cell per frame.
const SPRITE_URL = "/intro/spike.webp";
const CELL_W = 287;
const CELL_H = 360;
const COLS = 10;
const FRAMES = 81;
const FPS = 30;
const CONTACT_FRAME = 54; // the hitting hand at its highest point: the ball leaves here
const HAND = [207, 12]; // hitting hand in the contact frame, in cell pixels
const START_FRAME = 10; // skip the standing start: he is already lifting his arms to jump
const RISE_FRAMES = 12; // he comes up from below the screen over these frames
const DROP_FROM_FRAME = 68; // he lands after the arm comes down: the shadow falls away from here
const DROP_MS = 800;
const SHADOW = "#0b1640";
const SHADOW_OPACITY = 0.78; // half-transparent and blurred, it hides the small cutout errors
const MAX_LOAD_MS = 2500; // on a slow connection, skip the intro rather than make people wait
const FADE_OUT_MS = 400;

type Point = { x: number; y: number };

/**
 * First-visit splash: a player's shadow rises behind the name and spikes; the ball fills the two "o".
 * Plays once per device, never with reduced motion, and a tap skips it.
 */
export function IntroSplash() {
  const [done, setDone] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLSpanElement>(null);
  const hitRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (
      root.hasAttribute("data-intro-seen") ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // CSS already hides it in both cases
    }
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage blocked (private mode): it just plays again next time.
    }
    // The two "o" start empty (hidden by CSS from the first paint); the spike fills the right one
    // first and the ball bounces back to the left one.
    const [leftBall, rightBall] = wordRef.current!.querySelectorAll<SVGElement>("svg");
    let cancelled = false;
    let started = false;
    const finish = async () => {
      if (cancelled) return;
      cancelled = true;
      await stageRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: FADE_OUT_MS,
        fill: "forwards",
      }).finished;
      setDone(true);
    };
    loadSprite()
      .then((sheet) => (cancelled ? undefined : play(sheet, () => cancelled)))
      .then(finish, finish);
    const timeout = setTimeout(() => {
      if (!started) finish();
    }, MAX_LOAD_MS);

    async function play(sheet: ImageBitmap, isCancelled: () => boolean) {
      started = true;
      const stage = stageRef.current!,
        fig = figRef.current!,
        word = wordRef.current!,
        fly = flyRef.current!,
        hit = hitRef.current!;
      const ctx = fig.getContext("2d")!;
      await document.fonts.ready;

      const relative = (rect: DOMRect): Point => {
        const s = stage.getBoundingClientRect();
        return { x: rect.left - s.left + rect.width / 2, y: rect.top - s.top + rect.height / 2 };
      };
      const handPoint = (): Point => {
        const r = fig.getBoundingClientRect(),
          s = stage.getBoundingClientRect();
        return {
          x: r.left - s.left + (HAND[0] / CELL_W) * r.width,
          y: r.top - s.top + (HAND[1] / CELL_H) * r.height,
        };
      };

      let spikeDone: Promise<void> = Promise.resolve();
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          if (isCancelled()) return resolve();
          const elapsed = Math.max(0, now - start);
          const f = Math.min(FRAMES - 1, START_FRAME + Math.floor((elapsed / 1000) * FPS));
          drawFrame(ctx, sheet, f);
          const rise = Math.min(1, (f - START_FRAME) / RISE_FRAMES),
            easeOut = 1 - (1 - rise) ** 3;
          const after =
            Math.max(0, elapsed - ((DROP_FROM_FRAME - START_FRAME) / FPS) * 1000) / DROP_MS;
          const drop = Math.min(1, after) ** 2;
          fig.style.transform = `translateY(${(1 - easeOut) * 320 + drop * 380}px)`;
          fig.style.opacity = String(Math.min(1, 0.35 + rise) * (1 - drop) * SHADOW_OPACITY);
          if (f >= CONTACT_FRAME && !spiked) {
            spiked = true;
            spikeDone = spike({
              from: handPoint(),
              first: rightBall,
              second: leftBall,
              fly,
              hit,
              word,
              relative,
            });
          }
          if (after < 1) requestAnimationFrame(frame);
          else resolve();
        };
        let spiked = false;
        requestAnimationFrame(frame);
      });
      await spikeDone;
      await wait(FADE_OUT_MS);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  if (done) return null;
  return (
    <div
      ref={stageRef}
      onClick={() => setDone(true)}
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[radial-gradient(70%_45%_at_50%_30%,oklch(0.62_0.17_255),oklch(0.47_0.2_262)_55%,oklch(0.27_0.13_262))] [--ball-seam:oklch(0.27_0.13_262)] [--logo-ball-outline:transparent] motion-reduce:hidden [html[data-intro-seen]_&]:hidden"
    >
      <canvas
        ref={figRef}
        width={CELL_W}
        height={CELL_H}
        className="absolute top-[calc(50%-168px)] left-1/2 -ml-[275px] h-[540px] w-[431px] opacity-0 blur-[5px] [mask-image:linear-gradient(black_48%,transparent_80%)]"
      />
      <div
        ref={wordRef}
        className="relative z-[2] text-white [&_[data-logo-accent]]:text-brand-ball [&_svg:has(circle)]:opacity-0"
      >
        <Logo className="text-[52px]" />
      </div>
      <span
        ref={hitRef}
        className="pointer-events-none absolute top-0 left-0 z-[3] -mt-5 -ml-5 size-10 rounded-full border-[3px] border-brand-ball opacity-0"
      />
      <span ref={flyRef} className="pointer-events-none absolute top-0 left-0 z-[3] opacity-0">
        <VolleyballIcon className="size-full" />
      </span>
    </div>
  );
}

async function loadSprite(): Promise<ImageBitmap> {
  const response = await fetch(SPRITE_URL);
  if (!response.ok) throw new Error(`Intro sprite: ${response.status}`);
  return createImageBitmap(await response.blob());
}

/** Draws one frame of the sprite tinted as a flat shadow. */
function drawFrame(ctx: CanvasRenderingContext2D, sheet: ImageBitmap, index: number) {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, CELL_W, CELL_H);
  const sx = (index % COLS) * CELL_W,
    sy = Math.floor(index / COLS) * CELL_H;
  ctx.drawImage(sheet, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = SHADOW;
  ctx.fillRect(0, 0, CELL_W, CELL_H);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The ball flies from his hand at the camera into one "o", then bounces to the other. */
async function spike({
  from,
  first,
  second,
  fly,
  hit,
  word,
  relative,
}: {
  from: Point;
  first: SVGElement;
  second: SVGElement;
  fly: HTMLElement;
  hit: HTMLElement;
  word: HTMLElement;
  relative: (rect: DOMRect) => Point;
}) {
  const r0 = first.getBoundingClientRect(),
    o0 = relative(r0),
    o1 = relative(second.getBoundingClientRect());
  const size = r0.width;
  const at = (p: Point, rest: string) =>
    `translate(${p.x - size / 2}px,${p.y - size / 2}px) ${rest}`;
  const settle = (ball: SVGElement) => {
    ball.style.opacity = "1";
    ball.animate(
      [
        { transform: "scale(1.35,.65)" },
        { transform: "translateY(-14%) scale(.92,1.08)" },
        { transform: "none" },
      ],
      { duration: 360, easing: "ease-out" },
    );
  };
  fly.style.width = fly.style.height = `${size}px`;
  await fly.animate(
    [
      { opacity: 1, transform: at(from, "scale(.5) rotate(0deg)") },
      {
        opacity: 1,
        transform: at(
          { x: (from.x + o0.x) / 2, y: (from.y + o0.y) / 2 },
          "scale(1.9) rotate(260deg)",
        ),
        offset: 0.7,
      },
      { opacity: 1, transform: at(o0, "scale(1) rotate(420deg)") },
    ],
    { duration: 380, easing: "cubic-bezier(.55,0,.85,.55)", fill: "forwards" },
  ).finished;
  settle(first);
  hit.animate(
    [
      { opacity: 1, transform: `translate(${o0.x}px,${o0.y}px) scale(.4)` },
      { opacity: 0, transform: `translate(${o0.x}px,${o0.y}px) scale(2.2)` },
    ],
    { duration: 420, easing: "ease-out" },
  );
  word.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(3px)" },
      { transform: "translateY(0)" },
    ],
    { duration: 180 },
  );
  await fly.animate(
    [
      { opacity: 1, transform: at(o0, "rotate(420deg)") },
      {
        opacity: 1,
        transform: at({ x: (o0.x + o1.x) / 2, y: Math.min(o0.y, o1.y) - 85 }, "rotate(600deg)"),
      },
      { opacity: 1, transform: at(o1, "rotate(780deg)") },
    ],
    { duration: 560, easing: "cubic-bezier(.25,.6,.55,1)", fill: "forwards" },
  ).finished;
  // fill: "forwards" would keep the flying ball visible over the inline opacity.
  fly.getAnimations().forEach((animation) => animation.cancel());
  fly.style.opacity = "0";
  settle(second);
  await word.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }],
    {
      duration: 450,
      delay: 200,
      easing: "ease-out",
    },
  ).finished;
}
