---
title: The Slime King
subtitle: A boss fight, and winning the game
time: about 1 hour
---

Deep in the locked room on level 3 sits a big, pink, crowned blob: the **Slime King**. 👑 He's not like other slimes. He has 20 hit points, he hits hard, he chases Grunk, and every time you bonk him, a little slime **splits off**!

Beat him, and you win the game.

## A royal portrait

Have a look at `king_slime.png` in the file list. Very regal. Add it to `sprites.ts`, after the ghost. Its name will be `king`, because that's what we'll call this kind of monster:

```ts op=after file=sprites.ts anchor="ghost: loadImage"
  king: loadImage("king_slime"),
```

## The king is a monster too

Add `"king"` to the list of monster kinds in `monsters.ts`:

```ts op=replace file=monsters.ts
export type MonsterKind = "slime" | "bat" | "skeleton" | "mushroom" | "ghost";
=====
export type MonsterKind = "slime" | "bat" | "skeleton" | "mushroom" | "ghost" | "king";
```

TypeScript immediately spots that `monsterStats` doesn't have a case for kings. Give him some boss-sized stats:

```ts op=replace file=monsters.ts
    case "ghost":
      return { hp: 3, attack: 1 };
=====
    case "ghost":
      return { hp: 3, attack: 1 };
    case "king":
      return { hp: 20, attack: 3 };
```

He's a `K` on the map (look at level 3!), so add that to `monsterKindForTile` too:

```ts op=replace file=monsters.ts
    case "g":
      return "ghost";
=====
    case "g":
      return "ghost";
    case "K":
      return "king";
```

Press **▶ Play** and go look at the king. (The key for his room is in the bottom-left of level 3.) Right now he just wobbles about at random, like a slime. Let's give him a royal brain.

> **Tip:** Testing level 3 means walking through levels 1 and 2 every time. To skip ahead while testing, change `startLevel(0)` in `startGame` to `startLevel(2)`. Just remember to change it back afterwards!

## The king gives chase

The king always knows where Grunk is, and always heads straight for him. Add a case to `chooseStep`:

```ts op=replace file=monsters.ts
    case "ghost":
      if (Math.random() < 0.5) {
=====
    case "king":
      return stepToward(monster, heroX, heroY);
    case "ghost":
      if (Math.random() < 0.5) {
```

The locked door keeps him in his room until Grunk opens it, so he'll be waiting somewhere behind it…

## A splitting headache

Here's the king's special power: whenever he's hit (and survives), a new slime splits off and lands next to him.

To place the new slime, we'll pick a random direction with `randomStep` and check that the spot is free. Import `randomStep` into `main.ts` again:

```ts op=replace file=main.ts
import { Monster, chooseStep, createMonster, monsterKindForTile } from "./monsters";
=====
import { Monster, chooseStep, createMonster, monsterKindForTile, randomStep } from "./monsters";
```

Add a function to make the new slime, before `attackMonster`:

```ts op=before file=main.ts anchor="function attackMonster("
function spawnSlimeNear(x: number, y: number) {
  const step = randomStep();
  const newX = x + step.dx;
  const newY = y + step.dy;
  if (!isBlocked(newX, newY)) {
    monsters.push(createMonster("slime", newX, newY));
    addFloatingText("split!", newX, newY, "#6cd06a");
  }
}

```

If the random spot is blocked, no slime appears this time. Lucky Grunk!

Then call it in `attackMonster` when the king gets hit:

```ts op=after file=main.ts anchor="message = `${hero.name} ${randomHitWord()}s the ${monster.kind}!`;"
  if (monster.kind === "king" && monster.hp > 0) {
    spawnSlimeNear(monster.x, monster.y);
  }
```

Press **▶ Play** and bonk the king. Slimes everywhere! 🟢🟢🟢

## A banner for every occasion

When Grunk defeats the king, we want a big "VICTORY!" message across the screen. That's almost exactly the same as the "GAME OVER" message, just with different words and colors.

Instead of copying all that code, let's turn it into a function with parameters for the parts that change. Add it before `drawGame`:

```ts op=before file=main.ts anchor="function drawGame()"
function drawBanner(title: string, color: string, subtitle: string) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, 768, 480);
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "bold 56px monospace";
  ctx.fillText(title, 384, 200);
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.fillText(subtitle, 384, 250);
  ctx.fillText("Press R to play again", 384, 290);
  ctx.textAlign = "left";
}

```

Now the game-over code in `drawGame` can shrink down to a single line:

```ts op=replace file=main.ts
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, 768, 480);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 56px monospace";
    ctx.fillText("GAME OVER", 384, 220);
    ctx.font = "20px monospace";
    ctx.fillText("Press R to try again", 384, 270);
    ctx.textAlign = "left";
  }
=====
  if (gameOver) {
    drawBanner("GAME OVER", "#ff5c7a", `${hero.name} rests in pieces.`);
  }
```

Press **▶ Play** and get defeated to check it still works. Much tidier!

> **Why:** Programmers call this **DRY**: *Don't Repeat Yourself*. When the same code shows up in two places, put it in a function. Then if you want to change how banners look, you only have to change it once.

## Victory!

Now for the good part. We need to remember whether Grunk has won. Add a variable under `gameOver`:

```ts op=after file=main.ts anchor="let gameOver: boolean = false;"
let gameWon: boolean = false;
```

Reset it when a new game starts:

```ts op=after file=main.ts anchor="  gameOver = false;"
  gameWon = false;
```

When the king is defeated, Grunk wins! Add this inside the "defeated" part of `attackMonster`:

```ts op=after file=main.ts anchor="message = `${hero.name} defeats the ${monster.kind}!`;"
    if (monster.kind === "king") {
      gameWon = true;
      message = `${hero.name} defeats the Slime King! The dungeon is saved!`;
    }
```

After winning, Grunk shouldn't be able to move any more, and pressing R should start a new game. The key handler already does exactly that when the game is over. We can make it do the same when the game is won, with `||`:

```ts op=replace file=main.ts
  if (gameOver) {
    if (event.key === "r") {
=====
  if (gameOver || gameWon) {
    if (event.key === "r") {
```

The leftover slimes shouldn't be able to attack a champion who has already won, either. Stop `endTurn` early if the game is won:

```ts op=replace file=main.ts
function endTurn() {
  moveMonsters();
=====
function endTurn() {
  if (gameWon) {
    return;
  }
  moveMonsters();
```

Finally, the victory banner, at the end of `drawGame`:

```ts op=replace file=main.ts
    drawBanner("GAME OVER", "#ff5c7a", `${hero.name} rests in pieces.`);
  }
=====
    drawBanner("GAME OVER", "#ff5c7a", `${hero.name} rests in pieces.`);
  }
  if (gameWon) {
    drawBanner("VICTORY!", "#ffd23f", `${hero.name} is the hero of the dungeon, with ${hero.gold} gold!`);
  }
```

Press **▶ Play** and go beat the Slime King! You'll want the hammer from level 3, the armor from level 2, and maybe a spicy pepper for the big fight. 🏆

## A boss health bar

Every good boss fight has a giant health bar at the top of the screen. Let's add one! We need to find the king in the monsters list. There's a list tool for that too: `find` gives back the first item that passes a test, or `undefined` if nothing does. Add this function before `drawGame`:

```ts op=before file=main.ts anchor="function drawGame()"
function drawBossBar() {
  const king = monsters.find((monster) => monster.kind === "king");
  if (!king) {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(184, 6, 400, 38);
  ctx.fillStyle = "white";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("THE SLIME KING", 384, 22);
  ctx.textAlign = "left";
  ctx.fillStyle = "#3a0d16";
  ctx.fillRect(194, 28, 380, 10);
  ctx.fillStyle = "#ff7fbf";
  ctx.fillRect(194, 28, 380 * (king.hp / king.maxHp), 10);
}

```

If there's no king on this level (or he's been defeated), `find` gives back `undefined` and we return without drawing anything. Otherwise we draw a dark box, a title, and a pink bar that shrinks as the king loses health, just like the little monster health bars.

Draw it after the floating texts in `drawGame`:

```ts op=replace file=main.ts
  drawFloatingTexts();
=====
  drawFloatingTexts();
  drawBossBar();
```

## A royal welcome

One last touch: when Grunk reaches level 3, let's give him a spooky warning. Add this to the end of `startLevel`'s setup, right after the welcome message:

```ts op=after file=main.ts anchor="message = `${hero.name} enters level ${levelNumber + 1}.`;"
  if (levelNumber === levels.length - 1) {
    message = "A royal BLOOP echoes through the dungeon...";
  }
```

`levels.length - 1` is the number of the **last** level. We could have written `2`, but this way it still works if you add more levels later. The king will always be waiting at the bottom.

Press **▶ Play** and play the whole game from start to finish. You made this!

### Chapter complete! 🎉

You've built a complete game, with a beginning, a middle and a big boss at the end. You learned:

- Adding a new kind of monster touches several places, and **TypeScript helps you find them all**.
- **DRY**: *Don't Repeat Yourself*. Shared code goes in a function with parameters.
- `find` gives back the first item in a list that passes a test.
- `list.length - 1` is the position of the last item.

There's one chapter left, and it's all about **juice**: sounds, screen shake and bouncy animations that make the game *feel* great.
