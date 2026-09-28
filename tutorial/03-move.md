---
title: Move It!
subtitle: Keyboard input, decisions and the game loop
time: about 1 hour
---

A hero who can't move isn't much of a hero. In this chapter Grunk learns to walk. Along the way you'll learn how programs:

- **react** to things that happen, like key presses,
- make **decisions** with `if` and `else if`,
- **loop** forever, redrawing the screen many times a second, like a real game.

## Listen to the keyboard

Programs can wait for something to happen and then react to it. These happenings are called **events**. Clicking the mouse is an event. Pressing a key is an event too.

Add this at the very bottom of your file:

```ts op=append file=main.ts

document.addEventListener("keydown", (event) => {
  console.log("You pressed: " + event.key);
});
```

Press **▶ Play**, then **click on the game** (so it knows your keyboard is talking to it) and press some keys. Try the arrow keys, letters, [[Space]], [[Shift]]… Every key press shows up in the console.

This is a dense little bit of code, so let's unpack it:

- `document.addEventListener("keydown", ...)` means "whenever a key is pressed down, run this function".
- `(event) => { ... }` **is** that function. It's written right where it's needed, and it has no name. This short way of writing a function is called an **arrow function**, because of the `=>` arrow.
- `event` is its parameter. The browser fills it with details about what happened. `event.key` is the name of the key, like `"a"` or `"ArrowUp"`.
- Notice the `)` near the end, just before the `;`. It closes the `(` that opened right after `addEventListener`. Brackets always come in pairs!

## Make a decision with if

We only want Grunk to move right when the right arrow is pressed. For that, we need an `if`:

```ts op=replace file=main.ts
  console.log("You pressed: " + event.key);
=====
  if (event.key === "ArrowRight") {
    heroX = heroX + 1;
  }
```

An `if` checks whether something is true. If it is, the code inside its `{ }` runs. If not, that code is skipped.

- `===` means "is exactly equal to". It's three equals signs! Remember that a single `=` means "put this in the box", so we need something different for "are these the same?".
- `event.key === "ArrowRight"` is a **condition**. It's either `true` or `false`, a boolean!

Press **▶ Play**, click the game and press the right arrow key…

…nothing happens?! Keep reading.

> **Fun fact:** Grunk *is* moving, sort of. `heroX` really does go up by one each time. Add `console.log(heroX);` inside the `if` to prove it, and delete it again afterwards. The problem is that nobody is drawing the screen again.

## Draw again

We only draw the game once, when the pictures load. When `heroX` changes, we need to draw everything again so the picture catches up.

```ts op=replace file=main.ts
  if (event.key === "ArrowRight") {
    heroX = heroX + 1;
  }
=====
  if (event.key === "ArrowRight") {
    heroX = heroX + 1;
  }
  drawGame();
```

Press **▶ Play**, click the game and press the right arrow. Grunk walks! (Keep pressing and he'll walk right off the edge of the screen. We'll fix that soon.)

## Else if: all four directions

Now for the other three directions. We could write four separate `if`s, but there's a neater way: `else if`. It means "otherwise, if…". The computer checks each condition in order and runs the **first** one that's true, then skips the rest.

```ts op=replace file=main.ts
  if (event.key === "ArrowRight") {
    heroX = heroX + 1;
  }
=====
  if (event.key === "ArrowRight") {
    heroX = heroX + 1;
  } else if (event.key === "ArrowLeft") {
    heroX = heroX - 1;
  } else if (event.key === "ArrowUp") {
    heroY = heroY - 1;
  } else if (event.key === "ArrowDown") {
    heroY = heroY + 1;
  }
```

Look at up and down. Moving **up** makes `heroY` *smaller*, and moving **down** makes it *bigger*. That's because y counts downward from the top of the canvas. Remember the diagram from chapter 1?

Press **▶ Play** and walk Grunk around with all four arrows.

## Or: WASD keys too

Lots of players like to use [[W]] [[A]] [[S]] [[D]] instead of the arrow keys. We can allow both with `||`, which means **or**:

```ts op=replace file=main.ts
  if (event.key === "ArrowRight") {
    heroX = heroX + 1;
  } else if (event.key === "ArrowLeft") {
    heroX = heroX - 1;
  } else if (event.key === "ArrowUp") {
    heroY = heroY - 1;
  } else if (event.key === "ArrowDown") {
    heroY = heroY + 1;
  }
=====
  if (event.key === "ArrowRight" || event.key === "d") {
    heroX = heroX + 1;
  } else if (event.key === "ArrowLeft" || event.key === "a") {
    heroX = heroX - 1;
  } else if (event.key === "ArrowUp" || event.key === "w") {
    heroY = heroY - 1;
  } else if (event.key === "ArrowDown" || event.key === "s") {
    heroY = heroY + 1;
  }
```

`A || B` is true if A is true, **or** B is true (or both). So the first line reads: "if the key is the right arrow **or** the key is d".

Press **▶ Play** and try both sets of keys.

> **Heads up:** `event.key` is `"D"` (capital) if Caps Lock is on, so the letter keys won't work with Caps Lock. The arrow keys always work.

## Look before you leap

Grunk can still walk right off the screen. To stop that, we'll change *how* he moves:

1. First, work out where Grunk **wants** to go.
2. Then check whether that spot is OK.
3. Only then actually move him.

Step 1 first. Make two new variables that start at Grunk's current position. They go at the very top of the key handler, right after the `document.addEventListener(` line. Then change the `if`s so they update those new variables instead of moving Grunk directly:

```ts op=after file=main.ts anchor="document.addEventListener("
  let newX = heroX;
  let newY = heroY;

```

```ts op=replace file=main.ts
  if (event.key === "ArrowRight" || event.key === "d") {
    heroX = heroX + 1;
  } else if (event.key === "ArrowLeft" || event.key === "a") {
    heroX = heroX - 1;
  } else if (event.key === "ArrowUp" || event.key === "w") {
    heroY = heroY - 1;
  } else if (event.key === "ArrowDown" || event.key === "s") {
    heroY = heroY + 1;
  }
=====
  if (event.key === "ArrowRight" || event.key === "d") {
    newX = heroX + 1;
  } else if (event.key === "ArrowLeft" || event.key === "a") {
    newX = heroX - 1;
  } else if (event.key === "ArrowUp" || event.key === "w") {
    newY = heroY - 1;
  } else if (event.key === "ArrowDown" || event.key === "s") {
    newY = heroY + 1;
  }
```

Press **▶ Play**. Grunk is frozen! That's expected: we've worked out where he *wants* to go, but we never actually move him there. That's the next step.

> **New word:** Variables made with `let` or `const` inside a function only exist inside that function. `newX` and `newY` are created fresh every time a key is pressed, and thrown away when the function ends.

## Stay on the screen

Now step 2 and 3: check the new spot is on the screen, and if it is, move there. This goes inside the key handler, just above the `drawGame();` line:

```ts op=before file=main.ts anchor="drawGame();"

  if (newX >= 0 && newX < 16 && newY >= 0 && newY < 12) {
    heroX = newX;
    heroY = newY;
  }
```

- `>=` means "greater than or equal to", and `<` means "less than".
- `&&` means **and**. `A && B` is only true if A is true **and** B is true.

So in plain English: "if newX is at least 0, **and** newX is less than 16, **and** newY is at least 0, **and** newY is less than 12, then move". The screen is 16 tiles wide, numbered 0 to 15, and 12 tall, numbered 0 to 11.

Press **▶ Play**. Try to escape off each edge. You can't!

> **Try it:** What happens if you change `newX < 16` to `newX < 8`? Grunk gets trapped on the left half of the screen. Put it back to `16` when you're done.

## The game loop

Right now we only draw when a picture loads or a key is pressed. Real games do something different: they draw the whole screen **over and over**, about 60 times every second, no matter what. That's called a **game loop**, and it lets things animate even when nobody is pressing keys.

Replace the two `onload` lines with a game loop:

```ts op=replace file=main.ts
heroImage.onload = drawGame;
slimeImage.onload = drawGame;
=====
function gameLoop() {
  drawGame();
  requestAnimationFrame(gameLoop);
}

gameLoop();
```

And since the loop draws all the time, the key handler doesn't need to any more:

```ts op=replace file=main.ts

  if (newX >= 0 && newX < 16 && newY >= 0 && newY < 12) {
    heroX = newX;
    heroY = newY;
  }
  drawGame();
=====

  if (newX >= 0 && newX < 16 && newY >= 0 && newY < 12) {
    heroX = newX;
    heroY = newY;
  }
```

`requestAnimationFrame(gameLoop)` asks the browser: "next time you're about to update the screen, please run `gameLoop`". And what does `gameLoop` do? It draws, and then asks again! So it keeps going forever, once per screen update.

We don't need `onload` any more either. If a picture hasn't loaded yet, `drawImage` quietly draws nothing, and a moment later the loop draws again. By then the picture is ready.

Press **▶ Play**. Everything works just like before, but now we have a real game loop ticking away.

> **Challenge:** Can you add a **teleport** key? When you press [[Space]] (its `event.key` is `" "`, a space inside quotes), Grunk should jump to a random tile. You'll need two new tools:
>
> - `Math.random()` gives a random number between 0 and 1, like `0.7291`.
> - `Math.floor(x)` rounds a number down, so `Math.floor(7.8)` is `7`.
>
> So `Math.floor(Math.random() * 16)` gives a random whole number from 0 to 15. Try it! (Your teleport won't be in the next chapter's fresh copy of the code, but it's great practice.)

### Chapter complete! 🎉

Grunk walks! You learned:

- **Events** let your code react to things like key presses.
- **Arrow functions** `(event) => { ... }` are functions written right where they're needed.
- `if` and `else if` make **decisions**.
- `===` compares, `||` means **or**, `&&` means **and**, and `<` (less than) and `>=` (greater than or equal) compare numbers. There are also `>` (greater than) and `<=` (less than or equal).
- A **game loop** redraws the screen about 60 times a second.

Next chapter: building an actual dungeon, with walls Grunk can't walk through.
