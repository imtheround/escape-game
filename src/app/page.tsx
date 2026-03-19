"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("../components/GameCanvas"), {
  ssr: false,
});

function Heart({ type }: { type: "full" | "half" | "empty" }) {
  return (
    <svg width="24" height="24" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
      {/* Black Outline */}
      <path d="M1 2h2v1H1zM3 1h1v1H3zM5 1h1v1H5zM6 2h2v1H6zM8 3h1v2H8zM0 3h1v2H0zM1 5h1v1H1zM2 6h1v1H2zM3 7h1v1H3zM4 8h1v1H4zM5 7h1v1H5zM6 6h1v1H6zM7 5h1v1H7z" fill="#000" />
      
      {/* Base Background (Empty state) */}
      <path d="M1 3h7v2H1z" fill="#4a0000" />
      <path d="M2 5h5v1H2z" fill="#4a0000" />
      <path d="M3 6h3v1H3z" fill="#4a0000" />
      <path d="M4 7h1v1H4z" fill="#4a0000" />

      {/* Fill states based on type */}
      {type === "full" && (
        <>
          <path d="M1 3h7v2H1z" fill="#ff0000" />
          <path d="M2 5h5v1H2z" fill="#ff0000" />
          <path d="M3 6h3v1H3z" fill="#ff0000" />
          <path d="M4 7h1v1H4z" fill="#ff0000" />
          {/* Shine */}
          <rect x="2" y="3" width="1" height="1" fill="#fff" />
        </>
      )}
      {type === "half" && (
        <>
          <path d="M1 3h3v2H1z" fill="#ff0000" />
          <path d="M2 5h2v1H2z" fill="#ff0000" />
          <path d="M3 6h1v1H3z" fill="#ff0000" />
          <path d="M4 7h1v1H4z" fill="#ff0000" />
          {/* Shine */}
          <rect x="2" y="3" width="1" height="1" fill="#fff" />
        </>
      )}
    </svg>
  );
}

export default function Home() {
  const [hp, setHp] = useState(10);

  useEffect(() => {
    const handleHpChange = (e: any) => setHp(e.detail);
    window.addEventListener("hp-change", handleHpChange);
    return () => window.removeEventListener("hp-change", handleHpChange);
  }, []);

  const hearts = [];
  for (let i = 0; i < 5; i++) {
    const heartVal = hp - i * 2;
    if (heartVal >= 2) hearts.push("full");
    else if (heartVal === 1) hearts.push("half");
    else hearts.push("empty");
  }

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden m-0 p-0 text-white font-sans select-none">
      <GameCanvas />
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none">
        {/* Minecraft HP Bar */}
        <div className="flex gap-1 items-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          {hearts.map((type, i) => (
            <Heart key={i} type={type as "full" | "half" | "empty"} />
          ))}
          {hp <= 0 && <span className="ml-2 text-red-500 font-black tracking-wider animate-bounce">GAME OVER</span>}
        </div>
      </div>
    </main>
  );
}
