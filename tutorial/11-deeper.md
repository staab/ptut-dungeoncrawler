---
title: Deeper and Deeper
subtitle: More levels, stairs, locked doors and keys
time: about 1½ hours
---

One level is a nice start, but real dungeons go **down**. In this chapter you'll add two more levels, stairs to get between them, and locked doors that need a key.

You'll also learn about **lists of lists**, how to **copy** a list, and how to change one letter in the middle of a string.

## Two more levels

Open `levels.ts`. First, add two new map symbols to the key at the top, and put some stairs (`>`) in the bottom-right corner of level 1:

```ts op=replace file=levels.ts
//   ^  is a pot helmet   [  is shiny armor
=====
//   ^  is a pot helmet   [  is shiny armor
//
//   >  is the stairs down to the next level
//   D  is a locked door (it needs a key)
```

```ts op=replace file=levels.ts
  "#m....../....g.#",
=====
  "#m....../....g>#",
```

Now add two brand-new levels to the bottom of the file. Level 2 has a locked door, and level 3 is… well, you'll see. 👑

```ts op=append file=levels.ts

export const level2: string[] = [
  "################",
  "#@..#......b...#",
  "#...#.####.###.#",
  "#.x...#..$...#.#",
  "#...#.#.##.#.#.#",
  "##.##.#..g.#...#",
  "#%....####.###D#",
  "#..s..#!.....#[#",
  "#.b...#..x...#>#",
  "################",
];

export const level3: string[] = [
  "################",
  "#@..#.....m....#",
  "#.T.#.########.#",
  "#...#.#......#.#",
  "#.....#..K...#.#",
  "###.#.#......#.#",
  "#!..#.###D####.#",
  "#.s.#......x...#",
  "#..%..g...!..*.#",
  "################",
];

// All the levels, in order.
export const levels: string[][] = [level1, level2, level3];
```

That last line is a list of levels, and each level is a list of strings. So it's a **list of lists**! Its type, `string[][]`, means exactly that. `levels[0]` is level 1, `levels[1]` is level 2, and `levels[2]` is level 3.

> **Heads up:** That's a lot of typing! Take your time and check each row is 16 characters long. If a row is too short or too long, the dungeon will look wonky.

## The current map

Until now, `main.ts` has used `level1` directly. Now we need a variable that holds whichever level Grunk is on. Import the `levels` list instead of `level1`:

```ts op=replace file=main.ts
import { level1 } from "./levels";
=====
import { levels } from "./levels";
```

Then add two new variables, under `let items`: the number of the level Grunk is on, and that level's map.

```ts op=after file=main.ts anchor="let items: Item[] = [];"
let levelNumber: number = 0;
let map: string[] = [];
```

In `startGame`, fill in `map` with a copy of the current level:

```ts op=after file=main.ts anchor='message = "Welcome to the dungeon!";'
  map = levels[levelNumber].slice();
```

`slice()` makes a **copy** of a list. Why a copy, and not the level itself? Later in this chapter, we'll change the map when Grunk unlocks a door. If we changed the original level, the door would stay unlocked forever, even after pressing R to start again! With a copy, we can scribble on it as much as we like.

Now change every `level1` in `main.ts` to `map`. The loop in `startGame`:

```ts op=replace file=main.ts
  for (let y = 0; y < level1.length; y++) {
    for (let x = 0; x < level1[y].length; x++) {
      if (level1[y][x] === "@") {
        hero.x = x;
        hero.y = y;
      } else {
        const kind = monsterKindForTile(level1[y][x]);
        if (kind) {
          monsters.push(createMonster(kind, x, y));
        }
        const itemKind = itemKindForTile(level1[y][x]);
=====
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === "@") {
        hero.x = x;
        hero.y = y;
      } else {
        const kind = monsterKindForTile(map[y][x]);
        if (kind) {
          monsters.push(createMonster(kind, x, y));
        }
        const itemKind = itemKindForTile(map[y][x]);
```

`isWall`:

```ts op=replace file=main.ts
  return level1[y][x] === "#";
=====
  return map[y][x] === "#";
```

And the loop that draws the map in `drawGame`:

```ts op=replace file=main.ts
  for (let y = 0; y < level1.length; y++) {
    for (let x = 0; x < level1[y].length; x++) {
      if (level1[y][x] === "#") {
=====
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === "#") {
```

> **Tip:** When you think you've got them all, search for `level1` with [[Ctrl]] + [[F]] (or [[⌘]] + [[F]]). TypeScript will also underline any you missed, because `level1` isn't imported any more.

Press **▶ Play**. It's still level 1, and everything works as before. But now we can easily switch levels…

> **Try it:** Change `let levelNumber: number = 0;` to `2` and press Play. You start on level 3! Have a peek, then set it back to `0`.

## Starting a level

Starting a new *game* and starting a new *level* aren't quite the same thing. A new game resets everything about Grunk. But when he goes down the stairs, he should keep his health, gold and backpack. Only the map, monsters and items change.

So let's split `startGame` in two. The top part resets Grunk, and a new function, `startLevel`, sets up a level:

```ts op=replace file=main.ts
function startGame() {
  hero.hp = hero.maxHp;
  hero.gold = 0;
  hero.inventory = [];
  hero.weapon = undefined;
  hero.armor = undefined;
  hero.rage = 0;
  monsters = [];
  items = [];
  gameOver = false;
  message = "Welcome to the dungeon!";
  map = levels[levelNumber].slice();
=====
function startGame() {
  hero.hp = hero.maxHp;
  hero.gold = 0;
  hero.inventory = [];
  hero.weapon = undefined;
  hero.armor = undefined;
  hero.rage = 0;
  gameOver = false;
  startLevel(0);
}

function startLevel(number: number) {
  levelNumber = number;
  map = levels[levelNumber].slice();
  monsters = [];
  items = [];
  floatingTexts = [];
  message = `${hero.name} enters level ${levelNumber + 1}.`;
```

Now `startGame` resets Grunk and then calls `startLevel(0)`. `startLevel` takes the level's number as a parameter, remembers it in `levelNumber`, and does the rest: copies the map, clears the monsters, items and floating numbers, and searches the map for everything. (The searching loop hasn't changed; it's just part of `startLevel` now.)

Press **▶ Play** to make sure everything still works.

## Stairs

Let's draw the stairs, and the doors while we're at it. Add both pictures to `sprites.ts`:

```ts op=after file=sprites.ts anchor="floor: loadImage"
  stairs: loadImage("stairs"),
  door: loadImage("door"),
```

Then teach `drawGame` about the new tiles:

```ts op=replace file=main.ts
      if (map[y][x] === "#") {
        drawTile(sprites.wall, x, y);
      } else {
        drawTile(sprites.floor, x, y);
      }
=====
      if (map[y][x] === "#") {
        drawTile(sprites.wall, x, y);
      } else if (map[y][x] === ">") {
        drawTile(sprites.stairs, x, y);
      } else if (map[y][x] === "D") {
        drawTile(sprites.door, x, y);
      } else {
        drawTile(sprites.floor, x, y);
      }
```

When Grunk steps onto the stairs, he goes down to the next level. Add this in the key handler, right after Grunk moves and picks things up:

```ts op=replace file=main.ts
    pickUpItem();
  }
=====
    pickUpItem();
    if (map[hero.y][hero.x] === ">") {
      startLevel(levelNumber + 1);
      return;
    }
  }
```

We `return` straight away, so the monsters on the new level don't get a free turn before Grunk has even arrived.

Press **▶ Play** and head for the stairs in the bottom-right corner of level 1. Down you go! 🪜

## Locked doors

Level 2 has a locked door, drawn with a `D`. Monsters can't get through doors, and neither can Grunk unless he has a key. Let's treat doors like walls in `isWall`:

```ts op=replace file=main.ts
  return map[y][x] === "#";
=====
  return map[y][x] === "#" || map[y][x] === "D";
```

Now, when Grunk walks into a door, he should try to unlock it. Add a function after `useItem`:

```ts op=before file=main.ts anchor="const hitWords"
function unlockDoor(x: number, y: number) {
  const keyIndex = hero.inventory.findIndex((item) => item.kind === "key");
  if (keyIndex === -1) {
    message = "The door is locked. If only there was a key...";
    return;
  }
  hero.inventory.splice(keyIndex, 1);
  map[y] = map[y].slice(0, x) + "." + map[y].slice(x + 1);
  message = `${hero.name} unlocks the door!`;
}

```

There are two new tricks in here:

- `findIndex` is a bit like `filter`. It goes through the list and gives back the **position** of the first item that passes the test. If nothing passes, it gives back `-1`. So `keyIndex` is either where the key is in the backpack, or `-1` if there's no key.
- Strings can't be changed one letter at a time. Instead, we build a new string for that row out of three pieces: the part **before** the door, `map[y].slice(0, x)`, then a `"."` for floor, then the part **after** the door, `map[y].slice(x + 1)`. (Strings have a `slice` too! With numbers in the brackets, it cuts out part of the string.)

For example, if the row is `"##D##"` and the door is at x = 2, then `slice(0, 2)` is `"##"`, and `slice(3)` is `"##"`. Glued together with a `"."` in the middle, that's `"##.##"`. The door is gone!

Now call it from the key handler, **before** the wall check (otherwise the wall check would stop Grunk first):

```ts op=replace file=main.ts
  // Walking into a wall doesn't use up a turn.
=====
  // Walking into a door tries to unlock it (unless a ghost is floating in the doorway!).
  if (map[newY][newX] === "D" && !monsterAt(newX, newY)) {
    unlockDoor(newX, newY);
    return;
  }

  // Walking into a wall doesn't use up a turn.
```

Finally, players might try pressing the key's number to use it. Let's give them a hint in `useItem`:

```ts op=replace file=main.ts
    default:
      message = `${hero.name} can't use the ${item.name} right now.`;
=====
    case "key":
      message = "Walk into a locked door to use the key.";
      return false;
    default:
      message = `${hero.name} can't use the ${item.name} right now.`;
```

Press **▶ Play**, go down to level 2, find the key, and open the door. Something shiny is waiting behind it!

## Show the level

Players should know which level they're on. Let's add it to the stats line in the HUD. There's not much room, so we'll use shorter labels:

```ts op=replace file=main.ts
  ctx.fillText(`Attack: ${heroAttack()}   Defense: ${heroDefense()}   Gold: ${hero.gold}`, 16, 536);
=====
  ctx.fillText(`Level ${levelNumber + 1}   ATK ${heroAttack()}   DEF ${heroDefense()}   Gold ${hero.gold}`, 16, 536);
```

Press **▶ Play** and explore all three levels. What's behind that locked door on level 3? Nothing yet… but something is coming. 🤔 (That's next chapter!)

## Be the dungeon architect

You've got three levels now, and adding more is easy: make a new `level4` array, add it to the `levels` list, and make sure there are stairs on level 3 to get there. The game does the rest!

Some ideas:

- A **treasure vault**: a level full of gold, guarded by skeletons.
- A **ghost house** with lots of little rooms (ghosts don't care about walls!).
- A **maze** with the key hidden in a dead end.
- A **bat cave**. You'll need lots of potions.

> **Heads up:** If Grunk takes the stairs on the last level, `levels[levelNumber + 1]` doesn't exist and the game will crash. Always make sure the last level has no stairs!

### Chapter complete! 🎉

The dungeon is three floors deep. You learned:

- **Lists of lists**, like `string[][]`.
- `slice()` copies a list, and `slice(start, end)` cuts out part of a string or list.
- `findIndex` finds the position of an item, and gives `-1` if it isn't there.
- Splitting a function in two so each part can be used on its own.

Next chapter: the **Slime King** awakens. 👑
