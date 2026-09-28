---
title: Meet the Barbarian
subtitle: Tiles, pictures and your first functions
time: about 1 hour
---

An orange square is a fine hero, but Grunk deserves better. In this chapter you'll:

- think about the game as a **grid of tiles**,
- load and draw **pictures**,
- write your first **functions**: little named recipes you can use again and again.

## Think in tiles

Most dungeon games are built on a grid, like a chessboard. Each square is called a **tile**. The hero stands on one tile, a monster stands on another, a wall fills a third.

Our tiles will be 48 pixels on each side. The canvas is 768 pixels wide, and 768 ÷ 48 = 16, so it's **16 tiles wide**. It's 576 pixels tall, and 576 ÷ 48 = 12, so it's **12 tiles tall**.

From now on we'll store the hero's position in tiles, not pixels. "Two tiles across and three tiles down" is much easier to think about than "96 pixels across and 144 down"!

```ts op=after file=main.ts anchor="const heroName"
const TILE_SIZE: number = 48;
let heroX: number = 2;
let heroY: number = 3;
```

`TILE_SIZE` is written in CAPITAL LETTERS. That's a habit programmers have for settings that never change. It's still just a normal `const`.

`heroX` and `heroY` use `let`, because the hero is going to move around.

Now draw the orange square using those variables:

```ts op=replace file=main.ts
ctx.fillRect(96, 144, 48, 48);
=====
ctx.fillRect(heroX * TILE_SIZE, heroY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
```

Press **▶ Play**. The square is in exactly the same place as before! That's because `heroX * TILE_SIZE` is 2 × 48, which is 96. And `heroY * TILE_SIZE` is 3 × 48, which is 144.

> **Try it:** Change `heroX` to `10` and press Play. The square jumps to tile 10. Then set it back to `2`.

## Your first function

Soon Grunk will walk around, and every time he moves we'll need to draw the whole screen again. We don't want to copy the drawing code everywhere. Instead, we'll wrap it in a **function**.

A function is a named bundle of instructions. Writing a function is like writing down a recipe. It doesn't cook anything yet, but you can follow the recipe whenever you like, as many times as you like.

Wrap all the drawing code in a function called `drawGame`, and then **call** it (use it) on the last line:

```ts op=replace file=main.ts
ctx.fillStyle = "#2b2140";
ctx.fillRect(0, 0, 768, 576);

ctx.fillStyle = "orange";
ctx.fillRect(heroX * TILE_SIZE, heroY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

ctx.fillStyle = "white";
ctx.font = "32px monospace";
ctx.fillText(heroName + "'s Dungeon", 20, 50);
=====
function drawGame() {
  ctx.fillStyle = "#2b2140";
  ctx.fillRect(0, 0, 768, 576);

  ctx.fillStyle = "orange";
  ctx.fillRect(heroX * TILE_SIZE, heroY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = "white";
  ctx.font = "32px monospace";
  ctx.fillText(heroName + "'s Dungeon", 20, 50);
}

drawGame();
```

> **Tip:** You don't need to retype the lines in the middle. Select them all with your mouse and press [[Tab]]: they all move two spaces to the right. ([[Shift]] + [[Tab]] moves them back.) Then type the first line and the `}` above and below.

Let's look at the pieces:

- `function drawGame() {` starts the recipe and gives it a name. The `()` are for the recipe's **inputs**. This one doesn't have any yet.
- Everything between the curly brackets `{` and `}` is the recipe's instructions. We indent them (push them to the right) so it's easy to see what's inside.
- `drawGame();` on the last line **calls** the function. That's when the recipe actually runs.

Press **▶ Play**. Everything looks the same, which is exactly right. We've only reorganized the code.

> **Try it:** Delete the `drawGame();` line and press Play. The screen stays blank! Writing a recipe doesn't cook anything. Now put the line back.

## Load a picture

Time to meet Grunk properly. Click **barbarian.png** in the file list to see him. We made all the pictures and sounds for this game ahead of time; they live in the `assets` folder.

To use a picture in code, we create an **Image** and tell it where to find the picture file:

```ts op=after file=main.ts anchor="const ctx = canvas"

const heroImage = new Image();
heroImage.src = "assets/barbarian.png";
```

- `new Image()` makes a brand new, empty image object.
- `heroImage.src` is the image's **source**, where the picture comes from. The dot means "the `src` that belongs to `heroImage`". Once we set it, the browser starts loading the picture.

## Draw the picture

Now swap the orange square for the picture. `ctx.drawImage` works a lot like `fillRect`, but the first thing in the parentheses is the picture to draw:

```ts op=replace file=main.ts
  ctx.fillStyle = "orange";
  ctx.fillRect(heroX * TILE_SIZE, heroY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
=====
  ctx.drawImage(heroImage, heroX * TILE_SIZE, heroY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
```

Press **▶ Play** and look carefully…

…is Grunk there? Probably not! (If he is, your computer was just quick this time. It won't always be!) Can you guess why? Keep reading to find out.

## Wait for the picture to load

Here's what went wrong. Loading a picture takes a moment, like a web page loading. But the computer doesn't wait. It sets `heroImage.src`, then rushes on and runs `drawGame()` straight away, before the picture has arrived. So it draws… nothing.

We need to say: "**when the picture has finished loading**, then draw the game." Images have an `onload` property for exactly this.

```ts op=replace file=main.ts
drawGame();
=====
heroImage.onload = drawGame;
```

Notice there are **no parentheses** after `drawGame` here! That's important:

- `drawGame()` *with* parentheses means "run the recipe **right now**".
- `drawGame` *without* parentheses means "here's the recipe itself". We're handing the recipe to the image so it can run it **later**, once it has loaded.

Press **▶ Play**. There's Grunk! …though he looks a bit blurry. Let's fix that next.

## Crisp pixels

The picture is only 16 × 16 pixels, and we're stretching it to 48 × 48. The browser tries to be helpful by smoothing the stretched picture, which makes pixel art go fuzzy. Let's switch that off:

```ts op=after file=main.ts anchor="const ctx = canvas"
ctx.imageSmoothingEnabled = false;
```

`false` is a new kind of value called a **boolean**. A boolean can only ever be `true` or `false`, like a light switch. Here we're switching smoothing off.

Press **▶ Play**. Nice and sharp!

## Functions with inputs

Later we'll draw lots of things on tiles: walls, floors, monsters, treasure. Each time we'd have to write `something * TILE_SIZE` twice. Let's write a function that does the tile math for us.

This function takes **inputs**, called **parameters**. You put them inside the parentheses, and each one has a name and a type. Add this new function right above `function drawGame`:

```ts op=before file=main.ts anchor="function drawGame()"
function drawTile(image: HTMLImageElement, x: number, y: number) {
  ctx.drawImage(image, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

```

When we call `drawTile(heroImage, 2, 3)`, the function runs with `image` set to `heroImage`, `x` set to `2` and `y` set to `3`. `HTMLImageElement` is TypeScript's name for "a picture".

Now use it inside `drawGame`:

```ts op=replace file=main.ts
  ctx.drawImage(heroImage, heroX * TILE_SIZE, heroY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
=====
  drawTile(heroImage, heroX, heroY);
```

So much shorter! Press **▶ Play** to check that Grunk is still there.

## Functions that answer back

Some functions don't *do* something; they *work something out* and hand back the answer. They use the word `return` to hand it back.

Let's write one that turns tiles into pixels. Put it above `drawTile`:

```ts op=before file=main.ts anchor="function drawTile("
function toPixels(tiles: number): number {
  return tiles * TILE_SIZE;
}

```

The `: number` after the parentheses says "this function hands back a number". Wherever you write `toPixels(3)`, it gets replaced by the answer, `144`. It's a bit like a calculator button.

Now use it in `drawTile`:

```ts op=replace file=main.ts
  ctx.drawImage(image, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
=====
  ctx.drawImage(image, toPixels(x), toPixels(y), TILE_SIZE, TILE_SIZE);
```

Press **▶ Play**. Same picture, but the code reads more like English: "draw the image at the pixels for x and the pixels for y".

## A friend appears

Now that we have `drawTile`, drawing another picture is easy. Let's invite a slime to hang out. First load its picture, under the hero's picture:

```ts op=after file=main.ts anchor="heroImage.src"
const slimeImage = new Image();
slimeImage.src = "assets/slime.png";
```

Then draw it in `drawGame`, right after the hero:

```ts op=after file=main.ts anchor="drawTile(heroImage, heroX, heroY);" loose=numbers
  drawTile(slimeImage, 6, 3);
```

And remember the loading problem? The slime picture needs to trigger a redraw when it finishes loading, too. Otherwise, if it arrives after Grunk's picture, it won't show up:

```ts op=after file=main.ts anchor="heroImage.onload"
slimeImage.onload = drawGame;
```

Press **▶ Play**. Grunk has a friend!

> **Try it:** Draw more slimes by adding more `drawTile(slimeImage, ...)` lines with different numbers. Can you make a row of five slimes? Can you draw a slime on top of Grunk? (Things drawn later are drawn on top.) Delete your extra slimes when you're done.

### Chapter complete! 🎉

You learned some big ideas in this chapter:

- Games are built on a **grid of tiles**.
- **Functions** are named recipes. You **define** them once and **call** them whenever you like.
- Functions can take **parameters** (inputs) and **return** answers.
- Pictures take time to load, so we use `onload` to draw once they're ready.
- **Booleans** are `true` or `false`.

Next up: making Grunk move!
