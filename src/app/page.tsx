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
  const [gameState, setGameState] = useState<'start' | 'playing_wave' | 'playing_dungeon' | 'gameover'>('start');
  const [hp, setHp] = useState(10);
  const [inventory, setInventory] = useState<{id: string, count: number}[]>(
    Array(12).fill(null).map((_, i) => i === 0 ? { id: 'gun', count: 1 } : { id: '', count: 0 })
  );
  const [activeSlot, setActiveSlot] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [ammo, setAmmo] = useState(30);
  const [maxAmmo, setMaxAmmo] = useState(30);
  const [isReloading, setIsReloading] = useState(false);
  
  // Wave & Economy States
  const [waveState, setWaveState] = useState({ wave: 1, gameState: 'playing', enemiesAlive: 0, enemiesToSpawn: 0, merchantTimer: 0 });
  const [expState, setExpState] = useState({ exp: 0, maxExp: 10, level: 1, maxHP: 10 });
  const [coins, setCoins] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [drinkingProgress, setDrinkingProgress] = useState<number | null>(null);
  
  // Instructions
  const [showItemInstruction, setShowItemInstruction] = useState(true);
  const [hasPickedUpPotion, setHasPickedUpPotion] = useState(false);

  useEffect(() => {
    const handleHpChange = (e: any) => {
      setHp(e.detail);
      if (e.detail <= 0) {
        setGameState('gameover');
      }
    };
    
    const handleInventoryChange = (e: any) => {
      const inv = e.detail.inventory;
      // Deep clone every slot object so React sees completely fresh references
      setInventory(inv.map((s: any) => ({ id: s.id, count: s.count })));
      setActiveSlot(e.detail.activeSlot);
      setIsInventoryOpen(e.detail.isInventoryOpen);
      setDrinkingProgress(e.detail.drinkingProgress !== undefined ? e.detail.drinkingProgress : null);
      
      const hasPotion = inv.some((slot: any) => slot.id === 'potion');
      if (hasPotion && !hasPickedUpPotion) {
        setHasPickedUpPotion(true);
        setShowItemInstruction(true);
        setTimeout(() => setShowItemInstruction(false), 6000);
      }
    };
    
    const handleAmmoChange = (e: any) => {
      setAmmo(e.detail.ammo);
      setMaxAmmo(e.detail.maxAmmo);
      setIsReloading(e.detail.isReloading);
    };
    
    const handleWaveChange = (e: any) => {
       setWaveState(e.detail);
       if (e.detail.gameState !== 'merchant') setShowShop(false);
    };
    const handleExpChange = (e: any) => setExpState(e.detail);
    const handleCoinChange = (e: any) => setCoins(e.detail.coins);
    
    const handleShopOpen = () => setShowShop(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setShowShop(false);
    };

    window.addEventListener("hp-change", handleHpChange);
    window.addEventListener("inventory-change", handleInventoryChange);
    window.addEventListener("ammo-change", handleAmmoChange);
    window.addEventListener("wave-change", handleWaveChange);
    window.addEventListener("exp-change", handleExpChange);
    window.addEventListener("coin-change", handleCoinChange);
    window.addEventListener("shop-open", handleShopOpen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("hp-change", handleHpChange);
      window.removeEventListener("inventory-change", handleInventoryChange);
      window.removeEventListener("ammo-change", handleAmmoChange);
      window.removeEventListener("wave-change", handleWaveChange);
      window.removeEventListener("exp-change", handleExpChange);
      window.removeEventListener("coin-change", handleCoinChange);
      window.removeEventListener("shop-open", handleShopOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasPickedUpPotion]);

  useEffect(() => {
    if ((gameState === 'playing_wave' || gameState === 'playing_dungeon') && !hasPickedUpPotion) {
      const t = setTimeout(() => setShowItemInstruction(false), 8000);
      return () => clearTimeout(t);
    }
  }, [gameState, hasPickedUpPotion]);

  const hearts = [];
  const totalHearts = Math.ceil(expState.maxHP / 2);
  for (let i = 0; i < totalHearts; i++) {
    const heartVal = hp - i * 2;
    if (heartVal >= 2) hearts.push("full");
    else if (heartVal === 1) hearts.push("half");
    else hearts.push("empty");
  }

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden m-0 p-0 text-white font-sans select-none">
      {(gameState === 'playing_wave' || gameState === 'playing_dungeon' || gameState === 'gameover') && <GameCanvas mode={gameState === 'playing_dungeon' ? 'dungeon' : 'wave'} />}
      
      {gameState === 'start' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
          <h1 className="text-6xl font-black text-red-600 mb-8 tracking-widest drop-shadow-[0_4px_4px_rgba(255,0,0,0.5)]">ESCAPE</h1>
          <div className="flex gap-8">
            <button 
              onClick={() => setGameState('playing_wave')}
              className="px-8 py-4 bg-[#333] border-4 border-white text-2xl font-bold hover:bg-white hover:text-black transition-colors"
            >
              WAVE MODE
            </button>
            <button 
              onClick={() => setGameState('playing_dungeon')}
              className="px-8 py-4 bg-indigo-900 border-4 border-indigo-400 text-2xl font-bold hover:bg-indigo-400 hover:text-black transition-colors"
            >
              DUNGEON MODE
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h1 className="text-7xl font-black text-red-600 mb-8 tracking-widest animate-bounce">DIED</h1>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-[#333] border-4 border-white text-2xl font-bold hover:bg-white hover:text-black transition-colors"
          >
            RESPAWN
          </button>
        </div>
      )}

      {(gameState === 'playing_wave' || gameState === 'playing_dungeon' || gameState === 'gameover') && (
        <>
          {/* Top Center Analytics: Waves and EXP */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none">
             {gameState !== 'playing_dungeon' && (
               <div className="bg-black/90 border-4 border-[#444] px-6 py-2 shadow-lg mb-2 flex items-center gap-4">
                  <span className="text-2xl font-mono text-white tracking-widest font-bold">WAVE {waveState.wave}</span>
                  <span className="text-xl font-mono text-red-500 font-bold ml-4">
                    {waveState.gameState === 'merchant' ? 'SHOP PHASE' : `${waveState.enemiesAlive + waveState.enemiesToSpawn} REMAINING`}
                  </span>
               </div>
             )}
             
             {/* EXP Bar */}
             <div className="w-96 bg-black/80 border-2 border-[#555] p-1 flex items-center relative h-6 shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                <div className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(100, (expState.exp / expState.maxExp) * 100)}%` }}></div>
                <span className="relative z-10 w-full text-center text-[10px] font-mono font-bold text-white drop-shadow-md tracking-wider">
                  LVL {expState.level} ({Math.floor(expState.exp)}/{expState.maxExp} EXP)
                </span>
             </div>
          </div>
          
          {/* Top Right Analytics: Coins */}
          <div className="absolute top-4 right-4 bg-black/90 border-4 border-[#D4AF37] px-4 py-2 flex items-center gap-2 shadow-lg z-20 pointer-events-none">
             <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-200 shadow-inner"></div>
             <span className="text-2xl font-mono font-bold text-yellow-400 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{coins}</span>
          </div>

          {/* UI Overlay (HP Bar) */}
          <div className="absolute top-6 left-6 pointer-events-none z-10">
            <div className="flex gap-1 items-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              {hearts.map((type, i) => (
                <Heart key={i} type={type as "full" | "half" | "empty"} />
              ))}
            </div>
          </div>

          {/* Instructions Overlay */}
          {showItemInstruction && (
            <div className="absolute top-6 right-6 pointer-events-none transition-opacity duration-500 z-10">
              <div className="bg-black/80 border-4 border-[#333] p-4 font-mono shadow-[0_8px_16px_rgba(0,0,0,0.8)] max-w-[280px]">
                <h3 className="text-yellow-400 font-bold mb-2 uppercase tracking-wide">
                  {hasPickedUpPotion ? "New Item!" : "Controls"}
                </h3>
                <ul className="text-sm space-y-2 text-gray-300">
                  {hasPickedUpPotion ? (
                    <>
                      <li>Select potion slot using <strong className="text-white">1-3</strong> quick-tags</li>
                      <li>Hold <strong className="text-white">F</strong> to consume and heal.</li>
                    </>
                  ) : (
                    <>
                      <li><strong className="text-white">WASD</strong> to Move</li>
                      <li><strong className="text-white">SPACE</strong> to Shoot</li>
                      <li><strong className="text-white">R</strong> to Reload</li>
                      <li><strong className="text-white">E</strong> to open Inventory</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          {/* Main Inventory Menu */}
          {isInventoryOpen && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto">
              <div className="relative bg-[#1a1a1a] border-4 border-[#555] p-10 shadow-[0_16px_48px_rgba(0,0,0,1)] flex flex-col items-center min-w-[600px]">
                
                {/* Close Button */}
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('inventory-close'))}
                  className="absolute top-4 right-6 text-gray-400 hover:text-red-500 font-black text-4xl transition-colors"
                >
                  &times;
                </button>
                
                <h2 className="text-yellow-500 font-black text-4xl mb-8 tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">Inventory</h2>
                
                <div className="grid grid-cols-4 gap-4">
                  {inventory.map((slot, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        if (i !== activeSlot) {
                          window.dispatchEvent(new CustomEvent('inventory-swap', { detail: { from: i, to: activeSlot } }));
                        }
                      }}
                      draggable={slot.id !== ''}
                      onDragStart={(e) => { 
                        e.dataTransfer.setData('text/plain', i.toString()); 
                        // Drag only the item image
                        const img = e.currentTarget.querySelector('img');
                        if (img) {
                          e.dataTransfer.setDragImage(img, 32, 32); // rough center offset
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('text/plain'));
                        if (!isNaN(from) && from !== i) {
                          window.dispatchEvent(new CustomEvent('inventory-swap', { detail: { from, to: i } }));
                        }
                      }}
                      className={`relative w-24 h-24 border-4 flex items-center justify-center transition-transform hover:bg-[#333] hover:scale-105
                        ${slot.id !== '' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                        ${i === activeSlot && i <= 2 ? 'border-white bg-[#444]' : i <= 2 ? 'border-[#777] bg-[#333]' : 'border-[#444] bg-[#222]'}
                      `}
                    >
                      {/* Slot Number */}
                      <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono font-bold" style={{ textShadow: "1px 1px 0 #000" }}>{i + 1}</div>
                      
                      {/* Item SVGs */}
                      {slot.id !== '' && (
                        <img 
                          src={`/assets/character/${slot.id === 'potion' ? '../items/potion' : (slot.id === 'gun' ? 'gun1' : slot.id)}.svg`} 
                          alt={slot.id} 
                          className={`${slot.id === 'potion' ? 'w-12 h-12' : 'w-16 h-16'} object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,1)] pointer-events-none`} 
                          style={{ imageRendering: "pixelated" }} 
                        />
                      )}
                      
                      {/* Count Indicator */}
                      {slot.count > 1 && (
                        <div className="absolute bottom-1 right-2 text-lg text-white font-mono font-bold drop-shadow-[2px_2px_0_rgba(0,0,0,1)] pointer-events-none">
                          {slot.count}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Merchant Overlay Buttons */}
          {waveState.gameState === 'merchant' && (
            <div className="absolute top-24 right-4 flex flex-col gap-4 z-40 pointer-events-auto">
               <button 
                 onClick={() => window.dispatchEvent(new CustomEvent('shop-open'))}
                 className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xl border-4 border-indigo-400 shadow-xl transition-transform active:scale-95 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  OPEN SHOP (F)
               </button>
               <button 
                 onClick={() => window.dispatchEvent(new CustomEvent('skip-wave'))}
                 className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-mono font-bold text-xl border-4 border-green-400 shadow-xl transition-transform active:scale-95 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  SKIP WAVE (G - {Math.ceil(waveState.merchantTimer / 60)}s)
               </button>
            </div>
          )}
          
          {/* Merchant Shop Modal */}
          {showShop && waveState.gameState === 'merchant' && (
             <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm pointer-events-auto">
                <div className="bg-[#111] border-8 border-indigo-600 p-8 min-w-[600px] flex flex-col shadow-2xl">
                   <div className="flex justify-between items-center mb-8 border-b-4 border-indigo-900 pb-4">
                      <h2 className="text-4xl text-indigo-400 font-mono font-bold tracking-widest">MERCHANT</h2>
                      <button onClick={() => setShowShop(false)} className="text-red-500 text-4xl font-bold hover:text-red-400 hover:scale-110 transition-transform">X</button>
                   </div>
                   <div className="grid grid-cols-3 gap-6 mb-8">
                      {/* Empty slots for now */}
                      <div className="h-48 bg-[#222] border-4 border-[#333] flex items-center justify-center text-gray-500 font-mono text-center px-4 hover:border-indigo-500 transition-colors">OUT OF STOCK</div>
                      <div className="h-48 bg-[#222] border-4 border-[#333] flex items-center justify-center text-gray-500 font-mono text-center px-4 hover:border-indigo-500 transition-colors">OUT OF STOCK</div>
                      <div className="h-48 bg-[#222] border-4 border-[#333] flex items-center justify-center text-gray-500 font-mono text-center px-4 hover:border-indigo-500 transition-colors">OUT OF STOCK</div>
                   </div>
                   <div className="flex justify-between items-center bg-[#222] p-4 border-4 border-[#333]">
                      <span className="text-gray-400 font-mono">Shop upgrades coming soon...</span>
                      <div className="flex items-center gap-2">
                         <div className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-200"></div>
                         <span className="text-yellow-400 font-mono font-bold text-2xl drop-shadow-md">{coins}</span>
                       </div>
                   </div>
                </div>
             </div>
          )}

          {/* Quickbar 3-Slot Overlay */}
          {!isInventoryOpen && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-2 pointer-events-none z-30">
              <div className="flex bg-black/80 border-4 border-[#333] p-1 gap-1 shadow-[0_8px_16px_rgba(0,0,0,0.8)] pointer-events-auto">
                {inventory.slice(0, 3).map((slot, i) => (
                  <div 
                    key={i} 
                    onClick={() => window.dispatchEvent(new CustomEvent('slot-change', { detail: i }))}
                    className={`relative w-14 h-14 border-4 flex items-center justify-center text-xl font-bold transition-all cursor-pointer hover:bg-[#555]
                      ${i === activeSlot ? 'border-white bg-[#555]' : 'border-[#222] bg-[#333]'}
                    `}
                  >
                    <div className="absolute top-0 left-1 text-[10px] text-gray-400 font-mono" style={{ textShadow: "1px 1px 0 #000" }}>
                      {i + 1}
                    </div>
                    
                    {/* Item SVGs */}
                    {slot.id !== '' && (
                      <img 
                        src={`/assets/character/${slot.id === 'potion' ? '../items/potion' : (slot.id === 'gun' ? 'gun1' : slot.id)}.svg`} 
                        alt={slot.id} 
                        className={`${slot.id === 'potion' ? 'w-8 h-8' : 'w-10 h-10'} object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,1)] pointer-events-none`} 
                        style={{ imageRendering: "pixelated" }} 
                      />
                    )}
                    
                    {/* Count Indicator */}
                    {slot.count > 1 && (
                      <div className="absolute bottom-0 right-1 text-sm text-white font-mono drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">
                        {slot.count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Ammo Display */}
              {['gun', 'machine_gun', 'shotgun'].includes(inventory[activeSlot]?.id) && (
                <div className="relative flex flex-col items-center justify-center h-14 px-4 bg-black/80 border-4 border-[#333] shadow-[0_8px_16px_rgba(0,0,0,0.8)] font-bold font-mono min-w-[120px]">
                  {isReloading && (
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-red-500 font-bold animate-pulse text-lg tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] whitespace-nowrap">
                       RELOADING...
                     </div>
                  )}
                  <span className="text-2xl text-yellow-500 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    {ammo} <span className="text-gray-500 text-xl">/ {maxAmmo || '∞'}</span>
                  </span>
                </div>
              )}
              {/* Potion Prompt */}
              {inventory[activeSlot]?.id === 'potion' && (
                <div className="flex flex-col items-center justify-center h-14 px-4 bg-black/80 border-4 border-[#333] border-l-0 shadow-[0_8px_16px_rgba(0,0,0,0.8)] font-bold font-mono min-w-[120px]">
                  <span className="text-lg text-green-400 drop-shadow-[2px_2px_0_rgba(0,0,0,1)] animate-pulse">
                    Press <span className="text-white text-xl">F</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
