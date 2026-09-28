---
title: Build the Dungeon
subtitle: Arrays, loops and a second file
time: about 1½ hours
---

Grunk is wandering around an empty purple void. Let's build him a proper dungeon, with stone floors and walls he can't walk through.

To do it, you'll learn three of the most useful ideas in all of programming:

- **arrays**, which are lists of things,
- **loops**, which do something many times without you writing it many times,
- **modules**, which let you split your code into several files.

## A map made of text

How do you describe a whole dungeon to a computer? One neat trick is to draw it with **text**, one character per tile. `#` can be a wall, `.` can be floor, and so on.

Our map is going to be quite big, so let's give it its own file. Click **+ New file** above the file list, type `levels.ts` and press [[Enter]]. Then type the map into your new file:

```ts op=create file=levels.ts
// The dungeon map. Each string is one row of tiles.
//   #  is a wall
//   .  is floor
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
```

Can you see the rooms and corridors? Each string is one row of the dungeon, and every row is exactly 16 characters wide, because the screen is 16 tiles wide.

The square brackets `[ ]` make an **array**: a list of values, separated by commas. This array holds 10 strings, one per row. Its type is `string[]`, which you can read as "a list of strings".

`export` at the start means "other files are allowed to use this". Without it, `level1` would be private to `levels.ts`.

> **Tip:** Programmers often put a comma after the last item in a list too, like after the last row here. It's allowed, and it makes adding another row later a bit easier.

## Look inside the map

Now let's use the map in `main.ts`. To use something from another file, we **import** it. Imports go near the top of the file, and then we'll print a few things to see what's inside the array:

```ts op=after file=main.ts anchor="Write your code below this line"
import { level1 } from "./levels";

console.log(level1);
console.log(level1.length);
console.log(level1[1]);
console.log(level1[1][1]);
```

`"./levels"` means "the file called `levels` in this same folder". You don't need to write `.ts` on the end.

Press **▶ Play** and look at the console:

1. `level1` prints the whole list.
2. `level1.length` is how many items are in the list: `10`.
3. `level1[1]` gets one item from the list by its position. But look, it prints the **second** row! That's because computers count from **zero**. The first row is `level1[0]`, the second is `level1[1]`, and the last is `level1[9]`.
4. `level1[1][1]` gets row 1, and then character 1 of that row. It's the `@`! Strings can be picked apart letter by letter, just like arrays.

So `level1[y][x]` is the tile at column `x`, row `y`. Hold on to that idea, because we're going to use it a lot.

## A home for pictures

Soon we'll need pictures for walls and floors, and later for lots of monsters and treasure. Writing two lines for each picture would get boring fast. Let's make a new file that does it neatly.

Click **+ New file**, name it `sprites.ts`, and type:

```ts op=create file=sprites.ts
// All the pictures in the game. (Game pictures are often called "sprites".)

function loadImage(name: string): HTMLImageElement {
  const image = new Image();
  image.src = "assets/" + name + ".png";
  return image;
}

export const sprites = {
  hero: loadImage("barbarian"),
  slime: loadImage("slime"),
  wall: loadImage("wall"),
  floor: loadImage("floor"),
};
```

There are two ideas in here:

- `loadImage` is a function that does the "new image, set the src" job for us and **returns** the finished image. `"assets/" + name + ".png"` builds the file path, so `loadImage("wall")` loads `assets/wall.png`.
- `sprites` is an **object**. An object is a box that holds other named boxes. Each line inside the `{ }` is a **property**: a name, a colon, and a value. To get a value out, you use a dot: `sprites.wall` is the wall picture.

## Use the sprites

Now let's switch `main.ts` over to the new sprites. First import them, under the other import:

```ts op=after file=main.ts anchor="import { level1 }"
import { sprites } from "./sprites";
```

Then delete the old picture lines, because `sprites.ts` does that job now:

```ts op=replace file=main.ts

const heroImage = new Image();
heroImage.src = "assets/barbarian.png";
const slimeImage = new Image();
slimeImage.src = "assets/slime.png";
=====
```

The code still uses `heroImage` and `slimeImage` in `drawGame`, so TypeScript will underline them in red now. Fix them to use the sprites:

```ts op=replace file=main.ts
  drawTile(heroImage, heroX, heroY);
  drawTile(slimeImage, 6, 3);
=====
  drawTile(sprites.hero, heroX, heroY);
  drawTile(sprites.slime, 6, 3);
```

Press **▶ Play**. It should look exactly the same as before.

> **Why:** Changing how code is organized without changing what it does is called **refactoring**. It's like tidying your room: nothing new appears, but it's much easier to find things afterwards.

## Loops: do it again

Let's draw a wall along the top of the screen. That's 16 wall tiles. We *could* write `drawTile` sixteen times… but programmers are lazy in a clever way. We'll use a **loop**. Add this inside `drawGame`, right after the background is filled:

```ts op=after file=main.ts anchor="ctx.fillRect(0, 0, 768, 576);"

  for (let x = 0; x < 16; x++) {
    drawTile(sprites.wall, x, 0);
  }
```

Press **▶ Play**. A whole row of wall!

A `for` loop has three parts in its parentheses, separated by semicolons:

1. `let x = 0` runs **once at the start**. It makes a counter called `x`.
2. `x < 16` is checked **before every round**. The loop keeps going while it's true.
3. `x++` runs **after every round**. It's short for `x = x + 1`.

So the code inside runs with `x` = 0, then 1, then 2… all the way to 15. When `x` becomes 16, `x < 16` is false, and the loop stops.

> **Try it:** Change the `0` in `drawTile(sprites.wall, x, 0)` to `11` to move the wall to the bottom row. Change `x < 16` to `x < 5` for a shorter wall. Then put it back.

## Loops inside loops

Now let's draw the **whole map**. We need to visit every row, and in each row visit every column. That's a loop *inside* a loop!

Replace your wall loop with this:

```ts op=replace file=main.ts
  for (let x = 0; x < 16; x++) {
    drawTile(sprites.wall, x, 0);
  }
=====
  for (let y = 0; y < level1.length; y++) {
    for (let x = 0; x < level1[y].length; x++) {
      if (level1[y][x] === "#") {
        drawTile(sprites.wall, x, y);
      } else {
        drawTile(sprites.floor, x, y);
      }
    }
  }
```

The outer loop goes through the rows: `y` goes from 0 up to (but not including) `level1.length`, which is 10. For **each** row, the inner loop goes through every column `x` in that row. For each tile it checks the map: a `#` draws a wall, and anything **else** draws floor.

`else` is the partner of `if`. It means "if none of the conditions above were true, do this instead".

Press **▶ Play**. A real dungeon! 🏰

> **Fun fact:** The inner code runs 10 × 16 = 160 times per frame, and the game loop runs 60 frames per second. That's almost 10,000 tiles drawn every second, and the computer doesn't even break a sweat.

## Solid walls

Grunk can walk straight through walls like a ghost. Let's fix that with a function that answers a yes/no question: "is there a wall at this tile?". Add it above `drawGame`:

```ts op=before file=main.ts anchor="function drawGame()"
function isWall(x: number, y: number): boolean {
  return level1[y][x] === "#";
}

```

It returns a `boolean`, either `true` or `false`. `level1[y][x] === "#"` is already true or false, so we can return it directly.

Now use it in the key handler. Because the map has walls all the way around the outside, we don't need the "stay on the screen" check any more. Walls do that job now!

```ts op=replace file=main.ts
  if (newX >= 0 && newX < 16 && newY >= 0 && newY < 12) {
=====
  if (!isWall(newX, newY)) {
```

The `!` means **not**. It flips `true` into `false` and `false` into `true`. So this reads "if it is **not** a wall at the new spot, move there".

Press **▶ Play** and bump into some walls. Solid!

## Where does Grunk start?

Our map has an `@` to mark where Grunk starts, but we're still starting him at `2, 3`. Let's make the code find the `@` by searching the whole map. It's the same loop-inside-a-loop trick! Put it under `let heroY`:

```ts op=after file=main.ts anchor="let heroY: number = 3;"

for (let y = 0; y < level1.length; y++) {
  for (let x = 0; x < level1[y].length; x++) {
    if (level1[y][x] === "@") {
      heroX = x;
      heroY = y;
    }
  }
}
```

This looks at every tile, and when it finds the `@` it moves Grunk there.

While you're near the top of the file, delete the practice `console.log` lines. We know what the map looks like now!

```ts op=replace file=main.ts
console.log(level1);
console.log(level1.length);
console.log(level1[1]);
console.log(level1[1][1]);
=====
```

Press **▶ Play**. Grunk starts in the top-left room, right where the `@` is.

> **Try it:** Move the `@` somewhere else in `levels.ts` (swap it with a `.` so each row stays 16 characters long). Press Play: Grunk starts there instead.

## Be the dungeon master

You now have a map editor made of text! Go to `levels.ts` and redesign the dungeon however you like. Some rules to keep things working:

- Every row must be exactly **16 characters** long.
- Keep a wall of `#` all the way around the outside, so Grunk can't walk off the edge of the map.
- Keep exactly one `@`.

Make a maze, a spiral, a giant room, your initials in walls… Press **▶ Play** to explore it.

> **Heads up:** When you start the next chapter, the map goes back to the original one, because every chapter starts from the same fresh copy of the code. You'll get lots more chances to design levels later on!

### Chapter complete! 🎉

What a chapter! You learned:

- **Arrays** are lists, written with `[ ]`. You get items out by position with `list[0]`, `list[1]`… and computers count from **zero**.
- `.length` tells you how many items are in a list (or how many letters are in a string).
- **Objects** hold named properties: `sprites.wall`.
- **`for` loops** repeat code, and loops can go inside loops.
- `else` and `!` (not).
- **Modules**: `export` shares something from a file, and `import` uses it in another file.

Next up: giving Grunk health, and a proper home for all his information.
