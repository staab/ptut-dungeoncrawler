---
title: Treasure!
subtitle: Items, picking things up and a backpack
time: about 1½ hours
---

What's a dungeon without treasure? In this chapter the dungeon fills up with loot: gold coins, healing potions, spicy peppers, keys, weapons and armor. Grunk will pick things up and carry them in a backpack, which will show up in the HUD.

We'll use the next chapter to make the items actually *do* things. For now, it's all about finding them.

## Treasure pictures

Have a look at the item pictures in the file list: `gold`, `potion`, `pepper`, `key`, `axe`, `hammer`, `helmet` and `armor`. Then add them all to `sprites.ts`:

```ts op=after file=sprites.ts anchor="tombstone: loadImage"
  gold: loadImage("gold"),
  potion: loadImage("potion"),
  pepper: loadImage("pepper"),
  key: loadImage("key"),
  axe: loadImage("axe"),
  hammer: loadImage("hammer"),
  helmet: loadImage("helmet"),
  armor: loadImage("armor"),
```

## An item file

Items get their own file, just like monsters. Items don't move and don't have health, but they do have a name, and weapons and armor make Grunk stronger. Click **+ New file**, name it `items.ts`, and type:

```ts op=create file=items.ts
// Everything about items (treasure and gear) lives in this file.

export type ItemKind = "gold" | "potion" | "pepper" | "key" | "axe" | "hammer" | "helmet" | "armor";

export type Item = {
  kind: ItemKind;
  name: string;
  x: number;
  y: number;
  attack: number;
  defense: number;
};

type ItemInfo = {
  name: string;
  attack: number;
  defense: number;
};

function itemInfo(kind: ItemKind): ItemInfo {
  switch (kind) {
    case "gold":
      return { name: "gold", attack: 0, defense: 0 };
    case "potion":
      return { name: "healing potion", attack: 0, defense: 0 };
    case "pepper":
      return { name: "spicy pepper", attack: 0, defense: 0 };
    case "key":
      return { name: "key", attack: 0, defense: 0 };
    case "axe":
      return { name: "axe", attack: 2, defense: 0 };
    case "hammer":
      return { name: "mighty hammer", attack: 4, defense: 0 };
    case "helmet":
      return { name: "pot helmet", attack: 0, defense: 1 };
    case "armor":
      return { name: "shiny armor", attack: 0, defense: 2 };
  }
}

export function createItem(kind: ItemKind, x: number, y: number): Item {
  const info = itemInfo(kind);
  return { kind: kind, name: info.name, x: x, y: y, attack: info.attack, defense: info.defense };
}
```

This works just like the monster factory from the last chapter. `itemInfo` has the details for each kind of item, and `createItem` builds a complete item.

- `attack` is how much extra damage an item adds when Grunk uses it as a weapon.
- `defense` is how much damage it blocks when he wears it.

(Yes, the "pot helmet" is a cooking pot. Barbarians aren't fussy.)

## Letters for items

Items need map letters too. We'll use symbols, so they're easy to tell apart from the monster letters. Add this at the bottom of `items.ts`:

```ts op=append file=items.ts

// Which item does each symbol on the map stand for?
export function itemKindForTile(tile: string): ItemKind | undefined {
  switch (tile) {
    case "$":
      return "gold";
    case "!":
      return "potion";
    case "*":
      return "pepper";
    case "%":
      return "key";
    case "/":
      return "axe";
    case "T":
      return "hammer";
    case "^":
      return "helmet";
    case "[":
      return "armor";
    default:
      return undefined;
  }
}
```

Now scatter some treasure around the map in `levels.ts`:

```ts op=replace file=levels.ts
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
=====
//   g  is a ghost
//
//   $  is gold           !  is a healing potion
//   *  is a spicy pepper %  is a key
//   /  is an axe         T  is a mighty hammer
//   ^  is a pot helmet   [  is shiny armor
export const level1: string[] = [
  "################",
  "#@.....#......$#",
  "#......#....s..#",
  "#..!...#...#.b.#",
  "#..........#..*#",
  "#...s..#...#.s.#",
  "###.####...#####",
  "#$......s..x..^#",
  "#m....../....g.#",
  "################",
];
```

## A list of items

Just like monsters, the items on the current level go in a list. Import the item tools at the top of `main.ts`:

```ts op=after file=main.ts anchor="import { Monster, chooseStep"
import { Item, createItem, itemKindForTile } from "./items";
```

Make the list under the monsters list:

```ts op=after file=main.ts anchor="let monsters: Monster[] = [];"
let items: Item[] = [];
```

In `startGame`, empty the list at the start:

```ts op=after file=main.ts anchor="  monsters = [];"
  items = [];
```

Then fill it in from the map, right after the monster check:

```ts op=replace file=main.ts
        if (kind) {
          monsters.push(createMonster(kind, x, y));
        }
=====
        if (kind) {
          monsters.push(createMonster(kind, x, y));
        }
        const itemKind = itemKindForTile(level1[y][x]);
        if (itemKind) {
          items.push(createItem(itemKind, x, y));
        }
```

Finally, draw them in `drawGame`, before the monsters, so monsters walk *over* items rather than under them:

```ts op=replace file=main.ts
  for (const monster of monsters) {
    drawTile(sprites[monster.kind], monster.x, monster.y);
=====
  for (const item of items) {
    drawTile(sprites[item.kind], item.x, item.y);
  }

  for (const monster of monsters) {
    drawTile(sprites[monster.kind], monster.x, monster.y);
```

Once again, the item kinds have the same names as the sprites, so `sprites[item.kind]` finds the right picture.

Press **▶ Play**. Treasure everywhere! ✨ But Grunk just walks over it…

## Pick up gold

Grunk needs somewhere to keep his gold. Add a `gold` property to the `Hero` type and the hero object:

```ts op=replace file=main.ts
  attack: number;
};
=====
  attack: number;
  gold: number;
};
```

```ts op=replace file=main.ts
  attack: 2,
};
=====
  attack: 2,
  gold: 0,
};
```

Also reset it when a new game starts, in `startGame`:

```ts op=after file=main.ts anchor="hero.hp = hero.maxHp;"
  hero.gold = 0;
```

Next, we need to find out if there's an item on a tile. That's just like `monsterAt`! Add `itemAt` after `monsterAt`:

```ts op=before file=main.ts anchor="const hitWords"
function itemAt(x: number, y: number): Item | undefined {
  for (const item of items) {
    if (item.x === x && item.y === y) {
      return item;
    }
  }
  return undefined;
}

function pickUpItem() {
  const item = itemAt(hero.x, hero.y);
  if (!item) {
    return;
  }
  if (item.kind === "gold") {
    const amount = 5 + Math.floor(Math.random() * 16);
    hero.gold = hero.gold + amount;
    message = `${hero.name} finds ${amount} gold!`;
    addFloatingText(`+${amount}`, hero.x, hero.y, "#ffd23f");
  }
  items = items.filter((other) => other !== item);
}

```

`pickUpItem` looks for an item where Grunk is standing. If there isn't one, it stops straight away. If it's gold, Grunk gets a random amount: `5 + Math.floor(Math.random() * 16)` is somewhere from 5 to 20.

Then the item is removed from the map. `other !== item` means "**is not** the same item". (`!==` is the opposite of `===`.) So `filter` keeps every item except the one Grunk picked up.

Call `pickUpItem` whenever Grunk steps onto a new tile, in the key handler:

```ts op=replace file=main.ts
  } else {
    hero.x = newX;
    hero.y = newY;
  }
=====
  } else {
    hero.x = newX;
    hero.y = newY;
    pickUpItem();
  }
```

Press **▶ Play** and grab the gold in the top-right corner. Kaching!

## Show the gold

Players like to see their loot pile up! Add a line to `drawHud`, before the message. The gold goes on the middle line of the HUD:

```ts op=before file=main.ts anchor='ctx.fillStyle = "#ffd580";'
  ctx.fillText(`Gold: ${hero.gold}`, 16, 536);

```

Press **▶ Play** and collect both piles of gold.

## A backpack

Everything that isn't gold goes into Grunk's backpack. In code, the backpack is a list of items, so add an `inventory` to the `Hero` type. (**Inventory** is the game word for "the stuff you're carrying".)

```ts op=replace file=main.ts
  gold: number;
};
=====
  gold: number;
  inventory: Item[];
};
```

```ts op=replace file=main.ts
  gold: 0,
};
=====
  gold: 0,
  inventory: [],
};
```

Empty it at the start of a new game:

```ts op=after file=main.ts anchor="hero.gold = 0;"
  hero.inventory = [];
```

Now teach `pickUpItem` about everything else. The backpack only has room for 6 things. If it's full, Grunk leaves the item where it is:

```ts op=replace file=main.ts
    addFloatingText(`+${amount}`, hero.x, hero.y, "#ffd23f");
  }
  items = items.filter((other) => other !== item);
=====
    addFloatingText(`+${amount}`, hero.x, hero.y, "#ffd23f");
  } else if (hero.inventory.length >= 6) {
    message = `${hero.name}'s backpack is full!`;
    return;
  } else {
    hero.inventory.push(item);
    message = `${hero.name} picks up the ${item.name}!`;
  }
  items = items.filter((other) => other !== item);
```

Look at the `return` in the middle. If the backpack is full, we stop **before** the item is removed from the map, so it stays on the floor.

Press **▶ Play** and pick up the potion. The message says you got it, but you can't see the backpack yet. Let's fix that.

## Draw the backpack

We'll draw six boxes on the right side of the HUD, one for each backpack slot, with a number above each one. The numbers are for the next chapter, when you'll press 1 to 6 to use things. Add this at the end of `drawHud`:

```ts op=after file=main.ts anchor="ctx.fillText(message, 16, 564);"

  for (let i = 0; i < 6; i++) {
    const slotX = 452 + i * 52;
    ctx.fillStyle = "#2c2439";
    ctx.fillRect(slotX, 494, 46, 46);
    const item = hero.inventory[i];
    if (item) {
      ctx.drawImage(sprites[item.kind], slotX + 3, 497, 40, 40);
    }
    ctx.fillStyle = "#a397b8";
    ctx.font = "12px monospace";
    ctx.fillText(`${i + 1}`, slotX + 2, 490);
  }
```

For each slot `i` from 0 to 5, we:

1. work out where the box goes (each slot is 52 pixels to the right of the last),
2. draw the box,
3. draw the item, **if** there's one in that slot, and
4. draw the slot's number. We show `i + 1`, because people count from 1 even though computers count from 0!

What's in slot 5 if Grunk only has two things? `hero.inventory[5]` is past the end of the list, so we get `undefined`, and `if (item)` skips it.

Press **▶ Play** and go on a treasure hunt! Grab the potion, the pepper, the pot helmet and the axe.

> **Try it:** Change the map to put 8 items right next to each other, and pick them all up. What happens after 6?

### Chapter complete! 🎉

Grunk is rich! You learned:

- `!==` means "is not the same as".
- `filter` can remove one particular item from a list.
- `hero.inventory[5]` is `undefined` when the list is shorter than that.
- More practice with factories, switch, loops and the HUD.

Next chapter: slurping potions, swinging axes and eating very spicy peppers. 🌶️
