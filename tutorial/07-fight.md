---
title: Fight!
subtitle: Attacks, health, messages and game over
time: about 1½ hours
---

The slimes have been bumping into Grunk for a whole chapter. It's time for Grunk to bump back. ⚔️

In this chapter you'll add:

- **attacks**: walk into a monster to bonk it,
- **defeating** monsters, and taking them out of the list,
- monsters that **fight back**,
- **messages** on screen, with silly random attack words,
- **game over**, and a key to try again,
- **floating damage numbers**, because they're fun.

## Attack power

Both Grunk and the monsters need an `attack` number: how much damage they do with each hit. First add it to the `Hero` type and to the hero object in `main.ts`:

```ts op=replace file=main.ts
  maxHp: number;
};
=====
  maxHp: number;
  attack: number;
};
```

```ts op=replace file=main.ts
  maxHp: 10,
};
=====
  maxHp: 10,
  attack: 2,
};
```

Then add it to the `Monster` type in `monsters.ts`:

```ts op=after file=monsters.ts anchor="hp: number;"
  attack: number;
```

Now TypeScript complains about the line that makes slimes, because they don't have an `attack` yet. It's making sure we never forget one! Give slimes an attack of 1 in `main.ts`:

```ts op=replace file=main.ts
      monsters.push({ kind: "slime", x: x, y: y, hp: 3 });
=====
      monsters.push({ kind: "slime", x: x, y: y, hp: 3, attack: 1 });
```

## Bonk!

When Grunk walks into a monster, he should attack it. Add a function for attacking, after `monsterAt`:

```ts op=before file=main.ts anchor="function isBlocked("
function attackMonster(monster: Monster) {
  monster.hp = monster.hp - hero.attack;
  console.log(`${hero.name} hits the ${monster.kind}! It has ${monster.hp} hp left.`);
}

```

Now use it in the key handler. Right now, Grunk just stops when a monster is in the way. Change it so he attacks instead:

```ts op=replace file=main.ts
  if (!monsterAt(newX, newY)) {
    hero.x = newX;
    hero.y = newY;
  }
=====
  const monster = monsterAt(newX, newY);
  if (monster) {
    attackMonster(monster);
  } else {
    hero.x = newX;
    hero.y = newY;
  }
```

We ask `monsterAt` for the monster in the way and save the answer in `monster`. Remember, the answer is either a `Monster` or `undefined`. `if (monster)` is true if we got a real monster, so we attack it. Otherwise (`else`), the way is clear and Grunk walks.

> **Fun fact:** TypeScript is clever about this. Inside the `if (monster)` block, it *knows* `monster` can't be `undefined` any more, so it lets you pass it to `attackMonster`, which needs a real `Monster`.

Press **▶ Play**, walk into a slime a few times and watch the console. Its hp goes down: 1, then -1… but it never goes away! Let's fix that.

## Defeated monsters vanish

When a monster's hp drops to 0 or below, it's defeated, and it should be removed from the list. Add this to the end of `attackMonster`:

```ts op=after file=main.ts anchor="It has ${monster.hp} hp left."
  if (monster.hp <= 0) {
    monsters = monsters.filter((m) => m.hp > 0);
  }
```

`filter` is a handy tool that every list has. It makes a **new list** containing only the items that pass a test. The test is a little arrow function: `(m) => m.hp > 0` means "given a monster `m`, keep it if its hp is more than 0". Notice this arrow function has no `{ }` and no `return`. When an arrow function is that short, it automatically hands back whatever comes after the `=>`. Then we put the new list into `monsters`, replacing the old one.

This is why we made `monsters` with `let` back in the last chapter: we're swapping in a whole new list.

Press **▶ Play** and defeat a slime. Two bonks and it's gone! 💥

## Messages on screen

Console messages are fine for programmers, but players can't see the console. Let's show messages in the HUD instead. Make a variable to hold the latest message, under the monsters list:

```ts op=after file=main.ts anchor="let monsters: Monster[] = [];"
let message: string = "Welcome to the dungeon!";
```

Draw it at the bottom of `drawHud`, in a warm yellow color:

```ts op=after file=main.ts anchor="ctx.fillText(`${hero.hp}/${hero.maxHp}`"

  ctx.fillStyle = "#ffd580";
  ctx.fillText(message, 16, 564);
```

Now change `attackMonster` to put its news in `message` instead of the console. Let's also announce when a monster is defeated:

```ts op=replace file=main.ts
  console.log(`${hero.name} hits the ${monster.kind}! It has ${monster.hp} hp left.`);
  if (monster.hp <= 0) {
    monsters = monsters.filter((m) => m.hp > 0);
  }
=====
  message = `${hero.name} hits the ${monster.kind}!`;
  if (monster.hp <= 0) {
    monsters = monsters.filter((m) => m.hp > 0);
    message = `${hero.name} defeats the ${monster.kind}!`;
  }
```

Press **▶ Play** and go bonk something.

## Silly attack words

"Grunk hits the slime" is a bit boring. Barbarians have lots of ways to hit things! Let's keep a list of attack words and pick one at random each time. Add this before `attackMonster`:

```ts op=before file=main.ts anchor="function attackMonster("
const hitWords: string[] = ["bonk", "whack", "thwack", "bop", "wallop", "clobber", "smack"];

function randomHitWord(): string {
  const index = Math.floor(Math.random() * hitWords.length);
  return hitWords[index];
}

```

`Math.random() * hitWords.length` is a random number from 0 up to 7 (not including 7). Rounded down, that's a random position in the list, from 0 to 6. And `hitWords[index]` is the word at that position.

Use it in the message:

```ts op=replace file=main.ts loose=strings
  message = `${hero.name} hits the ${monster.kind}!`;
=====
  message = `${hero.name} ${randomHitWord()}s the ${monster.kind}!`;
```

The `s` after `${randomHitWord()}` turns "bonk" into "bonks". Press **▶ Play**: "Grunk wallops the slime!" 😄

> **Try it:** Add your own words to the list. "boop"? "splat"? "kerpow"?

## Monsters fight back

Let's make monsters dangerous. When a monster tries to step onto Grunk's tile, it attacks him instead. First, a function for Grunk getting hurt. Put it after `attackMonster`:

```ts op=before file=main.ts anchor="function isBlocked("
function hurtHero(monster: Monster) {
  hero.hp = hero.hp - monster.attack;
  message = `The ${monster.kind} hits ${hero.name}! Ouch!`;
}

```

Then, in `moveMonsters`, check whether the monster's step lands on Grunk:

```ts op=replace file=main.ts
    if (!isBlocked(newX, newY)) {
      monster.x = newX;
      monster.y = newY;
    }
=====
    if (newX === hero.x && newY === hero.y) {
      hurtHero(monster);
    } else if (!isBlocked(newX, newY)) {
      monster.x = newX;
      monster.y = newY;
    }
```

Press **▶ Play** and walk back and forth next to a slime for a while. (Monsters only move when Grunk does, so standing still won't help!) Slimes wander randomly, so they don't hit very often. Watch your hearts!

## Game over

What happens when Grunk runs out of hearts? Right now… nothing. His hp just goes negative. Let's add a **game over**.

We need to remember whether the game is over, which is a perfect job for a boolean. Add it under `message`:

```ts op=after file=main.ts anchor="let message: string"
let gameOver: boolean = false;
```

When Grunk's hp reaches 0, the game is over. Add this to the end of `hurtHero`:

```ts op=after file=main.ts anchor="Ouch!`;"
  if (hero.hp <= 0) {
    hero.hp = 0;
    gameOver = true;
    message = `${hero.name} has been defeated...`;
  }
```

When the game is over, Grunk shouldn't be able to move. Add this at the very **start** of the key handler, before `let newX`:

```ts op=after file=main.ts anchor="document.addEventListener("
  if (gameOver) {
    return;
  }

```

Finally, let's make it look like a game over. There's a tombstone picture in the assets, so add it to `sprites.ts`:

```ts op=after file=sprites.ts anchor="emptyHeart: loadImage"
  tombstone: loadImage("tombstone"),
```

Then in `drawGame`, draw a tombstone instead of Grunk when the game is over, and a big message on top of everything:

```ts op=replace file=main.ts
  drawTile(sprites.hero, hero.x, hero.y);

  drawHud();
=====
  if (gameOver) {
    drawTile(sprites.tombstone, hero.x, hero.y);
  } else {
    drawTile(sprites.hero, hero.x, hero.y);
  }

  drawHud();

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
```

A few new drawing tricks:

- `"rgba(0, 0, 0, 0.6)"` is black that's **60% see-through**. The last number is how solid the color is, from 0 (invisible) to 1 (solid). It darkens the dungeon so the text stands out.
- `ctx.textAlign = "center"` makes text centered on the x position we give, so `384` (half of 768) puts it in the middle of the screen. We set it back to `"left"` afterwards, so the rest of our text isn't affected.

> **Try it:** To test this without waiting ages, temporarily give slimes an `attack` of `5`. Two hits and it's game over! Then change it back to `1`.

## Try again

"Press R to try again"... but R doesn't do anything yet! To restart, we need to put everything back the way it was at the start. The code that sets up the level is that loop that searches the map, near the top of the file. Let's turn it into a function called `startGame` that resets everything and then sets up the map:

```ts op=replace file=main.ts
for (let y = 0; y < level1.length; y++) {
  for (let x = 0; x < level1[y].length; x++) {
    if (level1[y][x] === "@") {
      hero.x = x;
      hero.y = y;
    } else if (level1[y][x] === "s") {
      monsters.push({ kind: "slime", x: x, y: y, hp: 3, attack: 1 });
    }
  }
}
=====
function startGame() {
  hero.hp = hero.maxHp;
  monsters = [];
  gameOver = false;
  message = "Welcome to the dungeon!";

  for (let y = 0; y < level1.length; y++) {
    for (let x = 0; x < level1[y].length; x++) {
      if (level1[y][x] === "@") {
        hero.x = x;
        hero.y = y;
      } else if (level1[y][x] === "s") {
        monsters.push({ kind: "slime", x: x, y: y, hp: 3, attack: 1 });
      }
    }
  }
}
```

> **Tip:** Select the whole loop and press [[Tab]] to indent it in one go.

Now that the setup is inside a function, it only happens when we call it. Call it just before the game loop starts:

```ts op=replace file=main.ts
gameLoop();
=====
startGame();
gameLoop();
```

And when the game is over, pressing [[R]] should call it again:

```ts op=replace file=main.ts
  if (gameOver) {
    return;
  }
=====
  if (gameOver) {
    if (event.key === "r") {
      startGame();
    }
    return;
  }
```

That's an `if` inside an `if`! When the game is over, we check for R, and either way we `return`, so no other keys do anything.

Press **▶ Play**, get defeated (on purpose!), and press R. Good as new.

## Floating damage numbers

Let's finish with some juice: little numbers that float up and fade away whenever something takes damage. Games are full of small effects like this, and they make everything feel more exciting.

Each floating number needs some text, a position, a color, and an **age**: how many frames it has existed. Add this under `let gameOver`:

```ts op=after file=main.ts anchor="let gameOver: boolean = false;"

type FloatingText = {
  text: string;
  x: number;
  y: number;
  color: string;
  age: number;
};

let floatingTexts: FloatingText[] = [];
```

Now two functions: one to add a floating number at a tile, and one to draw them all. Put them before `drawHud`:

```ts op=before file=main.ts anchor="function drawHud()"
function addFloatingText(text: string, x: number, y: number, color: string) {
  floatingTexts.push({
    text: text,
    x: toPixels(x) + TILE_SIZE / 2,
    y: toPixels(y),
    color: color,
    age: 0,
  });
}

function drawFloatingTexts() {
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  for (const floater of floatingTexts) {
    floater.age = floater.age + 1;
    ctx.globalAlpha = 1 - floater.age / 45;
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y - floater.age);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  floatingTexts = floatingTexts.filter((floater) => floater.age < 45);
}

```

Every frame, each number gets one frame older. That makes it float up (`floater.y - floater.age`) and fade out. `ctx.globalAlpha` sets how see-through everything we draw is: `1` is solid and `0` is invisible. After 45 frames (about three quarters of a second) the number has completely faded, so `filter` throws it away.

Draw them after the hero, in `drawGame`:

```ts op=replace file=main.ts
    drawTile(sprites.hero, hero.x, hero.y);
  }
=====
    drawTile(sprites.hero, hero.x, hero.y);
  }

  drawFloatingTexts();
```

And create them whenever someone gets hit: white numbers for monsters, red for Grunk.

```ts op=after file=main.ts anchor="monster.hp = monster.hp - hero.attack;"
  addFloatingText(`-${hero.attack}`, monster.x, monster.y, "white");
```

```ts op=after file=main.ts anchor="hero.hp = hero.hp - monster.attack;"
  addFloatingText(`-${monster.attack}`, hero.x, hero.y, "#ff5c7a");
```

Press **▶ Play** and pick a fight. Pow! 💥

### Chapter complete! 🎉

It's a real game now: you can win fights, lose fights, and try again. You learned:

- `if (thing)` checks whether you actually got something, rather than `undefined`.
- `filter` makes a new list with only the items that pass a test.
- Picking a **random item** from a list.
- An `if` inside an `if`.
- Putting setup code into a function, so you can **restart** by calling it again.
- `rgba` colors, `textAlign` and `globalAlpha` for fancier drawing.

Next chapter: slimes are getting lonely. Let's invite some very different monsters.
