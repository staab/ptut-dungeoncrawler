---
title: A Monster Zoo
subtitle: Union types, switch and monster brains
time: about 1½ hours
---

Slimes are adorable, but a dungeon needs variety! In this chapter, four new monsters move in, and each one behaves differently:

- 🦇 **Bats** flap around randomly, and they're fast: **two** moves per turn.
- 💀 **Skeletons** spot Grunk from a distance and **chase** him.
- 🍄 **Mushrooms** never move, but they hit **hard** if you stand next to them.
- 👻 **Ghosts** drift slowly toward Grunk, **straight through walls**.

To build them, you'll learn about **union types**, the `switch` statement, and a little bit of math for chasing.

## Monster pictures

Take a look at `bat.png`, `skeleton.png`, `mushroom.png` and `ghost.png` in the file list. Then add them to `sprites.ts`, after the slime:

```ts op=after file=sprites.ts anchor="slime: loadImage"
  bat: loadImage("bat"),
  skeleton: loadImage("skeleton"),
  mushroom: loadImage("mushroom"),
  ghost: loadImage("ghost"),
```

## Kinds of monster

Right now a monster's `kind` can be any string at all. `"slime"`, sure, but also `"slmie"` or `"banana"`, and TypeScript wouldn't say a word. Let's tell TypeScript exactly which kinds of monster exist, using a **union type**. Add this in `monsters.ts`, above the `Monster` type:

```ts op=before file=monsters.ts anchor="export type Monster = {"
export type MonsterKind = "slime" | "bat" | "skeleton" | "mushroom" | "ghost";

```

Remember that `|` means "or" in a type. So a `MonsterKind` is `"slime"` or `"bat"` or `"skeleton"` or `"mushroom"` or `"ghost"`, and nothing else. Now use it for the `kind` property:

```ts op=replace file=monsters.ts
  kind: string;
=====
  kind: MonsterKind;
```

> **Try it:** In `main.ts`, change `kind: "slime"` to `kind: "slmie"`. TypeScript underlines it right away. Typos can't sneak past any more! Change it back.

Now for a neat trick. Did you notice that the monster kinds have exactly the same names as the sprites? That means we can use a monster's `kind` to look up its picture. Change the monster drawing in `drawGame`:

```ts op=replace file=main.ts
    drawTile(sprites.slime, monster.x, monster.y);
=====
    drawTile(sprites[monster.kind], monster.x, monster.y);
```

`sprites.slime` and `sprites["slime"]` mean exactly the same thing. But with square brackets, you can put a **variable** inside, so `sprites[monster.kind]` gets whichever picture matches the monster's kind. TypeScript even checks that every `MonsterKind` has a matching sprite.

## A monster factory

Every kind of monster needs its own **stats**: how much health it has and how hard it hits. Let's put all of that in `monsters.ts`, using a new tool called `switch`.

First, give monsters a `maxHp`, just like Grunk has. We'll use it later for health bars. (TypeScript will complain about the slime line in `main.ts` straight away, because slimes don't have a `maxHp` yet. We'll fix that in a moment.)

```ts op=after file=monsters.ts anchor="  hp: number;"
  maxHp: number;
```

Then add these at the bottom of `monsters.ts`:

```ts op=append file=monsters.ts

type MonsterStats = {
  hp: number;
  attack: number;
};

function monsterStats(kind: MonsterKind): MonsterStats {
  switch (kind) {
    case "slime":
      return { hp: 3, attack: 1 };
    case "bat":
      return { hp: 2, attack: 1 };
    case "skeleton":
      return { hp: 4, attack: 2 };
    case "mushroom":
      return { hp: 5, attack: 2 };
    case "ghost":
      return { hp: 3, attack: 1 };
  }
}

export function createMonster(kind: MonsterKind, x: number, y: number): Monster {
  const stats = monsterStats(kind);
  return { kind: kind, x: x, y: y, hp: stats.hp, maxHp: stats.hp, attack: stats.attack };
}
```

A `switch` is a tidier way to write a long chain of `if (kind === ...) else if (kind === ...)`. It looks at one value and jumps straight to the `case` that matches. Each case here returns right away, so the function ends there.

Because `kind` is a `MonsterKind`, TypeScript knows these five cases cover every possibility. Try deleting one of the cases: TypeScript will complain that the function might not return anything!

`createMonster` is a **factory**: you tell it what kind of monster you want and where, and it builds the whole object for you.

Now use the factory in `main.ts`. Update the import first:

```ts op=replace file=main.ts
import { Monster, randomStep } from "./monsters";
=====
import { Monster, randomStep, createMonster } from "./monsters";
```

And use it where we make slimes in `startGame`:

```ts op=replace file=main.ts
        monsters.push({ kind: "slime", x: x, y: y, hp: 3, attack: 1 });
=====
        monsters.push(createMonster("slime", x, y));
```

Press **▶ Play**. Everything should work just like before.

## A letter for every monster

On the map, each kind of monster needs its own letter. Add a function to the bottom of `monsters.ts` that turns a map letter into a monster kind:

```ts op=append file=monsters.ts

// Which monster does each letter on the map stand for?
export function monsterKindForTile(tile: string): MonsterKind | undefined {
  switch (tile) {
    case "s":
      return "slime";
    case "b":
      return "bat";
    case "x":
      return "skeleton";
    case "m":
      return "mushroom";
    case "g":
      return "ghost";
    default:
      return undefined;
  }
}
```

`default` is the `switch` version of `else`: it runs when none of the cases match. Any letter that isn't a monster gives back `undefined`.

Import it in `main.ts`:

```ts op=replace file=main.ts
import { Monster, randomStep, createMonster } from "./monsters";
=====
import { Monster, randomStep, createMonster, monsterKindForTile } from "./monsters";
```

Now `startGame` can make any kind of monster, not just slimes:

```ts op=replace file=main.ts
      } else if (level1[y][x] === "s") {
        monsters.push(createMonster("slime", x, y));
      }
=====
      } else {
        const kind = monsterKindForTile(level1[y][x]);
        if (kind) {
          monsters.push(createMonster(kind, x, y));
        }
      }
```

For every tile that isn't the `@`, we ask "is this a monster letter?". If we get back a kind (not `undefined`), we make that monster.

Finally, invite the new monsters onto the map in `levels.ts`:

```ts op=replace file=levels.ts
//   s  is a slime
export const level1: string[] = [
  "################",
  "#@.....#.......#",
  "#......#....s..#",
  "#......#...#...#",
  "#..........#...#",
  "#...s..#...#.s.#",
  "###.####...#####",
  "#.......s......#",
  "#..............#",
  "################",
];
=====
//   s  is a slime        b  is a bat
//   x  is a skeleton     m  is a mushroom
//   g  is a ghost
export const level1: string[] = [
  "################",
  "#@.....#.......#",
  "#......#....s..#",
  "#......#...#.b.#",
  "#..........#...#",
  "#...s..#...#.s.#",
  "###.####...#####",
  "#.......s..x...#",
  "#m...........g.#",
  "################",
];
```

Press **▶ Play**. A whole zoo! But they all behave like slimes, wandering about at random. Let's give them some personality.

## Skeletons give chase

To chase Grunk, a monster needs to work out which way to step to get closer to him. Here's the idea:

- `dx` is how far Grunk is to the right (it's negative if he's to the left).
- `dy` is how far Grunk is downwards (it's negative if he's above).
- Whichever distance is **bigger**, move one step in that direction.

Add this to the bottom of `monsters.ts`:

```ts op=append file=monsters.ts

// Which way should a monster step to get closer to a target?
function stepToward(monster: Monster, targetX: number, targetY: number): Step {
  const dx = targetX - monster.x;
  const dy = targetY - monster.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return { dx: Math.sign(dx), dy: 0 };
  } else {
    return { dx: 0, dy: Math.sign(dy) };
  }
}

// Each kind of monster decides how to move in its own way.
export function chooseStep(monster: Monster, heroX: number, heroY: number): Step {
  const distance = Math.abs(heroX - monster.x) + Math.abs(heroY - monster.y);
  switch (monster.kind) {
    case "skeleton":
      if (distance <= 6) {
        return stepToward(monster, heroX, heroY);
      }
      return randomStep();
    default:
      return randomStep();
  }
}
```

Two new math tools:

- `Math.abs(n)` is the **absolute** value: the number without its minus sign. `Math.abs(-3)` is `3`. We use it to compare distances, whichever direction they're in.
- `Math.sign(n)` gives `1` if n is positive, `-1` if it's negative, and `0` if it's zero. It turns "Grunk is 5 tiles to the left" (`-5`) into "step left" (`-1`).

In `chooseStep`, a skeleton that's within 6 tiles of Grunk steps toward him. Otherwise it wanders. Every other kind of monster (the `default`) still wanders randomly.

Now use it in `main.ts`, instead of `randomStep`:

```ts op=replace file=main.ts
import { Monster, randomStep, createMonster, monsterKindForTile } from "./monsters";
=====
import { Monster, chooseStep, createMonster, monsterKindForTile } from "./monsters";
```

```ts op=replace file=main.ts
    const step = randomStep();
=====
    const step = chooseStep(monster, hero.x, hero.y);
```

Press **▶ Play** and walk toward the skeleton in the big room at the bottom. It spots you and comes clattering over!

> **Fun fact:** Skeletons aren't very clever. If there's a wall between you and the skeleton, it walks straight into the wall and gets stuck. You can use that to escape!

## Grumpy mushrooms

Mushrooms don't move at all. But if Grunk stands right next to one, it bops him. Add a case for them in `chooseStep`:

```ts op=replace file=monsters.ts
      return randomStep();
    default:
=====
      return randomStep();
    case "mushroom":
      if (distance === 1) {
        return stepToward(monster, heroX, heroY);
      }
      return { dx: 0, dy: 0 };
    default:
```

A step of `{ dx: 0, dy: 0 }` means "stay put". When Grunk is right next to the mushroom (a distance of 1), it "steps" toward him, and in `moveMonsters`, stepping onto Grunk means attacking him.

Press **▶ Play** and go poke the mushroom in the bottom-left corner. It has 5 hp and hits twice as hard as a slime, so be careful!

## Ghosts float through walls

Ghosts drift toward Grunk from anywhere in the dungeon, but they're easily distracted, so they only move half the time. Add their case to `chooseStep`:

```ts op=replace file=monsters.ts
      return { dx: 0, dy: 0 };
    default:
=====
      return { dx: 0, dy: 0 };
    case "ghost":
      if (Math.random() < 0.5) {
        return { dx: 0, dy: 0 };
      }
      return stepToward(monster, heroX, heroY);
    default:
```

`Math.random() < 0.5` is true half of the time. It's like flipping a coin!

Now the spooky part: walking through walls. In `moveMonsters`, ghosts only need to check that no other monster is in the way:

```ts op=replace file=main.ts
    if (newX === hero.x && newY === hero.y) {
      hurtHero(monster);
    } else if (!isBlocked(newX, newY)) {
=====
    if (newX === hero.x && newY === hero.y) {
      hurtHero(monster);
    } else if (monster.kind === "ghost" && !monsterAt(newX, newY)) {
      monster.x = newX;
      monster.y = newY;
    } else if (!isBlocked(newX, newY)) {
```

Press **▶ Play**. The ghost slowly floats toward you, right through the walls. Spooky! 👻

But there's a problem. If the ghost attacks from *inside* a wall, Grunk can't hit back! The key handler stops as soon as Grunk walks into a wall, before it ever checks for monsters. That's not fair. Let's only stop if the wall is **empty**:

```ts op=replace file=main.ts
  if (isWall(newX, newY)) {
    return;
  }
=====
  if (isWall(newX, newY) && !monsterAt(newX, newY)) {
    return;
  }
```

Now if there's a ghost in the wall, the code carries on to the monster check, and Grunk bonks it. Take that, spooky!

## Bats flap twice

Bats are fast: they get **two** moves every turn. To do that, we'll split `moveMonsters` into two functions. `moveMonster` (no s!) moves *one* monster *once*. Then `moveMonsters` can call it twice for bats.

Replace the whole `moveMonsters` function:

```ts op=replace file=main.ts
function moveMonsters() {
  for (const monster of monsters) {
    const step = chooseStep(monster, hero.x, hero.y);
    const newX = monster.x + step.dx;
    const newY = monster.y + step.dy;
    if (newX === hero.x && newY === hero.y) {
      hurtHero(monster);
    } else if (monster.kind === "ghost" && !monsterAt(newX, newY)) {
      monster.x = newX;
      monster.y = newY;
    } else if (!isBlocked(newX, newY)) {
      monster.x = newX;
      monster.y = newY;
    }
  }
}
=====
function moveMonster(monster: Monster) {
  const step = chooseStep(monster, hero.x, hero.y);
  const newX = monster.x + step.dx;
  const newY = monster.y + step.dy;
  if (newX === hero.x && newY === hero.y) {
    hurtHero(monster);
  } else if (monster.kind === "ghost" && !monsterAt(newX, newY)) {
    monster.x = newX;
    monster.y = newY;
  } else if (!isBlocked(newX, newY)) {
    monster.x = newX;
    monster.y = newY;
  }
}

function moveMonsters() {
  for (const monster of monsters) {
    moveMonster(monster);
    if (monster.kind === "bat") {
      moveMonster(monster);
    }
  }
}
```

> **Tip:** Most of the lines are the same as before, just moved two spaces to the left. Select them and press [[Shift]] + [[Tab]] to un-indent them all at once.

Press **▶ Play** and watch the bat zip around.

## Health bars

Fights are more exciting when you can see how hurt a monster is. Let's draw a little health bar over any monster that has taken damage. In `drawGame`, add this inside the monster loop:

```ts op=after file=main.ts anchor="drawTile(sprites[monster.kind], monster.x, monster.y);"
    if (monster.hp < monster.maxHp) {
      const barWidth = 40 * (monster.hp / monster.maxHp);
      ctx.fillStyle = "#3a0d16";
      ctx.fillRect(toPixels(monster.x) + 4, toPixels(monster.y) - 2, 40, 6);
      ctx.fillStyle = "#ff4f6d";
      ctx.fillRect(toPixels(monster.x) + 4, toPixels(monster.y) - 2, barWidth, 6);
    }
```

We draw a dark red bar 40 pixels wide, then a bright red bar on top of it. The bright bar's width depends on how much health is left: `monster.hp / monster.maxHp` is a fraction, like `3 / 6` = `0.5`. Half health means half a bar.

Press **▶ Play** and bonk the mushroom once. It gets a health bar!

> **Challenge:** Invent your own monster behavior! Here are some ideas to try in `chooseStep`:
>
> - A **coward** that runs *away* from Grunk. (Hint: `stepToward` gives you the step toward him. What if you flipped the signs?)
> - A skeleton that can see further (change the `6`).
> - A monster that moves only when Grunk is far away.

### Chapter complete! 🎉

Your dungeon is full of personalities! You learned:

- **Union types** like `"slime" | "bat"` list exactly which values are allowed.
- `object[variable]` looks up a property using a variable.
- `switch` / `case` / `default` for choosing between many options.
- **Factory functions** build objects for you.
- `Math.abs` and `Math.sign` for distances and directions.

Next chapter: treasure! 💰
