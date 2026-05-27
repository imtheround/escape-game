"use client";

import { useEffect, useRef } from 'react';
import { GameManager } from '../game/GameManager';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;
    let manager: GameManager | null = null;

    const initPixi = async () => {
      try {
        manager = new GameManager();
        await manager.init(containerRef.current!);
        if (isCancelled) {
          manager.destroy();
        } else {
          gameManagerRef.current = manager;
        }
      } catch (e) {
        console.error('Game init failed:', e);
        window.dispatchEvent(new CustomEvent('assets-loaded'));
        window.dispatchEvent(new CustomEvent('generation-end'));
      }
    };

    initPixi();

    return () => {
      isCancelled = true;
      if (manager) manager.destroy();
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy();
        gameManagerRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full overflow-hidden bg-black absolute inset-0" />;
}
