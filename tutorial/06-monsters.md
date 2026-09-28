---
title: Monsters Appear!
subtitle: Lists of objects, randomness and taking turns
time: about 1½ hours
---

A dungeon without monsters is just a basement. Time to fill it with slimes!

Here's the plan for this chapter:

- describe a monster with a `Monster` type,
- keep **a list of monsters**, filled in from the map,
- let the monsters **wander around** at random,
- make the game **turn-based**: Grunk moves, then every monster moves.

## A monster type

Monsters need their own information: what kind of monster they are, where they are, and how much health they have. That calls for a type! Monsters are going to get a lot of code over the next few chapters, so they get their own file.

Click **+ New file**, call it `monsters.ts`, and type:

```ts op=create file=monsters.ts
// Everything about monsters lives in this file.

export type Monster = {
  kind: string;
  x: number;
  y: number;
  hp: number;
};
```

`kind` will be a word like `"slime"`, so we know which kind of monster it is. For now all our monsters are slimes, but not for long…

## A list of monsters

A dungeon has lots of monsters, so we'll keep them in an **array**: a list of `Monster` objects. Import the type at the top of `main.ts`:

```ts op=after file=main.ts anchor="import { sprites }"
import { Monster } from "./monsters";
```

Then make an empty list, right under the hero object:

```ts op=replace file=main.ts
  maxHp: 10,
};
=====
  maxHp: 10,
};

let monsters: Monster[] = [];
```

`Monster[]` means "a list of Monsters", just like `string[]` meant "a list of strings". And `[]` is an empty list, with nothing in it yet.

## Slimes on the map

Let's mark where slimes live on the map, using the letter `s`. Change your level in `levels.ts` to add some slimes. Don't forget to add the `s` to the key at the top, too:

```ts op=replace file=levels.ts
//   @  is where Grunk starts
export const level1: string[] = [
  "################",
  "#@.....#.......#",
  "#......#.......#",
  "#......#...#...#",
  "#..........#...#",
  "#......#...#...#",
  "###.####...#####",
  "#..............#",
  "#..............#",
  "################",
];
=====
//   @  is where Grunk starts
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
```

> **Heads up:** When you swap a `.` for an `s`, make sure each row stays exactly 16 characters long.

Now, in `main.ts`, the loop that searches the map for `@` can look for slimes at the same time. When it finds an `s`, it adds a new slime to the list:

```ts op=replace file=main.ts
    if (level1[y][x] === "@") {
      hero.x = x;
      hero.y = y;
    }
=====
    if (level1[y][x] === "@") {
      hero.x = x;
      hero.y = y;
    } else if (level1[y][x] === "s") {
      monsters.push({ kind: "slime", x: x, y: y, hp: 3 });
    }
```

`monsters.push(...)` adds something to the end of a list. What we're adding is a brand new object, written straight into the parentheses: a slime at this `x` and `y`, with 3 hit points.

Press **▶ Play**. The slimes aren't on screen yet, because we're not drawing them. That's next!

## Draw every monster

We want to draw every monster in the list, however many there are. There's a special kind of `for` loop just for going through a list. Replace the line that draws our old slime friend:

```ts op=replace file=main.ts
  drawTile(sprites.hero, hero.x, hero.y);
  drawTile(sprites.slime, 6, 3);
=====
  for (const monster of monsters) {
    drawTile(sprites.slime, monster.x, monster.y);
  }

  drawTile(sprites.hero, hero.x, hero.y);
```

`for (const monster of monsters)` means "for each monster in the monsters list…". The code inside runs once for every monster, and each time, `monster` is the next one in the list. No counting needed!

Press **▶ Play**. Slimes! Four of them, just where you put them on the map. But Grunk can walk right through them…

## Monsters get in the way

We need a way to ask "is there a monster at this tile?". Add this function in `main.ts`, right after `isWall`:

```ts op=before file=main.ts anchor="function drawHud()"
function monsterAt(x: number, y: number): Monster | undefined {
  for (const monster of monsters) {
    if (monster.x === x && monster.y === y) {
      return monster;
    }
  }
  return undefined;
}

```

It goes through the list looking for a monster at that spot. There are some new ideas here:

- As soon as a function reaches `return`, it **stops** and hands back the answer. So once we find a monster, we return it straight away, without checking the rest.
- If the loop finishes without finding anyone, we `return undefined`. `undefined` is JavaScript's word for "nothing at all".
- The return type `Monster | undefined` means "either a Monster, **or** undefined". The `|` bar means "or" when it's used in a type.

Now make Grunk stop when a monster is in the way:

```ts op=replace file=main.ts
  if (!isWall(newX, newY)) {
=====
  if (!isWall(newX, newY) && !monsterAt(newX, newY)) {
```

How does `!monsterAt(newX, newY)` work? In an `if`, `undefined` counts as `false`, and an actual monster counts as `true`. So `!monsterAt(...)` is true when there's **no** monster there.

Press **▶ Play**. The slimes are solid now.

## Random steps

Real monsters don't just sit there. Let's make the slimes wander around at random. First, we need a way to describe "which way to move". We'll call it a `Step`: how far to move in x (`dx`) and how far to move in y (`dy`). Add this to the bottom of `monsters.ts`:

```ts op=append file=monsters.ts

// A step is a direction to move in.
// dx is how much x changes, and dy is how much y changes.
export type Step = {
  dx: number;
  dy: number;
};

export function randomStep(): Step {
  const roll = Math.floor(Math.random() * 4);
  if (roll === 0) {
    return { dx: 1, dy: 0 };
  } else if (roll === 1) {
    return { dx: -1, dy: 0 };
  } else if (roll === 2) {
    return { dx: 0, dy: 1 };
  } else {
    return { dx: 0, dy: -1 };
  }
}
```

`Math.random()` gives a random number from 0 up to (but not including) 1, like `0.2831`. Times 4, that's somewhere from 0 to 3.999. `Math.floor` rounds it down, leaving a whole number: 0, 1, 2 or 3. It's like rolling a four-sided dice! Each number means one of the four directions.

## Monsters take a turn

Now let's use that in `main.ts`. First, update the import so we can use `randomStep`:

```ts op=replace file=main.ts
import { Monster } from "./monsters";
=====
import { Monster, randomStep } from "./monsters";
```

Monsters shouldn't walk into walls, into each other, or onto Grunk. Let's write one function that checks all three. Then we'll write another function that moves every monster. Put them both after `monsterAt`:

```ts op=before file=main.ts anchor="function drawHud()"
function isBlocked(x: number, y: number): boolean {
  if (isWall(x, y)) {
    return true;
  }
  if (monsterAt(x, y)) {
    return true;
  }
  if (hero.x === x && hero.y === y) {
    return true;
  }
  return false;
}

function moveMonsters() {
  for (const monster of monsters) {
    const step = randomStep();
    const newX = monster.x + step.dx;
    const newY = monster.y + step.dy;
    if (!isBlocked(newX, newY)) {
      monster.x = newX;
      monster.y = newY;
    }
  }
}

```

`moveMonsters` uses the same "look before you leap" idea as Grunk: work out where each monster wants to go, check it, and only then move.

Finally, call `moveMonsters()` at the end of the key handler, so the monsters move whenever Grunk does:

```ts op=replace file=main.ts
  if (!isWall(newX, newY) && !monsterAt(newX, newY)) {
    hero.x = newX;
    hero.y = newY;
  }
=====
  if (!isWall(newX, newY) && !monsterAt(newX, newY)) {
    hero.x = newX;
    hero.y = newY;
  }

  moveMonsters();
```

Press **▶ Play** and walk around. The slimes wobble about every time you move!

## Taking turns properly

Play for a bit and you'll notice something odd. The slimes move when you press **any** key, even [[Shift]]! They also move when you walk into a wall. That's not very fair.

In a turn-based game, pressing a key that isn't a move shouldn't use up a turn, and neither should bumping into a wall. Let's fix it using **early returns**:

```ts op=replace file=main.ts
  if (!isWall(newX, newY) && !monsterAt(newX, newY)) {
    hero.x = newX;
    hero.y = newY;
  }

  moveMonsters();
=====
  // Not a movement key? Then do nothing.
  if (newX === hero.x && newY === hero.y) {
    return;
  }

  // Walking into a wall doesn't use up a turn.
  if (isWall(newX, newY)) {
    return;
  }

  if (!monsterAt(newX, newY)) {
    hero.x = newX;
    hero.y = newY;
  }

  moveMonsters();
```

A `return` inside the key handler means "stop right here, we're done with this key press". So:

1. If the key wasn't an arrow or WASD, `newX` and `newY` never changed, so they still equal Grunk's position. We stop without doing anything.
2. If there's a wall in the way, we stop too.
3. Otherwise Grunk moves (unless a monster is in the way), and then all the monsters get their turn.

Press **▶ Play**. Now the dungeon only moves when Grunk does, like a board game.

> **Try it:** Add more `s` tiles to the map. How about a room absolutely packed with slimes?

### Chapter complete! 🎉

The dungeon is alive! You learned:

- **Arrays of objects**: `Monster[]` is a list of monsters.
- `push` adds things to a list.
- `for (const thing of list)` goes through every item in a list.
- `return` stops a function straight away. **Early returns** make code easier to follow.
- `undefined` means "nothing", and `Monster | undefined` means "a Monster, or nothing".
- `Math.random()` and `Math.floor()` for dice rolls.

The slimes are cute, but they're harmless. Next chapter: **combat!** ⚔️
