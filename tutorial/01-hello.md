---
title: Hello, Dungeon!
subtitle: Your very first lines of code
time: about 1 hour
---

Welcome, brave adventurer! Over the next few hours you're going to build a real video game from nothing: a **dungeon crawler** starring a barbarian named Grunk, who bonks slimes, dodges ghosts, collects treasure and eventually faces the dreaded **Slime King**.

You don't need to know anything about programming. We'll learn every idea as we need it, one small step at a time.

### How this works

- **This side** (the left) tells you what to do and explains why.
- **The other side** (the right) is your code. It's a real code editor: click in it and type.
- The **file list** shows every file in your project. The files in `src` hold your code. The files in `assets` are pictures and sounds we've made for you. Click one to see or hear it.
- The **▶ Play** button runs your game. The game shows up below your code, next to the **Console**, where your program can print messages.

Each step shows you some code to type. **Type it yourself** instead of copying and pasting. Your fingers learn things your eyes don't! When your code matches, the **Next →** button lights up.

> **Tip:** If you get stuck, press **Hint**. It'll tell you which line looks different from what it expected. And if things get really tangled, **Reset chapter** (in the chapter menu) puts the code back the way it was at the start of the chapter.

Press **Next →** to write your first line of code.

## Say hello

A program is a list of instructions for the computer. The computer reads them from top to bottom and does exactly what they say. (It's very obedient, but not very clever. It only does *exactly* what you type!)

Let's make the computer say hello. Click in the code editor, at the end of the last line, and press [[Enter]] to make a new line.

```ts op=after file=main.ts anchor="Write your code below this line"
console.log("Hello, dungeon!");
```

Now press **▶ Play** and look at the **Console**. You should see `Hello, dungeon!`.

Let's pull that line apart:

- `console.log(...)` means "print this in the console". `console` is the console and `log` is the action it does.
- The **parentheses** `( )` hold the thing we want to print.
- The **quotes** `" "` mark the start and end of some text. Programmers call text a **string** (as in "a string of letters").
- The **semicolon** `;` at the end is like a full stop. It means "this instruction is finished".

> **Heads up:** Computers are fussy about spelling. `Console.log` (capital C) or `console.lg` won't work. If something goes wrong, you'll see a red message in the console. Compare your line to the one above, letter by letter.

## Say some more

Programs run from top to bottom, one line after another. Add a second line **underneath** the first one. Put your own words inside the quotes if you like. Anything is fine as long as the quotes are there.

```ts op=after file=main.ts anchor="Hello, dungeon!" loose=strings
console.log("My name is Grunk the Barbarian.");
```

Press **▶ Play**. Both messages appear, in the same order as your code.

> **Try it:** Swap the two lines around and press Play again. The messages swap too! Then put them back so "Hello" comes first.

## Numbers do math

Strings are one kind of **value**. Another kind is the **number**. Numbers don't need quotes, and the computer can do math with them.

```ts op=after file=main.ts anchor="My name is"
console.log(2 + 3);
console.log(7 * 6);
```

Press **▶ Play**. The console shows `5` and `42`. In code, `*` means "times" (multiply) and `/` means "divide".

> **Try it:** What do you think `console.log("2" + "3");` prints? Those are *strings* this time, because they're in quotes. Add it and press Play to find out, then delete it again. (Answer: `23`. Adding two strings glues them together!)

## Remember things with variables

Imagine you had to type your hero's name everywhere in your game. If you ever wanted to rename them, you'd have to find every single copy! Instead, programmers save things in **variables**.

A variable is like a labelled box. You put a value in the box, and later you use the label to get the value out again.

```ts op=after file=main.ts anchor="console.log(7 * 6);" loose=strings
const heroName = "Grunk";
console.log("Our hero is " + heroName);
```

Press **▶ Play**. You should see `Our hero is Grunk`.

- `const` means "make a new box that will never change". It's short for *constant*.
- `heroName` is the label on the box. Variable names can't have spaces, so programmers write each new word with a capital letter, `likeThis`.
- `=` means "put this value into the box". (It doesn't mean "equals" like in math class!)
- In the second line, `heroName` has **no quotes**. That tells the computer "use what's in the box". With quotes, `"heroName"` would just be the word heroName.
- `+` between strings glues them together, like you saw in the last step.

## Variables that change

Some things in a game change all the time: health, gold, position. For those we use `let` instead of `const`. A `let` box can have its value swapped out later.

```ts op=after file=main.ts anchor="Our hero is"
let gold = 0;
console.log("Gold: " + gold);
gold = gold + 10;
console.log("Found treasure! Gold: " + gold);
```

Press **▶ Play**. The console says `Gold: 0` and then `Found treasure! Gold: 10`.

Look at `gold = gold + 10;`. That line would make no sense in math class! In code, the computer works out the right side **first** (what's in `gold`, plus 10, which is 10), and **then** puts the answer back into the `gold` box.

> **Try it:** Change `const heroName` to `let heroName`, then add `heroName = "Bob";` under it. Everything still works. Now change it back to `const`: you'll get a red error saying you can't change a constant. That's the computer protecting you!

## Types keep you safe

The language you're writing is called **TypeScript**. The "Type" part is its superpower. Every value has a **type**: `"Grunk"` is a `string`, `10` is a `number`.

You can write down what type a variable should hold. Change these two lines by adding `: string` and `: number` after the names:

```ts op=replace file=main.ts loose=strings
const heroName = "Grunk";
=====
const heroName: string = "Grunk";
```

```ts op=replace file=main.ts
let gold = 0;
=====
let gold: number = 0;
```

Why bother? Because now TypeScript checks your work while you type.

> **Try it:** Add the line `gold = "lots";` somewhere below `let gold`. The line turns red, and pressing Play shows an error: *Type 'string' is not assignable to type 'number'*. TypeScript caught a mistake before the game even ran! **Delete that line** before you continue.

## Find the canvas

That's enough console messages. Time to draw! Your game gets a **canvas**, a rectangle of pixels you can paint on. It's already waiting on the game page. We just need to grab it.

Add these lines at the very bottom of your file. Start with an empty line: it doesn't do anything, but it keeps the code easier to read, like a paragraph break.

```ts op=append file=main.ts

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
```

These lines have some new things in them. You don't need to remember them exactly, because you'll only write them once:

- `document` is the web page the game lives in. `document.getElementById("game")` finds the thing on the page named `"game"`, which is our canvas.
- `as HTMLCanvasElement` tells TypeScript "trust me, this is a canvas". (`getElementById` can find all sorts of things, so TypeScript doesn't know which one we mean.)
- `canvas.getContext("2d")` gives us a **drawing context**. Think of it as our set of paintbrushes. Programmers usually call it `ctx` for short.
- The `!` at the end says "this will definitely work, don't worry". TypeScript is a worrier.

Press **▶ Play**. Nothing looks different yet, but there shouldn't be any errors either.

## Paint the background

Now let's paint. Drawing on a canvas takes two steps: pick a color, then fill a shape.

```ts op=append file=main.ts

ctx.fillStyle = "#2b2140";
ctx.fillRect(0, 0, 768, 576);
```

Press **▶ Play**. The whole game area turns a deep dungeon purple!

- `ctx.fillStyle` is the paint color. `"#2b2140"` is a color code: it mixes red (`2b`), green (`21`) and blue (`40`). You can also use color names like `"purple"` or `"darkgreen"`.
- `ctx.fillRect(x, y, width, height)` fills a rectangle. Each number is measured in **pixels**, the tiny dots that make up the screen.

The canvas is 768 pixels wide and 576 pixels tall. Positions are measured from the **top-left corner**:

```text
(0,0) ───────── x gets bigger ─────────▶ (768,0)
  │
  │
  y gets bigger
  │
  ▼
(0,576)
```

So `fillRect(0, 0, 768, 576)` means "start at the top-left corner and fill the entire canvas".

> **Heads up:** On a canvas, **y goes down**. That's the opposite of the graphs you draw in math class, and it trips everyone up at first.

## Draw a hero-shaped box

Before we have a proper hero picture, let's draw a stand-in: an orange square.

```ts op=append file=main.ts loose=numbers

ctx.fillStyle = "orange";
ctx.fillRect(96, 144, 48, 48);
```

Press **▶ Play**. There's our "hero"! It's a square 48 pixels wide and 48 tall, with its top-left corner 96 pixels from the left and 144 pixels from the top.

> **Try it:** Change the numbers and press Play to see what happens. Can you move the square to the bottom-right corner? Can you make it really wide?

## Write a title

Canvases can draw text too. Let's give the game a title using the hero's name variable.

```ts op=append file=main.ts

ctx.fillStyle = "white";
ctx.font = "32px monospace";
ctx.fillText(heroName + "'s Dungeon", 20, 50);
```

Press **▶ Play**. The title uses whatever is stored in `heroName`. Try changing the name at the top of the file: the title changes too. That's why variables are handy!

`ctx.fillText(text, x, y)` draws the text with its bottom-left corner at `x`, `y`. `ctx.font` picks the size and style of the letters.

## Tidy up

Our console practice lines have done their job. Real programs stay tidy, so let's delete the ones we don't need any more.

```ts op=replace file=main.ts
console.log("My name is Grunk the Barbarian.");
console.log(2 + 3);
console.log(7 * 6);
=====
```

```ts op=replace file=main.ts
console.log("Our hero is " + heroName);
let gold: number = 0;
console.log("Gold: " + gold);
gold = gold + 10;
console.log("Found treasure! Gold: " + gold);
=====
```

Press **▶ Play** one more time to make sure everything still works.

### Chapter complete! 🎉

Look at everything you learned in chapter one:

- A program is a list of **instructions**, run from top to bottom.
- `console.log` prints messages.
- **Strings** hold text, **numbers** hold numbers, and you can do math with them.
- **Variables** (`const` and `let`) store values under a name.
- **Types** like `string` and `number` let TypeScript catch your mistakes.
- The **canvas** is where you draw, measured in pixels from the top-left corner.

Next chapter, we'll replace that orange square with a real barbarian.
