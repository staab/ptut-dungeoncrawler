---
title: Juice It Up
subtitle: Sounds, screen shake and bouncy animation
time: about 1 hour
---

Your game works. Now let's make it *feel* amazing!

Game designers call this **juice**: all the little sounds, wobbles and shakes that don't change the rules, but make every action feel satisfying. It's often the difference between a game that's OK and a game you can't put down.

In this final chapter you'll add:

- 🔊 **sound effects** for everything,
- 📳 **screen shake** when Grunk gets hurt,
- 🦘 **bouncy animation**, so everything feels alive.

## A sound file

Click some of the `.wav` files in the file list and press **Play sound** to hear them. There's a sound for hitting, getting hurt, picking up coins and lots more.

Loading sounds works a lot like loading pictures. Click **+ New file**, name it `sounds.ts`, and type:

```ts op=create file=sounds.ts
// All the sound effects in the game.

function loadSound(name: string): HTMLAudioElement {
  return new Audio("assets/" + name + ".wav");
}

export const sounds = {
  hit: loadSound("hit"),
  hurt: loadSound("hurt"),
  defeat: loadSound("defeat"),
  coin: loadSound("coin"),
  pickup: loadSound("pickup"),
  potion: loadSound("potion"),
  equip: loadSound("equip"),
  powerup: loadSound("powerup"),
  door: loadSound("door"),
  stairs: loadSound("stairs"),
  bump: loadSound("bump"),
  win: loadSound("win"),
  lose: loadSound("lose"),
};

export function playSound(sound: HTMLAudioElement) {
  const copy = sound.cloneNode() as HTMLAudioElement;
  copy.volume = 0.5;
  copy.play();
}
```

`new Audio(...)` loads a sound, just like `new Image()` loads a picture. `HTMLAudioElement` is TypeScript's name for a sound.

Why does `playSound` make a **copy** of the sound before playing it? Because one sound can only play once at a time. If two monsters get bonked quickly, the second bonk would cut off the first. With a fresh copy every time, sounds can overlap.

`copy.volume = 0.5` plays it at half volume. (`1` is full volume, and `0` is silent.)

## Sounds of battle

Import the sounds into `main.ts`:

```ts op=after file=main.ts anchor='import { Item, createItem, itemKindForTile } from "./items";'
import { sounds, playSound } from "./sounds";
```

Now add sounds to the fighting. When Grunk hits a monster:

```ts op=after file=main.ts anchor='addFloatingText(`-${damage}`, monster.x, monster.y, "white");'
  playSound(sounds.hit);
```

When a monster is defeated:

```ts op=after file=main.ts anchor="message = `${hero.name} defeats the ${monster.kind}!`;"
    playSound(sounds.defeat);
```

When Grunk gets hurt:

```ts op=after file=main.ts anchor='addFloatingText(`-${damage}`, hero.x, hero.y, "#ff5c7a");'
  playSound(sounds.hurt);
```

When it's game over:

```ts op=after file=main.ts anchor="    gameOver = true;"
    playSound(sounds.lose);
```

And the sweet sound of victory:

```ts op=after file=main.ts anchor="gameWon = true;"
      playSound(sounds.win);
```

Press **▶ Play** (with your volume turned up!) and pick a fight. 🔊

> **Heads up:** Browsers don't let web pages make sounds until you've clicked on them or pressed a key. So the very first sound might be silent, and that's normal.

## Sounds of treasure

Next, sounds for picking things up. Coins get a special "kaching":

```ts op=after file=main.ts anchor="hero.gold = hero.gold + amount;"
    playSound(sounds.coin);
```

```ts op=after file=main.ts anchor="hero.inventory.push(item);"
    playSound(sounds.pickup);
```

And for using things. Drinking a potion:

```ts op=after file=main.ts anchor='addFloatingText("+5", hero.x, hero.y, "#6cd06a");'
      playSound(sounds.potion);
```

Equipping a weapon, and putting on armor:

```ts op=after file=main.ts anchor="hero.weapon = item;"
      playSound(sounds.equip);
```

```ts op=after file=main.ts anchor="hero.armor = item;"
      playSound(sounds.equip);
```

And the spicy pepper, of course:

```ts op=after file=main.ts anchor="hero.rage = 10;"
      playSound(sounds.powerup);
```

Press **▶ Play** and go shopping in the dungeon.

## Sounds of the dungeon

Just a few left. Unlocking a door:

```ts op=after file=main.ts anchor="unlocks the door!`;"
  playSound(sounds.door);
```

Going down the stairs:

```ts op=before file=main.ts anchor="startLevel(levelNumber + 1);"
      playSound(sounds.stairs);
```

And a little "bump" when Grunk walks into a wall. That's a nice way to tell the player "you can't go that way":

```ts op=replace file=main.ts
  if (isWall(newX, newY) && !monsterAt(newX, newY)) {
    return;
  }
=====
  if (isWall(newX, newY) && !monsterAt(newX, newY)) {
    playSound(sounds.bump);
    return;
  }
```

Press **▶ Play** and listen to your dungeon. 🎵

## Screen shake

When Grunk takes a hit, let's shake the whole screen for a moment. It makes every hit feel heavier.

We'll keep a `shake` number that says how strong the shaking is. Add it under `let gameWon`:

```ts op=after file=main.ts anchor="let gameWon: boolean = false;"
let shake: number = 0;
```

Getting hurt sets it to 10:

```ts op=after file=main.ts anchor="playSound(sounds.hurt);"
  shake = 10;
```

Now the trick. At the start of `drawGame`, just after the background is painted, we **move the whole canvas** by a small random amount. Everything we draw afterwards lands slightly off-center, so the picture jumps about. Each frame, the shake gets a little weaker, until it stops:

```ts op=after file=main.ts anchor="ctx.fillRect(0, 0, 768, 576);"

  ctx.save();
  if (shake > 0) {
    const shakeX = Math.random() * shake - shake / 2;
    const shakeY = Math.random() * shake - shake / 2;
    ctx.translate(shakeX, shakeY);
    shake = shake - 1;
  }
```

- `ctx.translate(x, y)` moves where everything gets drawn. After `ctx.translate(3, -2)`, drawing at `0, 0` actually draws at `3, -2`.
- `ctx.save()` takes a snapshot of the drawing settings, and `ctx.restore()` puts them back the way they were. That way the shake only affects the dungeon, not the HUD.

`Math.random() * shake - shake / 2` is a random number from `-5` to `5` when `shake` is 10. As `shake` counts down, the wobble gets smaller and smaller.

Restore the settings after the dungeon is drawn, but before the HUD:

```ts op=replace file=main.ts
  drawFloatingTexts();
  drawBossBar();
=====
  drawFloatingTexts();
  ctx.restore();
  drawBossBar();
```

Press **▶ Play** and let a monster hit you. Ooof! 📳

## Bouncy animation

Finally, let's bring the dungeon to life with a little bounce. Things that move, even a tiny bit, feel alive.

First, we'll count frames, so we know how much time has passed. Add a counter under `let shake`:

```ts op=after file=main.ts anchor="let shake: number = 0;"
let frame: number = 0;
```

Count up by one every time the game loop runs:

```ts op=replace file=main.ts
function gameLoop() {
  drawGame();
=====
function gameLoop() {
  frame = frame + 1;
  drawGame();
```

Next, `drawTile` needs to be able to draw something a little higher than normal. We'll add a new parameter called `lift`: how many pixels to lift the picture up.

```ts op=replace file=main.ts
function drawTile(image: HTMLImageElement, x: number, y: number) {
  ctx.drawImage(image, toPixels(x), toPixels(y), TILE_SIZE, TILE_SIZE);
}
=====
function drawTile(image: HTMLImageElement, x: number, y: number, lift: number = 0) {
  ctx.drawImage(image, toPixels(x), toPixels(y) - lift, TILE_SIZE, TILE_SIZE);
}
```

`lift: number = 0` gives the parameter a **default value**. If you call `drawTile` without a fourth number, like all our walls and floors do, `lift` is just 0. So nothing else needs to change!

Now make Grunk bounce:

```ts op=replace file=main.ts
    drawTile(sprites.hero, hero.x, hero.y);
=====
    const bounce = Math.abs(Math.sin(frame / 10)) * 4;
    drawTile(sprites.hero, hero.x, hero.y, bounce);
```

`Math.sin` makes a **wave**. As `frame` counts up, `Math.sin(frame / 10)` smoothly swings between `-1` and `1`, back and forth, forever. `Math.abs` flips the negative half up, so it goes 0 → 1 → 0 → 1… like a bouncing ball. Times 4, Grunk bounces up to 4 pixels high.

And make the monsters wobble too:

```ts op=replace file=main.ts
    drawTile(sprites[monster.kind], monster.x, monster.y);
=====
    const wobble = Math.abs(Math.sin(frame / 12 + monster.x)) * 3;
    drawTile(sprites[monster.kind], monster.x, monster.y, wobble);
```

The health bars should bob along with their monsters, so lift them by the same amount:

```ts op=replace file=main.ts
      ctx.fillRect(toPixels(monster.x) + 4, toPixels(monster.y) - 2, 40, 6);
      ctx.fillStyle = "#ff4f6d";
      ctx.fillRect(toPixels(monster.x) + 4, toPixels(monster.y) - 2, barWidth, 6);
=====
      ctx.fillRect(toPixels(monster.x) + 4, toPixels(monster.y) - 2 - wobble, 40, 6);
      ctx.fillStyle = "#ff4f6d";
      ctx.fillRect(toPixels(monster.x) + 4, toPixels(monster.y) - 2 - wobble, barWidth, 6);
```

Adding `monster.x` to the wave means monsters in different columns bounce at different times, instead of all together like a marching band.

Press **▶ Play**. Everything's bouncing! 🦘

## Where to go next

**You did it!** 🏆 You started with `console.log("Hello, dungeon!")` (it's still there at the top of `main.ts`!) and ended up with a complete game: three levels, six kinds of monster, eight kinds of item, a boss fight, sounds and animation. Every single line of it typed by you.

You now know the building blocks of almost every program ever written: **variables, types, functions, conditions, loops, lists and objects**. Everything else is just combining them in new ways.

The game is yours now, so keep changing it. Here are some ideas, from easier to harder:

- **Tweak the numbers.** Make potions heal more, the king tougher, or skeletons see further. Balancing a game is a real job!
- **Design new levels.** Add `level4`, `level5`… (Move the Slime King to the last one!)
- **A new monster.** Maybe a **goblin** that runs *away* from Grunk? You can reuse any picture: `goblin: loadImage("skeleton")`.
- **A new item.** A **mega potion** that heals everything? A **bomb** that damages every monster next to Grunk?
- **A score.** Give points for gold and defeated monsters, and show the score on the victory screen.
- **Walk animation.** Make Grunk face left when he walks left. (Hint: search the web for "canvas drawImage flip horizontally".)
- **Traps.** A new map tile, like `^`, that hurts Grunk when he steps on it. (You'll need to pick a different symbol for the helmet!)
- **A title screen** that says "Press Enter to start". (Hint: another boolean like `gameWon`, and another banner!)

> **Tip:** Whenever you want to try something big, you can always go back to any chapter using the **Chapters** menu, and **Reset chapter** gives you a clean copy of that chapter's code. So you can't break anything for good. Experiment!

Thank you for playing, and for building. Grunk is proud of you. 💪
