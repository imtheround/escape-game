# COMPLETION PLAN: ESCAPE THE CRUCIBLE

## Overview
This document outlines the actionable plan to take the game from its current playable prototype state to a finished, releasable product. 

## Phase 1: Biome Implementation & Procedural Generation (Days 1-3)
**Objective:** Fully implement the 2 distinct biomes and transition the game from a single static map to an infinite, procedurally generated roguelite loop.
*   **Task 1.1:** Implement the "Core Reactor" biome. Add new tile generation rules for Magma (damaging floor), industrial grates, and blast doors.
*   **Task 1.2:** Update `generateForestLayout()` to randomly select between the "Overgrown Laboratory" and "Core Reactor" biomes for each new stage.
*   **Task 1.3:** Create a biome transition room where the player encounters the Scavenger Drone and can spend their coins before progressing.

## Phase 2: Enemy AI & Spawning (Days 4-7)
**Objective:** Finalize the 5 core enemy archetypes and implement dynamic wave spawning based on the player's current level and biome.
*   **Task 2.1:** Implement the Archer AI (ranged attacks with a telegraph warning).
*   **Task 2.2:** Implement the Shaman AI (pathfinding away from the player, AoE healing pulse).
*   **Task 2.3:** Implement the Bomber AI (fast rush, explosive AoE death).
*   **Task 2.4:** Implement the Spider AI (burrowing mechanic, untargetable state, ambush).
*   **Task 2.5:** Update the `EnemySpawner` to weigh enemy types based on the active biome (e.g., more Bombers and Spiders in the Core Reactor).

## Phase 3: Progression & Scaling (Days 8-10)
**Objective:** Make the game harder as the player progresses, ensuring the economy and weapon power feel balanced.
*   **Task 3.1:** Implement Enemy Scaling: Increase enemy HP, speed, and damage by 15% per stage.
*   **Task 3.2:** Implement Player Scaling: Allow the player to choose a stat upgrade (Max HP, Movement Speed, Roll Cooldown) at the end of each stage.
*   **Task 3.3:** Balance the economy: Adjust coin drop rates to ensure the player can reliably afford a new weapon by Stage 3.

## Phase 4: Polish & Game Feel (Days 11-13)
**Objective:** Enhance the audio-visual feedback to make combat and movement feel satisfying and impactful.
*   **Task 4.1:** Add screen shake to Bomber explosions and Shotgun blasts.
*   **Task 4.2:** Implement hit-flash (white flash) when enemies take damage.
*   **Task 4.3:** Add particle emitters for blood splatter, weapon muzzle flashes, and magic auras.
*   **Task 4.4:** Integrate distinct BGM tracks for each biome and a tense, fast-paced track for the final escape sequence.

## Phase 5: The Final Escape Sequence (Day 14)
**Objective:** Create the climactic ending sequence.
*   **Task 5.1:** Design the final "Reactor Core" room.
*   **Task 5.2:** Implement a 60-second survival timer.
*   **Task 5.3:** Spawn a massive, continuous wave of mixed enemy types.
*   **Task 5.4:** Trigger the Aether Rift spawn upon timer completion, transitioning the game to the Victory Screen.
