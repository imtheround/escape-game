# Lore Alignment Plan

This document outlines the roadmap to retrofit the current game systems to perfectly match the `LORE.md` bible, while keeping the newly added Stage 10 Final Boss & 60-Second Timer challenge.

## Phase 1: Player & UI Alignment
1. **The Protagonist (Project Slime):**
   - Add a persistent cyan slime trail particle emitter to the player that dissipates over time.
2. **The Architect:**
   - Update the dialogue system so the speaker is represented by the upside-down question mark (`¿`) and the text matches the cold, analytical tone of The Architect.
3. **The Merchant (B-44):**
   - Update the Shop UI in `page.tsx` to display the name `REQ-TERMINAL` and the drone's cracked screen face `=)`.

## Phase 2: Enemy Mechanics & Visuals
1. **The Archer:**
   - Implement the 1.5-second glowing red telegraph line before it fires its plasma bolt.
2. **The Bomber:**
   - Add a trail of sparks to its movement.
3. **The Spider:**
   - Ensure the sprite becomes completely invisible while burrowed (alpha = 0), leaving only a dust trail particle effect on the ground, before surfacing.

## Phase 3: Environmental Hazards
1. **Biome 1: Overgrown Laboratory (Stages 1-5)**
   - **Irradiated Water:** Implement glowing green/blue water puddles that deal damage over time if stood in (requiring dodge rolls to cross safely).
   - **Thorny Thickets:** Ensure the static trees act as impenetrable walls.
2. **Biome 2: Core Reactor (Stages 6-10)**
   - **Magma Flows:** Implement lava tiles that deal massive, instant damage.
   - **Steam Vents:** Add periodic steam eruptions that damage the player if they don't time their sprints correctly.

## Phase 4: Weapons & Economy Sync
1. **Weapon Stats:**
   - Ensure the `WeaponRegistry` stats perfectly match the lore:
     - Pistol: Dmg 30, Fire Rate 250ms, Ammo 12, Reload 1.2s.
     - Machine Gun: Dmg 35, Fire Rate 100ms, Ammo 50, Reload 2.5s (heavy movement penalty).
     - Shotgun: Dmg 15x5 pellets, Fire Rate 800ms, Ammo 9, Reload 0.6s.
2. **Upgrades (Leveling Up):**
   - Replace the current 11 upgrades with the 8 specific lore upgrades:
     - Vampirism (5% chance to heal 1 HP on kill)
     - Bouncy Bullets (Ricochet 2 times)
     - Piercing Rounds (Pass through 1 enemy)
     - Titanium Plating (+2 Max HP)
     - Adrenaline (+15% Move Speed)
     - Lightweight (-30% Roll Cooldown)
     - Explosive Rounds (10% chance to explode on impact)
     - Magnetic Pull (+200% Pickup Radius)

## Phase 5: Progression Structure
1. **Stage 5 Boss Room:**
   - Change the end of Stage 5 from a standard layout with a Golem to a dedicated "massive wave survival room" as dictated by the lore.
2. **The Final Escape (Stage 10):**
   - Retain the newly implemented 60-second timer and the giant Final Boss Spider. 
   - Keep the Aether Rift portal and white flash sequence upon victory.