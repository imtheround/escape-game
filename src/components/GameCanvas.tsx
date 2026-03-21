"use client";

import { useEffect, useRef } from 'react';
import { GameManager } from '../game/GameManager';

interface GameCanvasProps {
  mode: 'wave' | 'dungeon';
}

export default function GameCanvas({ mode }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initPixi = async () => {
      const manager = new GameManager(mode);
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
  }, [mode]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden bg-black absolute inset-0" />;
}
