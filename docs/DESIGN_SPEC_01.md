# Gold and Goblins Data Spec

## Definitions
- Evergreen: Main "world" of the game
- LTE/Event: Temporary "world" of the game (Limited-Time Event)
- Balance: A single JSON data file describing all mathematical properties of a specific LTE
- BALANCE_ROOT: The top of the JSON object for event/evergreen balance
- SAVE_ROOT: The top of the JSON object for players save file

## Goals
The current end state is we need the webpage to have the following abilities:

- Use evergreen/LTE balance, localization, and lte schedule on disk to present information
- Download updated balance data for a specific version
- Have an endpoint to obtain a players' save file, but should not interpret it yet. (See TMP_server.py at project root for more info)

## Project Structure
- balance - contains balance files, localization, lte schedule
- public - contains static resources
- src/client - contains client code (Vite/React); all actual game/interpretative logic should be here
- src/server - contains server code (rewrite to Python); this is only API, should not do any "calculations"

### Balance Files
- Balance files, localization, and lte schedule are currently downloaded by scripts/get-balances.py and written to balance/.
- When a balance file is requested, client must load it as a Balance type. The entire balance file is a single JSON element. Not all data will be interpreted though. We will start with what's currently in types_defined.ts.

### Event Metadata
- Use LteSchedule types in types_defined.ts against lte_schedule.json.
- Note that the name of an LTE is given by looking up in localization: theme.{GameDataId}.name.

### Localization
Literally just an ini file, as in X=Y format. Client should load the file and have a way to query value by key.

## Client Side Game State Processing
The entire game state should be computed based on a singular source of truth: what the users' inputs are.

## Cards
- CARDS influence the three main parts of the game itself which are (1) income, (2) damage that goblins inflict on obstacles every tick, (3) rate of obtaining new goblins.
- List of cards is found in BALANCE_ROOT["Cards"][n]. A specific card is given as CARD below.
- CARD["StatModifierType"] describes what a specific card does--very important.
- Cards are to be sorted by CARD["SortingWeight"] descending. If CARD["IsManager"] is true, they will be associated with a mineshaft, which will be always element 0 in TargetIds.  If CARD["IsManager"] is false, it is a general/global effect.
- Cards have a level. The number of levels for a given rarity is given in BALANCE_ROOT["CardUpgradeCosts"], where the cards rarity is CARD["Rarity"].

### Rarities
Rarity number to localization key.

- 1: card.rarity.common.singular
- 2: card.rarity.uncommon.singular
- 3: card.rarity.rare.singular
- 4: card.rarity.eventepic.singular
- 5: card.rarity.legendary.singular
- 6: card.rarity.majestic.singular
- 7: card.rarity.ancestral.singular

### StatModifierType
This will describe each value of StatModifierType, its description key in localization and its value based on an input level.
(Write these into the code in numerical order.)

- 27 (statbonus.AncestralPowerMult.name.long): value is ModifierBase + ModifierGrowth * LEVEL^2
-  9 (statbonus.corecurrencymulttargetgenerators.name.long): value is ModifierMultiplier * ModifierGrowth ^ LEVEL
- 12 (statbonus.corecurrencypercentallrocks.name.long): value is ModifierBase + ModifierGrowth * LEVEL^2
-  7 (statbonus.minerspawntimereduction.name.long): value is ModifierMultiplier * LEVEL
- 15 (statbonus.prodtimeinversepercentallgenerators.name.long): value is LEVEL * (ModifierMultiplier+ModifierGrowth*LEVEL)
-  3 (statbonus.reinforcementscostdividerpercheckpoint.name.long): value is ModifierMultiplier * ModifierGrowth ^ LEVEL
-  5 (statbonus.minercritchanceaddition.name.long): value is LEVEL * (ModifierMultiplier+ModifierGrowth*LEVEL)
- 13 (statbonus.corecurrencypercentdeliveries.name.long): value is LEVEL * (ModifierMultiplier+ModifierGrowth*LEVEL)
-  8 (statbonus.minerspawntimereductionpercheckpoint.name.long): value is ModifierMultiplier * LEVEL
- 16 (statbonus.cardsmultallgacha.name.long): value is LEVEL * (ModifierMultiplier+ModifierGrowth*LEVEL)
- 19 (statbonus.LteRewardsMult.name.long): value is LEVEL * ModifierMultiplier
- 24 (statbonus.crusherspeedaddition.name.long): value is LEVEL * (ModifierMultiplier+ModifierGrowth*LEVEL)
- 20 (statbonus.dynamitedropchanceaddition.name.long): value is ModifierBase + ModifierMultiplier * LEVEL
- 21 (statbonus.hardcurrencydoubleddropchanceaddition.name.long): value is ModifierBase+ModifierMultiplier * LEVEL+ModifierGrowth * LEVEL^2
- 25 (statbonus.crusherbombreduction.name.long): value is ModifierBase + ModifierMultiplier * LEVEL
- 22 (statbonus.dynamitepowermult.name.long): value is ModifierBase+ModifierMultiplier * LEVEL+ModifierGrowth * LEVEL^2
- 23 (statbonus.rocklegendarychestdropchanceaddition.name.long): value is ModifierMultiplier * LEVEL
- 10 (statbonus.corecurrencymultallgenerators.name.long): value is ModifierMultiplier * ModifierGrowth ^ LEVEL
-  1 (statbonus.minerunitcapaddition.name.long): value is LEVEL
- 11 (statbonus.corecurrencymultallgenpercheckpoint.name.long):  value is ModifierMultiplier * ModifierGrowth ^ LEVEL
-  6 (statbonus.minercritpowermult.name.long):  value is ModifierMultiplier * ModifierGrowth ^ LEVEL
-  4 (statbonus.reinforcementsleveladdition.name.long): value is LEVEL
- 26 (statbonus.GoblinKing.name.long): value is ModifierBase + ModifierMultiplier * (LEVEL + 1)
-  2 (statbonus.reinforcementscostdivider.name): value is ModifierMultiplier * ModifierGrowth ^ LEVEL

(Not Covered StatModifierTypes: 14, 17, 18)

### Testing Suite

Presented as modifier_type | ModifierBase | ModifierMultiplier | ModifierGrowth |  level | output

27 | 0.021 | 0 | 0.0038 | 11 | 0.4808
9 | 0 | 1 | 3 | 14 | 4782969
9 | 0 | 1 | 3 | 10 | 59049
9 | 0 | 1 | 4 | 12 | 16777216
12 | 0 | 0 | 0.6 | 9 | 48.6
7 | 0 | 60 | 0 | 9 | 540
15 | 0 | 0.1 | 0.001 | 9 | 0.981
3 | 0 | 0.5 | 10 | 9 | 500000000
5 | 0 | 0.047 | 0.0022 | 9 | 0.6012
13 | 0 | 0.3 | 0.1 | 9 | 10.8
8 | 0 | 30 | 0 | 9 | 270
16 | 0 | 0.042 | 0.0015 | 9 | 0.4995
19 | 0 | 0.08 | 0 | 9 | 0.72
24 | 0 | 0.08 | 0.009 | 6 | 0.804
24 | 0 | 0.08 | 0.009 | 7 | 1.001
20 | 0.01 | 0.02 | 0 | 6 | 0.13
20 | 0.01 | 0.02 | 0 | 7 | 0.15
21 | 0.03 | 0.0205 | 0.0016 | 6 | 0.2106
21 | 0.03 | 0.0205 | 0.0016 | 7 | 0.2519
25 | 4.5 | -0.5 | 0 | 6 | 1.5
25 | 4.5 | -0.5 | 0 | 7 | 1
22 | 0 | 0.1 | 0.002 | 6 | 0.672
22 | 0 | 0.1 | 0.002 | 7 | 0.798
23 | 0 | 0.0005 | 0 | 6 | 0.3
23 | 0 | 0.0005 | 0 | 7 | 0.35
10 | 0 | 1 | 3 | 5 | 243
1 | 0 | 1 | 0 | 5 | 5
11 | 0 | 1 | 2 | 5 | 32
6 | 0 | 1 | 2 | 5 | 32
4 | 0 | 1 | 0 | 5 | 5
26 | 0.05 | 0.05 | 0 | 0 | 0.1
26 | 0.05 | 0.05 | 0 | 2 | 0.2
3 | 0 | 1 | 100 | 5 | 10000000000

## Mineshafts
- Mineshafts are what generates income. Each mineshaft is a "mineral" (e.g. amethyst, citrine, cosmostone) that player unlocks on the map.
- The list of mineshafts is found in BALANCE_ROOT["MineShafts"], and a given mineshaft is defined as MINESHAFT below.
- When a player unlocks a mineshaft, it always starts at level 1. They can spend currency to upgrade it. When certain level milestones are reached a big multiplier takes effect. The default output is MINESHAFT["CurrencyOutputMultiplier"] and any card multipliers associated with it via CARD["IsManager"] (StatModifierType=9) as well as global multipliers (StatModifierType=10|11) and any checkpoint modifiers.
- Each level multiplies the CurrencyOutputMultiplier. In BALANCE_ROOT["GeneratorObjectives"], there will be a key for each mineshaft, linked by MINESHAFT["Id"]=BALANCE_ROOT["GeneratorId"]. Within each dict in GeneratorObjectives, there will be ObjectiveCount which specifies distance to next level and CoreCurrencyMultiplier which specifies the multiplier that takes effect IN ADDITION to the base level multiplier. The price for a given level is an exponential function which is already in balances.ts. The price to get to the next base level multiplier (which is the only thing we even care about, as is seen in the table display) is summing the next {ObjectiveCount} values.
- The "spawningcart" is its own thing. It's in element 0 of key BALANCE_ROOT["SpawningCart"] (instead of MineShafts). It has the same keys for determining cost as the MineShafts root key. It can be found normally with the rest of the mineshafts in GeneratorObjectives.
- MINESHAFT["GenerationDelaySecBase"] defines how long it takes for the income value to be produced. The interval time can be decreased by a certain percentage by checkpoints or global cards with StatModifierType=15. The percentage value means by what percentage the base time is decreased by. Note: if checkpoints and global cards both influence the percentage, those two percentages are added together (e.g., 60% + 30% = 90%.)
- Mineshafts may not be automated. The researcher and level to automate is given in the map. If the mineshaft is not automated, it has to be ran manually.

### Mineshaft example

Diamond mineshaft in evergreen has CurrencyOutputMultiplier of 32400000000000000.
If all cards are maxed and one wall is down in the current mine, then you multiply it by 3^14 (common) * 4^12 (rare) * 3^5 (legendary) * 2^5 (other legendary) * 2^1 (number of walls down) to get 4.043e+34 each cycle. Note that in this particular case the real value shown in game is 8.086e+34. I'm trying to figure out where the missing x2 coefficient is coming from. DO NOT wire in a "magical" 2x coefficient for this reason. More testing is needed.

The GeneratorDelaySecBase is 3600. However, with level 9 global mineshaft speed card, a 98.1% time decrease takes place, causing the cycle time to only be 68.4 seconds. (3600*(1-0.981)) Therefore, if you have mineshaft just unlocked at level 1, you get 8.086e+34 currency per 68.4 s, or 1.179e33 / sec.

If you have mineshaft at level 200, it gets all the multipliers up to and including that level. In GeneratorObjectives for that mineshaft, you get 4^15 * 500^5, plus a x200 coefficient for level 200 vs. level 1. Therefore, with all those factors, you get 5.4269e+59 currency per 68.4 s, or 7.934e57 / sec.

## Gacha
- Chests, or "Gacha", are the game's primary way of giving cards. You can get chests from the map or from the free cycle. We will not deal with the free cycle at this time.
- The list of chests is found in BALANCE_ROOT["Gacha"], and a given chest is defined as GACHA below.
- A chest can be either scripted (gives exact rewards) or non-scripted (gives random rewards). Scripted chests will always have GACHA["GuaranteedCardIds"] : string[], GACHA["GuaranteedCardsCounts"] : number[] populated, and GACHA["SoftCurrencyMin"] = GACHA["SoftCurrencyMax"].
- For now, just use the existing Gacha logic to generate a list of the possible nonscripted chests with their card distributions. This does involve the current method using Zone ID, Walls+Shafts Open, and Cards+ Lvl.

## Income
- Income is stored as a double, and is rendered in powers of thousands as in format.ts. (with powers of thousand suffixes being N/A, K, M, B, T, AA, AB, AC, ..., AZ, BA, BB, ...)
- The three ways to get income are mineshafts (running automatically or running manually if they are not automated), delivery barrels, and rocks. We will only deal with the first case for now.

## Map
- All balances contain one or more maps, which is an Rx7 grid where R is the varying number of rows of the current zone (or "Mine"). The grid format is very simple, but not fully documented.
- Each map associated with a balance is found in BALANCE_ROOT["Zones"]. That is a list of Zones, indexed by ZONE["Id"], and the grid is a one-line CSV in ZONE["Grid"]. 
- When interperting the map, always start at the top left, then make a new row after every 7th cell. The number of elements in the CSV will always  be divisible by 7.
- For now the map display should only contain the raw content of each cell. Note that if it's a period, it should be shown as blank.
- ZONE["RankMultipliers"][0] are used in the gacha calculations.

### Gate Stuff
Each gate shows up in the CSV as an element starting with "p". Every time a gate is opened, global effects take place. That can be found in BALANCE_ROOT["CheckPoint"][0]. That will contain an array "StatModifierType" containing all the StatModifierTypes that take place. The formula parameters can be found in corresponding arrays like "ModifierBase", "ModifierMultiplier", etc. that are indexed in the same position to their corresponding StatModifierType.

For the first version, just have an dropdown saying how many gates have been opened.

## Goblin Cannon and Deliveries
This will not be addressed yet, but we will get to this in a future part. (This includes the "delivery/deliveries" logic in TMP_server.py)

## Save File
Have a way to fetch the save file like in TMP_server.py, but do not actually interpret it. Just decode it to JSON and show that in a box. Do not load it in as an object or anything.

## Client Views
This is only for v1. Will contain
```
Header
Body
Footer
```

### Header
Header will contain the title on the top left "G&G Calculator" with the favicon.png shown as a 32x32 picture to the left of that. Then on the right side of the header it will have the current balance name (theme.{BALANCE_NAME}.name). If you click that, a box will slide downwards from the top, with the following contents


#### Balance Box Desktop Display
```
|--------------
|theme.evergreen.name                                                                |
|## Schedule                                                                         |## All Events   |
|entries in LTE Schedule, showing start date, end date, and theme.{BALANCE_NAME}.name|All event files (except evergreen)|
```

#### Balance Box Mobile Display
(Same as desktop but move All Events under schedule, and have it take up the full viewport height)

### Body
For now, have separate selectors for Map, Mineshafts, Cards, Gacha, and Save.

#### Map
Show the parsed map in a HTML table

#### Mineshafts
Show each mineshaft in order, with an input for level, and any associated Cards by IsManager. Show the income per cycle, time, and income per second. Show the name as localization card.{cardId}.name

If global cards that influence profit or speed are found (StatModifierType either 10, 11, or 15) have a specific dropdown for their level. Also a specific dropdown for number of checkpoints. Just have it go up to 3 for now, we'll add a manual check for how many there actually are later.

#### Cards
Show all cards in order with a level input and max level. Show the name as localization card.{cardId}.name. So it should be like, "Manager - Amethyst | [ 13 ] / 14"

#### Gacha
Same behavior as current.

#### Save
As what I described earlier.

### Footer
Unchanged

### Internals
Store all of this in a basic state model that does not survive page refresh.

## API
- python server should be FastAPI. 
- Use uvicorn for local dev. Do not introduce a larger Python project manager unless necessary.
- Any requirements  should be in requirements.txt.
- Endpoints:

| endpoint | descript |
| GET /api/balances | shows array of all balances eg [arctic, candy, christmas, evergreen, ...] not "balance_" file names. |
| GET /api/balances/:balanceId | returns JSON for a singular balance, returns 404 if not found |
| GET /api/schedule | returns lte_schedule.json |
| GET /api/localization| returns localization.txt |
| POST /api/update | runs code in get-balances.py (this will all be in 1 file). Use a post body like {"version": "1.49.0"}. |
| POST /api/save | input a platform either "ios" or "android", and also input deviceId. Returns either 200 success, 400 if platform is not one of those two options or deviceId is missing, 404 if PlayFab returned 404, and 500 if there was a JSON decoding error or something like that.|
| GET /api/health | always returns a 200 with {"ok": true} |

## Other
- KEEP IT SIMPLE. If you're unsure about something, don't implement it and let me know.
- Only add formula tests/smoke checks listed in this spec. Do not add broad frontend or API test suites.
- BalanceProperties and RankMultipliers are wrapper containers in the raw balance JSON. Treat them according to the actual file shape, even if most cases only use index/key 0.(e.g., "BalanceProperties": [{"A": 1, "B": 2}])
- Use Bootstrap classes for layout/styling where reasonable. Avoid custom CSS except for small layout fixes.
- Do not run any "modifying" git commands like commit/branch/switch/etc.
- Use docs/DESIGN_CHECKLIST_01.md  to keep track of progress. Check it off every time you complete something.