# Implementation Plan: Project "Catalyst" - Plot-Driven Semi-Open World Overhaul

This document outlines the comprehensive architectural tear-down, redesign, and implementation strategy for transforming the game into a smooth, plot-driven semi-open world experience. The game is designed for a highly variable 30 to 80-minute playtime, blending the expansive exploration of *Genshin Impact* with the fast-paced, quest-driven combat of *Soul Knight*.

---

## 1. Executive Summary & Lore

**The Lore:** 
You play as a solitary alchemical construct traversing the ruins of a continent devastated by an ancient magical war. The devastation was so absolute that it permanently altered the climate and geography of the world. Your quest is to travel to the epicenter of the cataclysm—an abandoned capital city—and seal the raw magical anomaly that continues to corrupt the land. 

**The Overhaul Directives:**
1. **Mob Wipe:** All existing enemy types and AI behaviors will be deleted from `GameManager.ts` to provide a clean slate for the new progression scaling.
2. **Dynamic Expansion:** The world generates as massive seamless "Zones". The procedural engine expands the world organically as plot quests are completed.
3. **No Loading Screens:** Biomes blend seamlessly into one another using dynamic noise weights and transition tiles.

---

## 2. Biome Progression & Narrative Flow

The game is divided into three distinct, interconnected regions of escalating difficulty. Progression is gated by natural, environmental barriers tied to localized quests.

### 2.1 The Verdant Plains (Difficulty: Easy)
*   **Atmosphere:** Lush, green, but dotted with rusted craters and remnants of old battles. 
*   **The Barrier:** A swirling, impassable storm of rapidly growing thorny vines.
*   **The Local Quest:** The player must locate and cleanse 3 Tainted Monoliths scattered across the plains. 
*   **The Transition:** Cleansing the final monolith breaks the magic sustaining the vines. The thorn storm withers away, and the procedural generation smoothly expands into the next zone, where grass gives way to dry earth.

### 2.2 The Scorched Desert (Difficulty: Medium)
*   **Atmosphere:** A desolate, blinding wasteland of sand and bleached bones. This desert is unnatural, formed instantly by the magical fallout of the great war.
*   **The Barrier:** A raging, localized magical sandstorm that pushes the player back and deals damage over time if entered.
*   **The Local Quest:** The player must delve into half-buried ruins and reactivate 4 Ancient Wind-Funnels to counteract the magical storm.
*   **The Transition:** Once the funnels are active, the sandstorm is blown away. The horizon clears, revealing jagged black rocks and the glowing red sky of the epicenter.

### 2.3 The Ashen City (Difficulty: Hard)
*   **Atmosphere:** The ruins of a grand, abandoned capital city, now half-submerged in a hellish, magma-like environment. The epicenter of the war.
*   **The Barrier:** A literal river of superheated plasma blocking the entrance to the royal palace (the final boss arena).
*   **The Local Quest:** The player must find the city's Geothermal Core and overload it to solidify the plasma river.
*   **The Transition:** The plasma cools into an obsidian bridge, leading to the climax of the game.

---

## 3. The New Architecture: Plot-Driven World Generation

Instead of a broad infinite corridor, the world expands based on narrative state.

1.  **Global Plot State:** The `GameManager` will utilize a `PlotManager` tracking `currentZone`, `activeQuestObjective`, and `questProgress`.
2.  **Barrier Rendering:** The chunk generator reads the `currentZone`. If the player is in the Plains and tries to generate chunks too far North, the engine overrides the noise map and generates "Thorn Wall" tiles.
3.  **Seamless Blending:** When `questProgress` maxes out, `currentZone` increments. The engine applies a gradient lerp over the next 5 chunks, smoothly transitioning Plains tiles (grass) into Desert tiles (sand) without a loading screen.

---

## 4. Technical Pipelines: Assets, Animation, and Sound

To support a premium 45+ minute experience, our foundational pipelines must be upgraded.

### 4.1 Asset Generation Pipeline
We will heavily scale the existing `scripts/generateAssets.js` architecture.
*   **Resolution Scaling:** While standard props and tiles remain 16x16, major setpieces (Monoliths, Wind Funnels) will be 32x32 arrays. Bosses will be 64x64 matrices. 
*   **Color Mapping:** The `colorMap` will be rigorously expanded to enforce a strict 3-tone shading rule (Base, Highlight, Shadow) for every material (e.g., `SandBase`, `SandShadow`, `ObsidianHighlight`).
*   **Script Optimization:** For 64x64 grids, parsing 4,096 characters per frame can be slow. The script will be refactored to skip rendering `<rect>` elements for transparent pixels (`.`), dramatically reducing the final SVG file size.

### 4.2 Animation System
The current animation system manually swaps textures based on a simple timer. This is insufficient for complex bosses.
*   **PixiJS AnimatedSprite:** We will migrate character and boss rendering to PixiJS's native `AnimatedSprite`.
*   **State Machines:** Entities will have an `AnimState` enum (e.g., `IDLE`, `WALK`, `ATTACK_WINDUP`, `ATTACK_RELEASE`). Transitions between states will trigger specific texture arrays, ensuring attack animations lock the character's movement naturally.
*   **VFX Layer:** Particles (using our newly implemented pixel-physics) and hit-flashes (temporarily setting a sprite's tint to pure white) will run on a separate visual layer.

### 4.3 Audio and Sound Architecture
A seamless world requires seamless audio. The current basic HTML5 Audio pool will be replaced/upgraded.
*   **Dynamic BGM:** Background music must crossfade organically. When the Sandstorm clears and the player steps into the Desert, the Plains BGM will linearly fade out over 3 seconds while the Desert BGM fades in.
*   **Spatial Audio:** For objects like the Wind-Funnels or the Magma river, we will implement distance-based volume scaling. The closer the player is to a roaring fire, the louder the specific SFX plays.
*   **Audio Pooling Optimization:** The `audioPool` will be expanded to preload biome-specific ambient tracks (e.g., wind howling, magma bubbling) during the transition phases to avoid stuttering.

---

## 5. Execution Roadmap

1.  **Phase A: The Great Purge**
    *   Delete all current monster code, registries, and AI logic in `GameManager.ts`.
    *   Strip out the old Portal and infinite-chunk logic.
2.  **Phase B: Foundation & Quest Engine**
    *   Implement the bounded `PlotManager` and the seamless procedural blending logic for Plains -> Desert.
3.  **Phase C: Pipelines & Assets**
    *   Upgrade `generateAssets.js` and produce the new 16x16 tilesets for Desert and Magma City.
4.  **Phase D: Repopulation**
    *   Reintroduce newly designed, biome-specific enemies with the upgraded `AnimatedSprite` state machines.

---

## User Review Required

> [!IMPORTANT]
> **Approval for "The Great Purge":** Phase A dictates that we delete all current enemies (Goblins, Elementals, etc.) and their AI from the codebase to start fresh. Are you completely comfortable wiping the existing enemy slate clean right now?

> [!WARNING]
> **Git Integration:** Once you approve this, the implementation plan will be executed. I have prepared the git commands to commit and push this plan to the repository.
