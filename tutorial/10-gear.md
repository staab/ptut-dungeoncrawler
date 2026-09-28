---
title: Use Your Stuff
subtitle: Potions, weapons, armor and power-ups
time: about 1½ hours
---

Grunk's backpack is full of goodies, but he can't use any of them yet. In this chapter the number keys come alive:

- press a number to **use** the item in that slot,
- **potions** heal,
- **weapons** make Grunk hit harder, and **armor** makes him tougher,
- a **spicy pepper** sends him into a rage that doubles his damage for a while. 🌶️

## Number keys

Let's start by making the number keys use items. Using an item works a bit like attacking: it takes up Grunk's turn, so the monsters get to move afterwards. But pressing the number of an **empty** slot shouldn't waste a turn.

So our `useItem` function will return a boolean: `true` if Grunk used his turn, and `false` if he didn't. Add it after `pickUpItem`:

```ts op=before file=main.ts anchor="const hitWords"
// Uses the item in a backpack slot. Returns true if that took up Grunk's turn.
function useItem(index: number): boolean {
  const item = hero.inventory[index];
  if (!item) {
    return false;
  }
  switch (item.kind) {
    case "potion":
      if (hero.hp === hero.maxHp) {
        message = `${hero.name} feels great already. Save it for later!`;
        return false;
      }
      hero.hp = Math.min(hero.hp + 5, hero.maxHp);
      hero.inventory.splice(index, 1);
      message = `${hero.name} drinks the potion. Refreshing!`;
      addFloatingText("+5", hero.x, hero.y, "#6cd06a");
      return true;
    default:
      message = `${hero.name} can't use the ${item.name} right now.`;
      return false;
  }
}

```

Here's what's new:

- If Grunk already has full health, drinking the potion would waste it, so we don't let him. He keeps it, and it doesn't use up his turn.

- `Math.min(a, b)` gives back whichever number is **smaller**. A potion heals 5, but Grunk can't go above `maxHp`. If he has 8 hp, `Math.min(13, 10)` is 10.
- `hero.inventory.splice(index, 1)` removes **1** item from the list, at position `index`. The potion is drunk, so it's gone from the backpack. The items after it all shuffle along to fill the gap.

Now hook it up to the number keys, in the key handler, just before `let newX`:

```ts op=before file=main.ts anchor="let newX = hero.x;"
  const slot = Number(event.key);
  if (slot >= 1 && slot <= 6) {
    if (useItem(slot - 1)) {
      moveMonsters();
    }
    return;
  }

```

`event.key` is always a string, even for number keys: pressing 3 gives `"3"`, not `3`. `Number(...)` turns a string into a number. What about a key that isn't a number, like `"ArrowUp"`? That becomes `NaN`, which means "Not a Number". It isn't bigger or smaller than anything, so `slot >= 1` is false and we carry on to the movement code.

The slots on screen are numbered 1 to 6, but the list positions go from 0 to 5, so we pass `slot - 1`.

Press **▶ Play**. Get hurt by something, pick up the potion, and press its number. Ahh, refreshing. 🧪

## Weapons

Grunk fights with his bare fists right now. Let's let him hold a weapon. A hero might have a weapon, or might not, so the type is `Item | undefined`:

```ts op=replace file=main.ts
  inventory: Item[];
};
=====
  inventory: Item[];
  weapon: Item | undefined;
};
```

```ts op=replace file=main.ts
  inventory: [],
};
=====
  inventory: [],
  weapon: undefined,
};
```

```ts op=after file=main.ts anchor="hero.inventory = [];"
  hero.weapon = undefined;
```

Using an axe or a hammer **equips** it: Grunk holds it, but it stays in his backpack. Add a new case to `useItem`, just before `default`:

```ts op=replace file=main.ts
      return true;
    default:
=====
      return true;
    case "axe":
    case "hammer":
      if (item === hero.weapon) {
        message = `${hero.name} is already holding the ${item.name}.`;
        return false;
      }
      // Drop the old weapon, to make room in the backpack.
      hero.inventory = hero.inventory.filter((other) => other !== hero.weapon);
      hero.weapon = item;
      message = `${hero.name} swings the ${item.name}. Nice!`;
      return true;
    default:
```

Two cases on top of each other, with nothing in between, mean "either of these". So `"axe"` and `"hammer"` both run the same code.

If Grunk is already holding that weapon, there's nothing to do, so it doesn't use up a turn. Otherwise he drops his old weapon (if he has one) using our old friend `filter`, so his backpack doesn't fill up with gear he doesn't need any more. Then he holds the new one.

Now we need a function that works out how hard Grunk hits: his own `attack`, plus the weapon's `attack` if he's holding one. Put it before `attackMonster`:

```ts op=before file=main.ts anchor="function attackMonster("
function heroAttack(): number {
  let attack = hero.attack;
  if (hero.weapon) {
    attack = attack + hero.weapon.attack;
  }
  return attack;
}

```

And use it in `attackMonster`:

```ts op=replace file=main.ts
  monster.hp = monster.hp - hero.attack;
  addFloatingText(`-${hero.attack}`, monster.x, monster.y, "white");
=====
  const damage = heroAttack();
  monster.hp = monster.hp - damage;
  addFloatingText(`-${damage}`, monster.x, monster.y, "white");
```

Press **▶ Play**. Grab the axe from the big room at the bottom, press its number, and go find a skeleton. Big numbers! 🪓

## Armor

Armor works the other way around: it **blocks** some of the damage when monsters hit Grunk. Add an `armor` property, just like `weapon`:

```ts op=replace file=main.ts
  weapon: Item | undefined;
};
=====
  weapon: Item | undefined;
  armor: Item | undefined;
};
```

```ts op=replace file=main.ts
  weapon: undefined,
};
=====
  weapon: undefined,
  armor: undefined,
};
```

```ts op=after file=main.ts anchor="hero.weapon = undefined;"
  hero.armor = undefined;
```

Wearing the helmet or the armor is another case in `useItem`. It works just like weapons:

```ts op=replace file=main.ts
      message = `${hero.name} swings the ${item.name}. Nice!`;
      return true;
=====
      message = `${hero.name} swings the ${item.name}. Nice!`;
      return true;
    case "helmet":
    case "armor":
      if (item === hero.armor) {
        message = `${hero.name} is already wearing the ${item.name}.`;
        return false;
      }
      // Take off the old armor, to make room in the backpack.
      hero.inventory = hero.inventory.filter((other) => other !== hero.armor);
      hero.armor = item;
      message = `${hero.name} puts on the ${item.name}. Very stylish.`;
      return true;
```

Then a function for Grunk's defense, next to `heroAttack`:

```ts op=before file=main.ts anchor="function attackMonster("
function heroDefense(): number {
  if (hero.armor) {
    return hero.armor.defense;
  }
  return 0;
}

```

Use it in `hurtHero`. The damage is the monster's attack **minus** Grunk's defense. But a hit should always sting at least a little, so the damage never goes below 1:

```ts op=replace file=main.ts
  hero.hp = hero.hp - monster.attack;
  addFloatingText(`-${monster.attack}`, hero.x, hero.y, "#ff5c7a");
=====
  const damage = Math.max(1, monster.attack - heroDefense());
  hero.hp = hero.hp - damage;
  addFloatingText(`-${damage}`, hero.x, hero.y, "#ff5c7a");
```

`Math.max(a, b)` is the opposite of `Math.min`: it gives back the **bigger** number. If the monster hits for 2 and Grunk's defense is 1, the damage is `Math.max(1, 1)`, which is 1. If his defense is 3, it's `Math.max(1, -1)`, which is still 1.

Press **▶ Play**, put on the pot helmet, and let a skeleton hit you. Only 1 damage instead of 2!

## Show the stats

Let's show Grunk's attack and defense in the HUD, next to the gold:

```ts op=replace file=main.ts
  ctx.fillText(`Gold: ${hero.gold}`, 16, 536);
=====
  ctx.fillText(`Attack: ${heroAttack()}   Defense: ${heroDefense()}   Gold: ${hero.gold}`, 16, 536);
```

Press **▶ Play** and equip things. Watch the numbers change!

## Show what's equipped

It'd be nice to see *which* items Grunk is using. Let's draw a golden frame around the equipped slots. In `drawHud`, add this to the slot loop, right after the item's picture is drawn:

```ts op=replace file=main.ts
    if (item) {
      ctx.drawImage(sprites[item.kind], slotX + 3, 497, 40, 40);
    }
=====
    if (item) {
      ctx.drawImage(sprites[item.kind], slotX + 3, 497, 40, 40);
      if (item === hero.weapon || item === hero.armor) {
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 3;
        ctx.strokeRect(slotX, 494, 46, 46);
      }
    }
```

`strokeRect` draws just the **outline** of a rectangle, instead of filling it in. `strokeStyle` is the outline's color, and `lineWidth` is how thick it is.

`item === hero.weapon` checks whether this is *the very same item* Grunk is holding.

Press **▶ Play** and equip the axe and helmet.

## Spicy pepper power-up

Time for the most important item in the game: the spicy pepper. 🌶️ Eating it sends Grunk into a **rage** that doubles his attack for 10 turns.

We need to count how many turns of rage are left. Add a `rage` property to Grunk:

```ts op=replace file=main.ts
  armor: Item | undefined;
};
=====
  armor: Item | undefined;
  rage: number;
};
```

```ts op=replace file=main.ts
  armor: undefined,
};
=====
  armor: undefined,
  rage: 0,
};
```

```ts op=after file=main.ts anchor="hero.armor = undefined;"
  hero.rage = 0;
```

Eating the pepper is another case in `useItem`. It gets used up, just like a potion. But gobbling a pepper is so quick that it doesn't use up a turn, so it returns `false`. That way Grunk gets all 10 turns of rage for bonking:

```ts op=replace file=main.ts
      message = `${hero.name} puts on the ${item.name}. Very stylish.`;
      return true;
=====
      message = `${hero.name} puts on the ${item.name}. Very stylish.`;
      return true;
    case "pepper":
      hero.rage = 10;
      hero.inventory.splice(index, 1);
      message = `SPICY! ${hero.name} is filled with rage!`;
      addFloatingText("RAAAGH!", hero.x, hero.y, "#ff5c3a");
      return false;
```

While Grunk is raging, his attack is doubled. Add this to `heroAttack`, just before it returns:

```ts op=replace file=main.ts
    attack = attack + hero.weapon.attack;
  }
  return attack;
=====
    attack = attack + hero.weapon.attack;
  }
  if (hero.rage > 0) {
    attack = attack * 2;
  }
  return attack;
```

## Counting down the rage

The rage should wear off after 10 turns. A turn ends after the monsters move, so that's a good moment to count down. Let's make a function called `endTurn` that does everything that happens at the end of a turn.

First, swap both calls to `moveMonsters()` in the key handler for `endTurn()`:

```ts op=replace file=main.ts
    if (useItem(slot - 1)) {
      moveMonsters();
    }
=====
    if (useItem(slot - 1)) {
      endTurn();
    }
```

```ts op=replace file=main.ts
    pickUpItem();
  }

  moveMonsters();
=====
    pickUpItem();
  }

  endTurn();
```

Then write `endTurn`, after `moveMonsters`:

```ts op=before file=main.ts anchor="function addFloatingText("
function endTurn() {
  moveMonsters();
  if (hero.rage > 0) {
    hero.rage = hero.rage - 1;
    if (hero.rage === 0) {
      message = `${hero.name} calms down.`;
    }
  }
}

```

## Show the rage

Players need to see when Grunk is raging, and for how long. Let's make him glow red, and show the turns left in the HUD.

In `drawGame`, draw a red glow under Grunk while he's raging:

```ts op=replace file=main.ts
  } else {
    drawTile(sprites.hero, hero.x, hero.y);
  }
=====
  } else {
    if (hero.rage > 0) {
      ctx.fillStyle = "rgba(255, 70, 40, 0.45)";
      ctx.fillRect(toPixels(hero.x), toPixels(hero.y), TILE_SIZE, TILE_SIZE);
    }
    drawTile(sprites.hero, hero.x, hero.y);
  }
```

And in `drawHud`, show the number of rage turns left, right after the stats line:

```ts op=after file=main.ts anchor="ctx.fillText(`Attack: ${heroAttack()}"
  if (hero.rage > 0) {
    ctx.fillStyle = "#ff5c3a";
    ctx.fillText(`RAGE ${hero.rage}`, 370, 536);
  }
```

Press **▶ Play**. Pick up the pepper, pick up the axe, equip the axe, eat the pepper, and go find the mushroom. 😤

> **Challenge:** Make up your own item! You'll need to add it to `ItemKind`, `itemInfo`, `itemKindForTile` and `useItem`. For the picture, you can reuse an existing sprite by adding a new line to `sprites.ts`, like `bigPotion: loadImage("potion")`. Some ideas: a **big potion** that heals 10, **boots of speed**, or a **mystery potion** that does something random!

### Chapter complete! 🎉

Grunk is fully kitted out. You learned:

- `Number(...)` turns a string into a number, and `NaN` means "not a number".
- `splice` removes items from a list at a certain position.
- `Math.min` and `Math.max` pick the smaller or bigger number.
- **Stacked cases** in a `switch` share the same code.
- `strokeRect`, `strokeStyle` and `lineWidth` for drawing outlines.
- Counting down a **timer** once per turn.

Next chapter: the dungeon gets **deeper**, with more levels, stairs, and locked doors.
