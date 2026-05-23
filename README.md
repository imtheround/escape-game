todo: Translate the game into french, add more mobs, complete readme, complete version to host on website
Note: the website isn't currently online (due to some weird permission error on linux with assets folder, aswell as because some features aren't done should be up before 5/24)

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

![PixiJS](https://img.shields.io/badge/PixiJS-v8-ff69b4.svg?style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=flat-square)

## Overview

The entry point for the game is located at escape-game\src\app\page.tsx, it contains all the ui elements and the starting menu, everything else in app/ are code to hold the website up.
The core game logic is located at escape-game\src\game\GameManager.ts, this is where the entire game happens.
escape-game\src\components\GameCanvas.tsx is the code responsible for drawing the things to render from GameManager.ts to the browser window.
The rendering engine is pixi js, a library for 2d games, however, I achieved a "fake 3d" effect by adding a extra z axis and rendering the fake heights. 

All the assets for the game is located in public/, this includes audio, fonts, imgs (mostly in svg), bgm... etc
Most of the assets are generated using escape-game\scripts\generateAssets.js, which uses js to generate audio & svgs

## AI usage in this project

99% of the code in this game was written by ai, the size of this project and my ambition was too large, and although I started writing the base of the project semi manually, some changes I wanted to make was too long and too complicated (eg: the maths required for rolling, smooth camera mouvement and the fake 3d effect which had to render on a 2d surface) 


---

Note: The readme isn't done yet, ill add more details on GameManager.ts, for example, on how some features were realized.
