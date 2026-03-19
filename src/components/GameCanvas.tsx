"use client";

import { useEffect, useRef } from 'react';
import { GameManager } from '../game/GameManager';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initPixi = async () => {
      const manager = new GameManager();
      await manager.init(containerRef.current!);
      gameManagerRef.current = manager;
    };

    initPixi();

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy();
        gameManagerRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full overflow-hidden bg-black absolute inset-0" />;
}
