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

// --- Translations ---
export const translations = {
  en: {
    title: "ESCAPE GAME",
    loading: "LOADING...",
    integrity: "HP",
    level: "LVL",
    pressSpace: "Press [SPACE]",
    objectiveLabel: "Quest",
    objectiveText: "Find the exit portal.",
    settingsTitle: "SETTINGS",
    volumeBgm: "Music",
    volumeSfx: "Sounds",
    language: "Language",
    skipTutorial: "SKIP TUTORIAL",
    inventoryTitle: "INVENTORY",
    merchantTitle: "SHOP",
    outOfStock: "SOLD OUT",
    equipped: "EQUIPPED",
    creditsLabel: "Available Credits:",
    potionName: "Healing Potion",
    machineGunName: "Heavy Machine Gun",
    shotgunName: "Riot Shotgun",
    playAgain: "PLAY AGAIN",
    deathMessage: "YOU DIED",
    startButton: "START",
    respawnBtn: "RESPAWN",
    skipTutorialBtn: "[F1] Skip Tutorial",
    skipBiome2Btn: "[F2] Skip to Biome 2 (Magma)",
    skipBiome3Btn: "[F3] Skip to Biome 3 (Void)",
    inDevelopment: "Note: Game still in development, may experience bugs.",
    tutorial: {
      step0: { speaker: "Player", text: "Use WASD to move, Shift to sprint, and Q/C to roll." },
      step1: { task: "WASD to Move | Shift to Sprint | Q/C to Roll" },
      step2: { speaker: "System", text: "Door opened. Go to the armory. (M: Open Map)" },
      step3: { task: "Go to the armory. (M: Open Map)" },
      step4: { speaker: "System", text: "Pick up the Pistol and Sword from the floor." },
      step5: { task: "Equip the Pistol and Sword." },
      step6: { speaker: "System", text: "Right-Click: Aim. Left-Click: Shoot. R: Reload." },
      step7: { task: "Right-Click to Aim | Left-Click to Shoot | R to Reload" },
      step8: { speaker: "System", text: "Enemies approaching. Enter the arena ahead." },
      step9: { task: "Enter the arena ahead." },
      step10: { speaker: "System", text: "Fight! Survive the arena." },
      step11: { task: "Survive the swarm. Kill all 3 enemies." },
      step12: { speaker: "System", text: "Clear. Collect coins and buy a potion with [E]." },
      step13: { task: "Buy a healing potion (E: Open shop)." },
      step14: { speaker: "System", text: "Door opened. Go to the portal in Room 3." },
      step15: { task: "Reach the escape portal. (Space to enter)." },
      step16: { speaker: "System", text: "Enter the portal to escape." }
    }
  },
  fr: {
    title: "JEU D'ÉVASION",
    loading: "CHARGEMENT...",
    integrity: "PV",
    level: "NIV",
    pressSpace: "Appuyez sur [ESPACE]",
    objectiveLabel: "Quête",
    objectiveText: "Trouvez le portail de sortie.",
    settingsTitle: "PARAMÈTRES",
    volumeBgm: "Musique",
    volumeSfx: "Sons",
    language: "Langue",
    skipTutorial: "PASSER LE TUTO",
    inventoryTitle: "INVENTAIRE",
    merchantTitle: "BOUTIQUE",
    outOfStock: "ÉPUISÉ",
    equipped: "ÉQUIPÉ",
    creditsLabel: "Crédits disponibles:",
    potionName: "Potion de soin",
    machineGunName: "Mitrailleuse lourde",
    shotgunName: "Fusil à pompe",
    playAgain: "REJOUER",
    deathMessage: "VOUS ÊTES MORT",
    startButton: "COMMENCER",
    respawnBtn: "RÉAPPARAÎTRE",
    skipTutorialBtn: "[F1] Passer le Tuto",
    skipBiome2Btn: "[F2] Aller au Biome 2 (Magma)",
    skipBiome3Btn: "[F3] Aller au Biome 3 (Néant)",
    inDevelopment: "Note: Jeu en développement, peut contenir des bugs.",
    tutorial: {
      step0: { speaker: "Joueur", text: "WASD pour bouger, Maj pour courir, Q/C pour rouler." },
      step1: { task: "WASD: Bouger | Maj: Courir | Q/C: Rouler" },
      step2: { speaker: "Système", text: "Porte ouverte. Allez à l'armurerie. (M: Carte)" },
      step3: { task: "Allez à l'armurerie. (M: Carte)" },
      step4: { speaker: "Système", text: "Ramassez le Pistolet et l'Épée." },
      step5: { task: "Équipez le Pistolet et l'Épée." },
      step6: { speaker: "Système", text: "Clic-Droit: Viser. Clic-Gauche: Tirer. R: Recharger." },
      step7: { task: "Clic-Droit: Viser | Clic-Gauche: Tirer | R: Recharger" },
      step8: { speaker: "Système", text: "Ennemis en approche. Entrez dans l'arène." },
      step9: { task: "Entrez dans l'arène." },
      step10: { speaker: "Système", text: "Combattez! Survivez à l'arène." },
      step11: { task: "Survivez à l'essaim. Éliminez les 3 ennemis." },
      step12: { speaker: "Système", text: "Terminé. Prenez les pièces et achetez une potion avec [E]." },
      step13: { task: "Achetez une potion (E: Boutique)." },
      step14: { speaker: "Système", text: "Porte ouverte. Dirigez-vous vers le portail." },
      step15: { task: "Atteignez le portail. (Espace: Entrer)." },
      step16: { speaker: "Système", text: "Entrez dans le portail pour fuir." }
    }
  }
};

const ALL_BUFFS = [
  { id: 'maxhp', name: 'Titanium Plating', desc: '+3 Max HP', icon: '❤️' },
  { id: 'dmg', name: 'High Caliber', desc: '+5 Damage', icon: '⚔️' },
  { id: 'speed', name: 'Adrenaline', desc: '+1.0 Speed', icon: '⚡' },
  { id: 'firerate', name: 'Fast Hands', desc: '+20% Fire Rate', icon: '🔥' }
];

export default function Home() {
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const t = translations[language];
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [hp, setHp] = useState(10);
  const [inventory, setInventory] = useState<{ id: string, count: number }[]>(
    Array(12).fill(null).map((_, i) => i === 0 ? { id: 'gun', count: 1 } : { id: '', count: 0 })
  );
  const [activeSlot, setActiveSlot] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [ammo, setAmmo] = useState(30);
  const [maxAmmo, setMaxAmmo] = useState(30);
  const [isReloading, setIsReloading] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{level: number, options: typeof ALL_BUFFS} | null>(null);
  const [bossHp, setBossHp] = useState<{hp: number, maxHp: number} | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [volume, setVolume] = useState({ master: 1.0, bgm: 0.1, sfx: 0.5 });

  // Wave & Economy States
  const [waveState, setWaveState] = useState({ wave: 1, gameState: 'playing', enemiesAlive: 0, enemiesToSpawn: 0, merchantTimer: 0, world: 1, stage: 1 });
  const [expState, setExpState] = useState({ exp: 0, maxExp: 10, level: 1, maxHP: 10 });
  const [coins, setCoins] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [drinkingProgress, setDrinkingProgress] = useState<number | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [fps, setFps] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [dialogueText, setDialogueText] = useState("");
  const [dialogueSpeaker, setDialogueSpeaker] = useState("Voice");

  // Instructions
  const [showItemInstruction, setShowItemInstruction] = useState(true);
  const [hasPickedUpPotion, setHasPickedUpPotion] = useState(false);
  const [interactHover, setInteractHover] = useState<'merchant' | 'portal' | null>(null);

  useEffect(() => {
    const handleTutorialStep = (e: any) => {
      setTutorialStep(e.detail.step);
      setTutorialCompleted(e.detail.completed);
    };
    window.addEventListener('tutorial-step', handleTutorialStep);

    const handleDialogueTrigger = (e: any) => {
      setDialogueSpeaker(e.detail.speaker);
      setDialogueText(e.detail.text);
    };
    window.addEventListener('tutorial-dialogue-trigger', handleDialogueTrigger);

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
    const handleFpsChange = (e: any) => setFps(e.detail);

    const handleShopOpen = () => setShowShop(true);
    const handleHover = (e: any) => setInteractHover(e.detail);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setShowShop(false);
      if (e.code === 'F1') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('skip-tutorial'));
      }
      if (e.code === 'F2') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('skip-to-biome-1'));
      }
      if (e.code === 'F3') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('skip-to-biome-2'));
      }
    };
    const handleSettingsToggle = () => setIsSettingsOpen(prev => !prev);
    const handleSkipTutorial = () => setIsSettingsOpen(false);
    const handleAssetsLoaded = () => setIsLoadingAssets(false);

    const handleGenerationStart = () => {
      setIsLoadingAssets(true);
      // Fallback: dismiss loading screen after 15s if never dismissed
      setTimeout(() => setIsLoadingAssets(false), 15000);
    };
    const handleGenerationEnd = () => setIsLoadingAssets(false);

    window.addEventListener("hp-change", handleHpChange);
    window.addEventListener("assets-loaded", handleAssetsLoaded);
    window.addEventListener("generation-start", handleGenerationStart);
    window.addEventListener("generation-end", handleGenerationEnd);
    window.addEventListener("inventory-change", handleInventoryChange);
    window.addEventListener("ammo-change", handleAmmoChange);
    window.addEventListener("wave-change", handleWaveChange);
    window.addEventListener("exp-change", handleExpChange);
    window.addEventListener("coin-change", handleCoinChange);
    window.addEventListener("fps-change", handleFpsChange);
    window.addEventListener("shop-open", handleShopOpen);
    window.addEventListener("interact-hover", handleHover);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("settings-toggle", handleSettingsToggle);
    window.addEventListener("skip-tutorial", handleSkipTutorial);

    const handleLevelUp = (e: any) => {
      const shuffled = [...ALL_BUFFS].sort(() => 0.5 - Math.random());
      setLevelUpData({
        level: e.detail.level,
        options: shuffled.slice(0, 3)
      });
    };
    window.addEventListener("level-up-trigger", handleLevelUp);

    const handleBossHp = (e: any) => setBossHp(e.detail);
    window.addEventListener("boss-hp-change", handleBossHp);

    return () => {
      window.removeEventListener('tutorial-step', handleTutorialStep);
      window.removeEventListener('hp-change', handleHpChange);
      window.removeEventListener('boss-hp-change', handleBossHp);
      window.removeEventListener('inventory-change', handleInventoryChange);
      window.removeEventListener("ammo-change", handleAmmoChange);
      window.removeEventListener("wave-change", handleWaveChange);
      window.removeEventListener("exp-change", handleExpChange);
      window.removeEventListener("coin-change", handleCoinChange);
      window.removeEventListener("fps-change", handleFpsChange);
      window.removeEventListener("shop-open", handleShopOpen);
      window.removeEventListener("interact-hover", handleHover);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("settings-toggle", handleSettingsToggle);
      window.removeEventListener("skip-tutorial", handleSkipTutorial);
      window.removeEventListener('tutorial-dialogue-trigger', handleDialogueTrigger);
      window.removeEventListener("level-up-trigger", handleLevelUp);
    };
  }, [hasPickedUpPotion]);

  useEffect(() => {
    if (gameState === 'playing' && !hasPickedUpPotion) {
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

  const handleVolumeChange = (key: 'master' | 'bgm' | 'sfx', value: number) => {
    setVolume(prev => {
      const next = { ...prev, [key]: value };
      window.dispatchEvent(new CustomEvent('volume-change', { detail: next }));
      return next;
    });
  };

  return (
    <>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <main className="relative w-screen h-screen bg-black overflow-hidden m-0 p-0 text-white font-sans select-none">
        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto">
            <div className="relative bg-[#1a1a1a] border-4 border-[#555] p-10 shadow-[0_16px_48px_rgba(0,0,0,1)] flex flex-col min-w-[500px]">

              {/* Close Button */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('settings-toggle'))}
                className="absolute top-4 right-6 text-gray-400 hover:text-red-500 font-black text-4xl transition-colors"
              >
                &times;
              </button>

              <h2 className="text-yellow-500 text-center font-black text-4xl mb-10 tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">Settings</h2>

              <div className="flex flex-col gap-8 w-full px-8">
                
                {/* Master Volume */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-white font-mono font-bold text-xl uppercase tracking-widest">{t.volumeBgm}</label>
                    <span className="text-gray-400 font-mono">{Math.round(volume.master * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={volume.master}
                    onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* BGM Volume */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-indigo-400 font-mono font-bold text-xl uppercase tracking-widest">{t.volumeBgm}</label>
                    <span className="text-gray-400 font-mono">{Math.round(volume.bgm * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={volume.bgm}
                    onChange={(e) => handleVolumeChange('bgm', parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* SFX Volume */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-red-400 font-mono font-bold text-xl uppercase tracking-widest">{t.volumeSfx}</label>
                    <span className="text-gray-400 font-mono">{Math.round(volume.sfx * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={volume.sfx}
                    onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                    className="w-full accent-red-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>


            </div>
          </div>
        )}

        {isLoadingAssets && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black gap-4">
            <h1 className="text-4xl text-white font-mono tracking-widest drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]">{t.loading}</h1>
            <div className="w-96 h-6 border-4 border-gray-700 bg-gray-900 p-1 shadow-2xl">
              <div className="h-full bg-indigo-500 animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'gameover') && <GameCanvas />}

        {/* Fullscreen Atmospheric Vignette & Noise (Beneath Inventory) */}



        {gameState === 'start' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
            <h1 className="text-6xl font-black text-red-600 mb-8 tracking-widest drop-shadow-[0_4px_4px_rgba(255,0,0,0.5)]">{t.title}</h1>
<div className="mb-8 w-64">

                {/* Language Selection */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-cyan-400 font-mono font-bold text-xl uppercase tracking-widest">{t.language}</label>
                    <span className="text-gray-400 font-mono uppercase">{language === 'en' ? 'ENGLISH' : 'FRANÇAIS'}</span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex-1 py-2 font-bold transition-colors ${language === 'en' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      ENGLISH
                    </button>
                    <button
                      onClick={() => setLanguage('fr')}
                      className={`flex-1 py-2 font-bold transition-colors ${language === 'fr' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      FRANÇAIS
                    </button>
                  </div>
                </div>

</div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => { setGameState('playing'); setIsLoadingAssets(true); setTimeout(() => setIsLoadingAssets(false), 20000); }}
                className="px-12 py-6 bg-indigo-900 border-4 border-indigo-400 text-4xl font-bold hover:bg-indigo-400 hover:text-black transition-colors shadow-[0_0_20px_rgba(129,140,248,0.5)]"
              >
                {t.startButton}
              </button>
            </div>
            <p className="absolute bottom-4 right-6 text-gray-500 text-xs font-mono italic">{t.inDevelopment}</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h1 className="text-7xl font-black text-red-600 mb-8 tracking-widest animate-bounce">{t.deathMessage}</h1>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-[#333] border-4 border-white text-2xl font-bold hover:bg-white hover:text-black transition-colors"
            >
              RESPAWN
            </button>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'gameover') && (
          <>
            {/* Top Right Analytics: FPS Only */}
            <div className="absolute top-4 left-4 flex flex-col items-start gap-2 z-50 pointer-events-none">
              <div className="bg-black/80 px-2 py-1 border-2 border-gray-600 shadow-md">
                <span className={`text-sm font-mono font-bold ${fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-500'}`}>
                  {Math.round(fps)} FPS
                </span>
              </div>
              {tutorialStep < 15 && (
                <div className="bg-black/80 px-3 py-1 border-2 border-gray-600 shadow-md mt-2 pointer-events-auto flex flex-col gap-1">
                  <button onClick={() => window.dispatchEvent(new CustomEvent('skip-tutorial'))} className="text-sm font-mono font-bold text-gray-400 hover:text-white transition-colors text-left">
                    [F1] Skip Tutorial
                  </button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('skip-to-biome-1'))} className="text-sm font-mono font-bold text-gray-400 hover:text-white transition-colors text-left">
                    [F2] Skip to Biome 2 (Magma)
                  </button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('skip-to-biome-2'))} className="text-sm font-mono font-bold text-gray-400 hover:text-white transition-colors text-left">
                    [F3] Skip to Biome 3 (Void)
                  </button>
                </div>
              )}
            </div>

            {/* Action Objectives - Top Right */}
            <div className="absolute top-[250px] right-8 z-30 flex flex-col items-end pointer-events-none w-full max-w-xl gap-2">
              {tutorialStep % 2 !== 0 && tutorialStep < 15 && (
                <div className={`bg-black/80 border-r-4 ${tutorialCompleted ? 'border-green-500' : 'border-cyan-500'} pr-4 py-3 pl-6 shadow-xl mb-4 transition-colors duration-500`}>
                  <p className={`text-sm font-mono ${tutorialCompleted ? 'text-green-400 animate-pulse' : 'text-cyan-300'} uppercase tracking-widest mb-2 opacity-80 text-right transition-opacity duration-300`}>
                    {tutorialCompleted ? "Task Completed" : "Current Objective"}
                  </p>
                  <div className={`flex items-center justify-end gap-3 transition-opacity duration-500 ${tutorialCompleted ? 'opacity-80' : 'opacity-100'}`}>
                    <span className="relative font-mono text-xl text-white inline-block">
                      <span className={`transition-all duration-500 relative z-0 ${tutorialCompleted ? 'text-green-400/80 line-through decoration-green-500 decoration-2' : 'text-white'}`}>
                        {((t as any).tutorial)?.['step' + tutorialStep]?.task || ""}
                      </span>
                    </span>
                    {tutorialCompleted && (
                      <span className="text-green-400 text-3xl drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] ml-2" style={{ animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>✓</span>
                    )}
                    {!tutorialCompleted && tutorialStep === 1 && (
                      <div className="flex -space-x-1">
                        <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-576px_-64px]" style={{ imageRendering: 'pixelated' }}></span>
                        <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-576px_-96px]" style={{ imageRendering: 'pixelated' }}></span>
                        <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-608px_-96px]" style={{ imageRendering: 'pixelated' }}></span>
                        <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-640px_-96px]" style={{ imageRendering: 'pixelated' }}></span>
                      </div>
                    )}
                    {!tutorialCompleted && tutorialStep === 7 && (
                      <div className="flex gap-1 items-center">
                        <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-288px_-704px]" style={{ imageRendering: 'pixelated' }}></span>
                        <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-256px_-704px]" style={{ imageRendering: 'pixelated' }}></span>
                      </div>
                    )}
                    {!tutorialCompleted && tutorialStep === 13 && (
                      <span className="inline-block w-8 h-8 bg-[url('/assets/ui/tilemap_packed.png')] bg-[length:1088px_768px] bg-[-704px_-32px]" style={{ imageRendering: 'pixelated' }}></span>
                    )}
                  </div>
                </div>
              )}

              {/* Free play objective */}
              {tutorialStep >= 15 && (
                <div className="bg-black/80 border-r-4 border-yellow-500 pr-4 py-2 pl-6 shadow-xl mb-4 animate-fade-in transition-all duration-500">
                  <p className="text-sm font-mono text-yellow-500 uppercase tracking-widest opacity-80 text-right">{t.objectiveLabel}</p>
                  <span className="text-white font-mono text-lg">{t.objectiveText}</span>
                </div>
              )}
            </div>

            {/* Conversational Tutorial UI - Bottom Center */}
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 z-30 flex flex-col pointer-events-none w-full max-w-4xl transition-all duration-500">
              {(() => {
                if (tutorialStep % 2 !== 0 || tutorialStep > 14) return null;
                const speaker = ((t as any).tutorial)?.['step' + tutorialStep]?.speaker;
                const isPlayer = speaker === 'Player' || speaker === 'Joueur';
                const label = speaker?.toUpperCase() || 'SYSTEM';
                const text = ((t as any).tutorial)?.['step' + tutorialStep]?.text || dialogueText;
                return (
                  <div className={`w-full border-4 shadow-2xl p-6 relative animate-fade-in flex gap-6 items-center ${isPlayer ? 'bg-[#111118]/95 border-indigo-900' : 'bg-[#0a0a12]/95 border-red-900/60'} ${isPlayer ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-32 h-32 bg-black/80 border-2 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${isPlayer ? 'border-indigo-500' : 'border-red-800/60'}`}>
                      {isPlayer ? (
                        <img src="/assets/character/slime_idle1.svg" className="w-[200%] h-[200%] object-cover object-top mt-12" style={{ imageRendering: "pixelated" }} />
                      ) : (
                        <span className="text-red-500/80 font-black select-none" style={{ fontSize: '4rem', fontFamily: 'monospace', lineHeight: 1 }}>?</span>
                      )}
                    </div>
                    <div className={`flex flex-col flex-grow ${isPlayer ? '' : 'items-end'}`}>
                      <div className={`inline-block px-3 py-1 text-sm font-mono font-bold tracking-wider mb-2 ${isPlayer ? 'bg-indigo-900 text-indigo-200 self-start' : 'bg-red-900/50 text-red-300/80 self-end'}`}>{label}</div>
                      <p className={`font-mono leading-relaxed text-2xl ${isPlayer ? 'text-white' : 'text-red-100/90'} ${isPlayer ? '' : 'text-right'}`}>{text}</p>
                      <p className={`mt-4 text-lg font-mono animate-pulse ${isPlayer ? 'text-indigo-400' : 'text-red-400/60'} ${isPlayer ? '' : 'text-right'}`}>{t.pressSpace}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Boss HP Bar */}
            {bossHp && bossHp.hp > 0 && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl pointer-events-none z-50 flex flex-col items-center">
                <div className="text-xl font-mono text-red-500 mb-2 font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">Mutated Cyber-Behemoth</div>
                <div className="bg-black/90 border-4 border-red-900/60 h-8 w-full shadow-[0_0_20px_rgba(255,0,0,0.3)] relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-800 via-red-600 to-red-500 transition-all duration-100 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, (bossHp.hp / bossHp.maxHp) * 100))}%` }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-mono font-bold text-white drop-shadow-[1px_1px_2px_rgba(0,0,0,1)]">
                    {Math.floor(bossHp.hp)} / {bossHp.maxHp}
                  </span>
                </div>
              </div>
            )}

            {/* UI Overlay (HP Bar) */}
            <div className="absolute bottom-6 right-[calc(50%+190px)] pointer-events-none z-40 w-48 transition-all duration-300">
              <div className="text-xs font-mono text-red-400 mb-1 drop-shadow-md font-bold tracking-widest">{t.integrity}</div>
              <div className="bg-[#1a1a1a] border-4 border-[#333] h-6 w-full shadow-lg p-0.5 relative">
                <div
                  className="h-full bg-red-600 transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, (hp / expState.maxHP) * 100))}%` }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-bold text-white drop-shadow-[1px_1px_0_rgba(0,0,0,1)]">
                  {hp} / {expState.maxHP}
                </span>
              </div>
            </div>

            {/* Main Inventory Menu */}
            {isInventoryOpen && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto animate-fade-in">
                <div className="relative bg-[#1a1a1a] border-4 border-[#555] p-10 shadow-[0_16px_48px_rgba(0,0,0,1)] flex flex-col items-center min-w-[600px] animate-pop-in">

                  {/* Close Button */}
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('inventory-close'))}
                    className="absolute top-4 right-6 text-gray-400 hover:text-red-500 font-black text-4xl transition-colors"
                  >
                    &times;
                  </button>

                  <div className="flex gap-16">
                    {/* Left: Inventory */}
                    <div className="flex flex-col items-center">
                      <h2 className="text-yellow-500 font-black text-4xl mb-8 tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{t.inventoryTitle}</h2>
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
                              const img = e.currentTarget.querySelector('img');
                              if (img) {
                                e.dataTransfer.setDragImage(img, 32, 32);
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
                            <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono font-bold" style={{ textShadow: "1px 1px 0 #000" }}>{i + 1}</div>

                            {slot.id !== '' && (
                              <img
                                src={`/assets/character/${slot.id === 'potion' ? '../items/potion' : (slot.id === 'gun' ? 'gun1' : slot.id)}.svg?v=2`}
                                alt={slot.id}
                                className={`${slot.id === 'potion' ? 'w-12 h-12' : 'w-16 h-16'} object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,1)] pointer-events-none`}
                                style={{ imageRendering: "pixelated" }}
                              />
                            )}

                            {slot.count > 1 && (
                              <div className="absolute bottom-1 right-2 text-lg text-white font-mono font-bold drop-shadow-[2px_2px_0_rgba(0,0,0,1)] pointer-events-none">
                                {slot.count}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: REQ-TERMINAL */}
                    <div className="flex flex-col items-center border-l-4 border-[#444] pl-16">
                      <h2 className="text-cyan-400 font-black text-4xl mb-8 tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{t.merchantTitle}</h2>
                      <div className="flex flex-col gap-4 w-full">
                        <div className="text-yellow-400 text-xl font-mono mb-4 text-center">{t.creditsLabel} {coins} 🪙</div>
                        
                        <button onClick={() => window.dispatchEvent(new CustomEvent('shop-buy', { detail: 'potion' }))} className="bg-[#222] border-2 border-[#555] hover:border-green-500 hover:bg-[#333] p-4 flex items-center justify-between gap-8 transition-colors">
                          <div className="flex items-center gap-4">
                            <img src="/assets/items/potion.svg" className="w-12 h-12" style={{imageRendering: "pixelated"}} />
                            <span className="text-white font-mono text-xl">{t.potionName}</span>
                          </div>
                          <span className="text-yellow-400 font-bold text-xl">3 🪙</span>
                        </button>

                        <button onClick={() => window.dispatchEvent(new CustomEvent('shop-buy', { detail: 'machine_gun' }))} className="bg-[#222] border-2 border-[#555] hover:border-cyan-500 hover:bg-[#333] p-4 flex items-center justify-between gap-8 transition-colors">
                          <div className="flex items-center gap-4">
                            <img src="/assets/character/machine_gun.svg" className="w-12 h-12" style={{imageRendering: "pixelated"}} />
                            <span className="text-white font-mono text-xl">{t.machineGunName}</span>
                          </div>
                          <span className="text-yellow-400 font-bold text-xl">5 🪙</span>
                        </button>

                        <button onClick={() => window.dispatchEvent(new CustomEvent('shop-buy', { detail: 'shotgun' }))} className="bg-[#222] border-2 border-[#555] hover:border-red-500 hover:bg-[#333] p-4 flex items-center justify-between gap-8 transition-colors">
                          <div className="flex items-center gap-4">
                            <img src="/assets/character/shotgun.svg" className="w-12 h-12" style={{imageRendering: "pixelated"}} />
                            <span className="text-white font-mono text-xl">{t.shotgunName}</span>
                          </div>
                          <span className="text-yellow-400 font-bold text-xl">10 🪙</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interaction Prompts */}
            {interactHover === 'portal' && (
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-2 border-4 border-cyan-400 z-50 pointer-events-none transition-opacity duration-300">
                <span className="text-2xl font-mono font-bold text-cyan-400 tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] animate-pulse">PRESS [SPACE] TO ENTER PORTAL</span>
              </div>
            )}
            {/* Quickbar 3-Slot Overlay */}
            {!isInventoryOpen && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">

                {/* Centered Reloading Text above everything */}
                {isReloading && (
                  <div className="text-red-500 font-bold animate-pulse text-2xl tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] whitespace-nowrap mb-4">
                    RELOADING...
                  </div>
                )}

                <div className="flex items-end gap-2 pointer-events-none">
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
                            src={`/assets/character/${slot.id === 'potion' ? '../items/potion' : (slot.id === 'gun' ? 'gun1' : slot.id)}.svg?v=2`}
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
              </div>
            )}

            {/* Level Up Overlay */}
            {levelUpData && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[1000]">
                <h1 className="text-5xl font-black text-cyan-400 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] tracking-widest mb-2 animate-bounce">
                  LEVEL UP!
                </h1>
                <p className="text-xl text-gray-300 font-mono mb-12">You reached Level {levelUpData.level}</p>

                <div className="flex gap-8">
                  {levelUpData.options.map((buff) => (
                    <button
                      key={buff.id}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('buff-selected', { detail: { buffId: buff.id } }));
                        setLevelUpData(null);
                      }}
                      className="group relative flex flex-col items-center justify-center w-64 h-80 bg-[#1a1c23]/90 border-4 border-[#2d3748] rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:-translate-y-4 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <span className="text-6xl mb-6 drop-shadow-lg group-hover:scale-110 transition-transform">{buff.icon}</span>
                      
                      <h3 className="text-2xl font-black text-white text-center mb-4 uppercase tracking-wider">{buff.name}</h3>
                      
                      <div className="w-12 h-1 bg-cyan-500 mb-6 group-hover:w-full transition-all duration-300" />
                      
                      <p className="text-lg text-cyan-300 font-mono font-bold text-center mt-auto">
                        {buff.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
