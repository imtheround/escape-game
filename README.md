# Escape Game

## Run the game

Installing dependencies:
```
npm i
```

Start the development server:
```
npm run dev
```
Or start the build server:

```
npm run build
npm run start 
```

The game should be at [http://localhost:3000](http://localhost:3000) if the previous commands ran without error. The logic is primarily located in `src/game/GameManager.ts`.


## Game Overview
A 2.5D game built with **Next.js**, **React**, and **PixiJS v8**.

![Escape](https://img.shields.io/badge/PixiJS-v8-ff69b4.svg?style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=flat-square)

## Overview

"Escape" is a fast-paced, plot-driven 2.5D roguelite dungeon crawler. The game features procedurally generated biomes, intense twin-stick shooter combat, and a dynamic progression system.

### Key Technical Architecture
* **Custom 2.5D Rendering Engine:** The game abandons standard 2D top-down tilemaps for a mathematically projected pseudo-3D parallax engine. Walls and obstacles dynamically extrude toward the camera focal point, giving real depth to the world at a rock-solid 60 FPS.
* **Lighting System:** Additive radial gradients and dynamic directional flashlight cones are rendered over the 3D environment to create a dark, immersive dungeon.
* **Procedural SVG Assets:** The asset generation pipeline creates SVG textures from embedded string matrices (`scripts/generateAssets.js`), bypassing the need for heavy network payloads for bitmap sprites.

## Phase 4: Roguelite Progression & Biome Ecosystems

Moving away from the open-world concept, the game will focus on tight, action-packed dungeon progression with deep roguelite mechanics:

1. **Roguelite Leveling System:** 
   - Defeated enemies will drop **EXP Bulbs**. 
   - Collecting enough EXP triggers a Level Up, temporarily pausing the game to offer a choice between 3 random upgrades out of a pool of 10+ modifiers.

2. **The Upgrade Pool (10+ Modifiers):**
   - **Bouncy Bullets:** Bullets ricochet up to 3 times off walls.
   - **Piercing Rounds:** Bullets pierce through at least 1 enemy before destroying.
   - **Kinetic Shield:** Gain a temporary damage-absorbing shield after defeating 5 enemies.
   - **Vitality Surge:** Increases Max HP by +4 and heals for that amount.
   - **Fleet Footed:** Base movement speed increased by 15%.
   - **Rapid Fire:** Reduces ranged weapon cooldowns by 20%.
   - **Scavenger's Reach:** Increases magnet pickup radius for EXP and coins by 50%.
   - **Sword Mastery:** Sword swing arc is 50% wider and deals extra damage.
   - **Nimble Fighter:** Dodge roll stamina cost is reduced by 30%.
   - **Shrapnel Rounds:** Bullets explode into smaller shrapnel shards upon shattering.
   - **Vampirism:** 5% chance to heal 1 HP on enemy kill.

3. **Enemy Building System (Skeletal Animation):** 
   - Rather than standard 2D SVGs, enemies will be procedurally generated and assembled from geometric primitives (Core, Armor, Weapon). 
   - They will be built using a modular component system allowing distinct enemy archetypes.
   - They will be animated mathematically using trigonometric sine-waves within the update loop to preserve the 60 FPS target without VRAM bloat.

4. **Biome 1: The Goblin Stronghold:**
   - **Goblins (5 Archetypes):**
     1. *Grunt:* Basic melee attacker that swarms the player.
     2. *Archer:* Ranged unit that flees to maintain distance before shooting.
     3. *Shield-Bearer:* Blocks attacks from the front; must be flanked.
     4. *Shaman:* Casts buffs on allies or heals them.
     5. *Bomber:* Screams and sprints directly at the player to detonate.
   - **Beasts & Hazards:**
     1. *Charging Bull:* Winds up and charges in a devastating straight line.
     2. *Exploding Spider:* Extremely fast; drops slowing webs and bursts into acid upon death.

### Next Moves for the Player (Gameplay Loop)
- **Sector Exploration:** The player navigates procedurally generated dungeon sectors, utilizing their flashlight and minimap.
- **Combat & Growth:** The player must continuously move, dodge-roll, and swap weapons to manage crowds of distinct enemy types while hoovering up EXP bulbs to scale their power.
- **Boss Extraction:** At the end of a biome, the player must face a massive Gatekeeper boss to unlock the portal to the next thematic biome.

---