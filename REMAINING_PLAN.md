# Remaining Development Plan: Escape The Crucible

Based on `LORE.md`, the game requires a substantial amount of content and systems to reach feature completeness. Given the current state of the codebase (where `GameManager.ts` is over 4,500 lines long), scaling up to the full vision requires a systematic approach.

Here is the phase-by-phase plan to achieve the rest of the game.

## Phase 1: Architectural Refactoring & Modularization
Before adding complex enemies or new biomes, the monolithic `GameManager.ts` must be split up. Otherwise, adding new mechanics will result in a fragile and unmaintainable codebase.

1. **Extract Rendering System:** Move the 2.5D projection, lighting, and masking logic into a dedicated `Renderer.ts`.
2. **Extract Input & Player Control:** Move WASD, dodge rolling, stamina, and camera tracking into a `PlayerController.ts`.
3. **Extract Dungeon Generation:** Move the Simplex noise and grid layout generation (rooms, corridors, walls, destructibles) into a `DungeonGenerator.ts`.
4. **Extract Combat & Weapons:** Move bullet physics, melee deflection, hit detection, and the `WeaponRegistry` into a `CombatSystem.ts`.

## Phase 2: Core Roguelite Loop & Upgrades
The game currently has basic weapons, but lacks the core roguelite progression loop described in the lore.

1. **Experience & Leveling:**
   - Implement EXP orb drops when enemies die.
   - Add magnet physics to pull orbs toward the player.
   - When the EXP bar fills, trigger "Hit-Stop" (time freeze).
2. **Upgrade UI:**
   - Build a new React component for the Level Up screen.
   - Present 3 random upgrades from the pool of 11 (Vampirism, Bouncy Bullets, Piercing Rounds, etc.).
3. **Upgrade Modifiers in Engine:**
   - Implement the actual mechanics for the 11 modifiers in the engine (e.g., modifying `projectile.bounces`, adding piercing flags, scaling `playerMaxHP`, reducing `rollCooldownTimer`).

## Phase 3: The Enemy Roster
Currently, only basic Grunts and some placeholder AI exist. We need to build out the full tactical roster.

1. **The Archer (Crystalline Turret):** Ensure plasma bolts bounce off walls and can be deflected by the Energy Sword.
2. **The Shield (Heavy Enforcer):** Add directional damage immunity (frontal shield). Require the player to dodge-roll behind them or use explosive AoE.
3. **The Shaman (Biomancer):** Implement the 5-second AoE healing pulse (green circle).
4. **The Bomber (Volatile Mass):** Implement the rush, the 0.8-second flashing fuse, and the screen-shaking explosion that damages both the player and other enemies/crates.
5. **The Spider (Magma Stalker):** Implement the burrowing mechanic (invincibility state, dust trail visual) and the surfacing melee swipe.

## Phase 4: Biomes and Progression
The game needs to transition through 10 stages across two distinct biomes.

1. **Biome 1: The Overgrown Laboratory (Stages 1-5):**
   - Implement mossy tiles, broken glass, and overgrown vegetation sprites.
   - Implement the Stage 5 Mid-Boss (massive wave survival or a giant mutant).
2. **Biome 2: The Core Reactor (Stages 6-10):**
   - Implement industrial metal tiles, catwalks over pits, and red-hot magma hazards that damage the player on contact.
3. **Stage Transitions:**
   - Create elevator or airlock rooms that safely transition the player between stages, saving their inventory and upgrades but generating a harder dungeon layout.

## Phase 5: The Final Escape (Endgame)
Implement the climax of the game as defined in Part 6 of the lore.

1. **The 60-Second Final Stand:**
   - On Stage 10, lock the doors in a massive circular room.
   - Trigger the Architect's final voice dialogue.
   - Spawn endless, intense waves of mixed enemies.
2. **The Aether Rift:**
   - Display the countdown timer on the React UI.
   - At 0:00, vaporize all enemies (white screen flash).
   - Spawn the swirling 3D Aether Rift portal.
3. **The Ending Sequence:**
   - Transition to the victory screen when the player touches the Rift.
   - Fade audio from intense combat tracks to peaceful surface-world ambient noise (birds chirping, wind).
   - Display: "PROJECT SLIME HAS ESCAPED. THANKS FOR PLAYING."