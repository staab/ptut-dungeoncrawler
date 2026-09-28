---
title: A Hero With Stats
subtitle: Objects, types and a status bar
time: about 1 hour
---

Grunk's information is scattered around: his name in one variable, his position in two more. Soon he'll have health, attack power, gold, a backpack full of loot… that's a lot of loose variables to keep track of!

In this chapter you'll gather everything about Grunk into one tidy **object**, describe it with a **type**, and build a status bar with health hearts at the bottom of the screen.

## Describe a hero

In the last chapter you met objects: boxes holding named properties, like `sprites.wall`. Now let's make one for Grunk.

First, we'll write a **type** that describes what every hero looks like: which properties it has, and what type each property is. Then we'll make the actual hero object. Add this under `let heroY`:

```ts op=after file=main.ts anchor="let heroY: number = 3;"

type Hero = {
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

const hero: Hero = {
  name: heroName,
  x: 2,
  y: 3,
  hp: 10,
  maxHp: 10,
};
```

- `type Hero = { ... }` is like a form with blank spaces to fill in. It says: "a Hero has a `name` that's a string, an `x` that's a number…" It doesn't make a hero yet.
- `const hero: Hero = { ... }` makes an actual hero and fills in the form. TypeScript checks that every property is there, with the right type.
- `hp` stands for **hit points**, the classic game name for health. `maxHp` is the most health Grunk can have.

> **Try it:** Delete the `hp: 10,` line for a moment. TypeScript complains that `hp` is missing, because the `Hero` type says every hero must have one. Put it back!

> **Heads up:** Wait, `hero` is a `const`, but Grunk's position is going to change. Is that allowed? Yes! `const` means `hero` will always be *this same object*. The properties **inside** the object can still change. It's like a backpack: you always carry the same backpack, but what's inside changes.

## Switch to the hero object

Now let's use `hero.x` and `hero.y` everywhere instead of `heroX` and `heroY`, and then delete the old variables. There are quite a few places to change, so take it slowly.

> **Tip:** Press [[Ctrl]] + [[F]] (or [[⌘]] + [[F]] on a Mac) and search for `heroX` to find each place.

Delete the old variables:

```ts op=replace file=main.ts
let heroX: number = 2;
let heroY: number = 3;
=====
```

Fix the loop that finds the `@`:

```ts op=replace file=main.ts
      heroX = x;
      heroY = y;
=====
      hero.x = x;
      hero.y = y;
```

Fix the drawing in `drawGame`:

```ts op=replace file=main.ts
  drawTile(sprites.hero, heroX, heroY);
=====
  drawTile(sprites.hero, hero.x, hero.y);
```

Fix the key handler. There are three places here:

```ts op=replace file=main.ts
  let newX = heroX;
  let newY = heroY;
=====
  let newX = hero.x;
  let newY = hero.y;
```

```ts op=replace file=main.ts
  if (event.key === "ArrowRight" || event.key === "d") {
    newX = heroX + 1;
  } else if (event.key === "ArrowLeft" || event.key === "a") {
    newX = heroX - 1;
  } else if (event.key === "ArrowUp" || event.key === "w") {
    newY = heroY - 1;
  } else if (event.key === "ArrowDown" || event.key === "s") {
    newY = heroY + 1;
  }
=====
  if (event.key === "ArrowRight" || event.key === "d") {
    newX = hero.x + 1;
  } else if (event.key === "ArrowLeft" || event.key === "a") {
    newX = hero.x - 1;
  } else if (event.key === "ArrowUp" || event.key === "w") {
    newY = hero.y - 1;
  } else if (event.key === "ArrowDown" || event.key === "s") {
    newY = hero.y + 1;
  }
```

```ts op=replace file=main.ts
    heroX = newX;
    heroY = newY;
=====
    hero.x = newX;
    hero.y = newY;
```

When you've got them all, there won't be any red lines left. Press **▶ Play**: Grunk works exactly as before.

> **Why:** This is another refactor. It didn't change what the game does, but now everything about Grunk lives in one place. When we add attack power, gold and a backpack, they'll go in the `Hero` type too.

## Heart pictures

Let's show Grunk's health on screen with little hearts. There are two heart pictures in the assets: `heart.png` and `heart_empty.png`. Click them in the file list to have a look.

Add them to the sprites object in `sprites.ts`:

```ts op=after file=sprites.ts anchor="floor: loadImage"
  heart: loadImage("heart"),
  emptyHeart: loadImage("heart_empty"),
```

Don't forget the comma at the end of each line!

## A status bar

The map is 10 tiles tall, which is 480 pixels, but the canvas is 576 pixels tall. That leaves a strip 96 pixels tall at the bottom: the perfect spot for a status bar. Games call this the **HUD**, short for *heads-up display*.

Write a function to draw it, above `drawGame`:

```ts op=before file=main.ts anchor="function drawGame()"
function drawHud() {
  ctx.fillStyle = "#1a1325";
  ctx.fillRect(0, 480, 768, 96);

  ctx.fillStyle = "white";
  ctx.font = "bold 18px monospace";
  ctx.fillText(hero.name, 16, 508);
}

```

Then, at the end of `drawGame`, swap the old title for a call to `drawHud`. The name is in the HUD now, so we don't need the title any more:

```ts op=replace file=main.ts
  ctx.fillStyle = "white";
  ctx.font = "32px monospace";
  ctx.fillText(heroName + "'s Dungeon", 20, 50);
}
=====
  drawHud();
}
```

Press **▶ Play**. There's a dark bar at the bottom with Grunk's name in it.

> **Tip:** A function can call another function. `gameLoop` calls `drawGame`, which calls `drawHud`, which calls `ctx.fillText`. Building big things out of small functions is how all programs are made.

## Draw the hearts

Now for the hearts. We want one heart for each point of `maxHp`: full hearts for the health Grunk has, and empty hearts for the rest. Sounds like a job for a loop with an `if` inside! Add this at the end of `drawHud`, after the `fillText` line:

```ts op=after file=main.ts anchor="ctx.fillText(hero.name, 16, 508);"

  for (let i = 0; i < hero.maxHp; i++) {
    if (i < hero.hp) {
      ctx.drawImage(sprites.heart, 110 + i * 26, 488, 26, 26);
    } else {
      ctx.drawImage(sprites.emptyHeart, 110 + i * 26, 488, 26, 26);
    }
  }
```

Programmers often call a simple loop counter `i`. The math `110 + i * 26` spaces the hearts out: heart 0 is at x = 110, heart 1 is at 136, heart 2 is at 162, and so on. Each heart is 26 pixels wide, so they sit side by side.

Press **▶ Play**. Ten full hearts!

> **Try it:** Change Grunk's `hp` to `3` in the hero object and press Play. Three full hearts and seven empty ones. Put it back to `10` when you're done.

## Numbers too

Let's also show Grunk's health as numbers, like `10/10`. We could glue it together with `+`, like `hero.hp + "/" + hero.maxHp`, but there's a neater way: a **template string**.

Add two lines at the end of `drawHud`, after the loop. (The highlighted lines are the new ones.)

```ts op=replace file=main.ts
  for (let i = 0; i < hero.maxHp; i++) {
    if (i < hero.hp) {
      ctx.drawImage(sprites.heart, 110 + i * 26, 488, 26, 26);
    } else {
      ctx.drawImage(sprites.emptyHeart, 110 + i * 26, 488, 26, 26);
    }
  }
=====
  for (let i = 0; i < hero.maxHp; i++) {
    if (i < hero.hp) {
      ctx.drawImage(sprites.heart, 110 + i * 26, 488, 26, 26);
    } else {
      ctx.drawImage(sprites.emptyHeart, 110 + i * 26, 488, 26, 26);
    }
  }

  ctx.font = "16px monospace";
  ctx.fillText(`${hero.hp}/${hero.maxHp}`, 380, 508);
```

Template strings use **backticks** `` ` `` instead of quotes. On most keyboards the backtick key is in the top-left corner, under [[Esc]]. Inside a template string, anything in `${ }` is worked out and dropped into the text. So `` `${hero.hp}/${hero.maxHp}` `` becomes `"10/10"`.

Press **▶ Play**.

### Chapter complete! 🎉

Grunk is getting organized. You learned:

- **Types** describe the shape of an object, and TypeScript checks every object against its type.
- A `const` object's properties can still change.
- **Refactoring** means reorganizing code without changing what it does.
- Functions can call other functions.
- **Template strings** use backticks and `${ }` to mix values into text.

Next chapter: it's getting a bit lonely in here. Let's add some monsters.
