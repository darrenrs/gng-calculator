# Gold and Goblins Calculator Design Spec 2

## Definitions

- Evergreen: Main "world" of the game
- LTE/Event: Temporary "world" of the game (Limited-Time Event)
- Balance: A single JSON data file describing all mathematical properties of a specific LTE
- BALANCE_ROOT: The top of the JSON object for event/evergreen balance
- SAVE_ROOT: The top of the JSON object for players save file
- The terms "wall", "checkpoint", and "gate" have been used interchangeably. Make this consistently shown to the user as "checkpoint".
- The terms "mineshaft" and "generator" have been used interchangeably. Use "Mineshaft(s)" in the UI and "generator(s)" in the code.

## Objective

The objectives for part 2 of the design spec are to:

- Have a more polished browser UI with components starting to become set in stone
- Introduce a common state that will allow interpreted balance data to be populated with user save data
- Add the hardest features such as an interactive map and cracking the formulas for delivery barrel rewards.

## Time Formatting

All displayed times will be subject to a common formatter.

If t >= 31560000:
"0y 000d"
If t >= 864000:
"0d"
If t >= 86400:
"0d 00h"
If t >= 3600:
"0h 00m"
If t >= 60:
"0m 00s"
If t >= 1:
"0s"
If t >= 0.001:
"000ms"
If t < 0.001:
"instant"

where "0" is a placeholder for significant figures

## Table Formatting

- Scrap the existing custom table CSS. All tables except the map will have completely barebones bootstrap selectors for now.
- All tables should have 12px font, including the map.

## UI Elements

### Navbar

- The navbar/header should be clearly separated from the main body content by a subtle border and making the navbar slightly lighter shade.
- The navbar should adhere to the following format:
  (DESKTOP/TABLET)
  | [ICON] G&G Calculator [BALANCE SELECTOR] {...} [About button]|

(MOBILE)
| [ICON] G&G Calculator {...} [About button]|
| [BALANCE SELECTOR] {......} |

where "About button" is a link-appearing element that currently has no effect (dummy button) and the vertical bars define the extent of the viewport.

## Types and State Model

The types and state model are the most important thing to get right early, because they define where data is allowed to live. If these boundaries blur, the app will become hard to maintain as balance data, save data, manual input, derived calculations, and localStorage begin interacting.

We will have three degrees of types:

- sourceTypes.ts - Contains raw external/source data types, including BALANCE_ROOT, SAVE_ROOT, and LTE_SCHEDULE. These types mirror downloaded/API/protobuf data. They are used for loading and interpretation only; manual user input never writes back into these shapes.

- activeStateTypes.ts - Contains the canonical active player/app state. This is the editable state produced by defaults, interpreted source data, manual user input, or an imported save. In the future, this is the state that can be serialized to localStorage. It should store durable facts and user assumptions, not values that can be recalculated from balance + active state.

- derivedTypes.ts - Contains computed projection types used to populate the UI. These are built from sourceTypes + activeStateTypes, often through calculation/projection functions. They are not persisted directly and are recalculated whenever the source data or active state changes.

### Source Types

Source type for a balance should include the maximum currency amount at BALANCE_ROOT["BalanceProperties"][0]["AntiCheatSettings"]["CoreCurrencyMax"] (tables that generate lists of values should stop when that threshold is reached. )

#### Goblins

We haven't talked about Goblins yet. Basically, there are three ways to get goblins:

1. Buy one at the bottom of the screen
2. waiting a certain time interval for the goblin cannon to send a barrel (will still apply offline)
3. collecting barrels that appear while in-game

The goblin level starts at 1, and you can collect 1/BALANCE_ROOT["Reinforcements"]["LevelMultiplier"] goblins per level until it levels up. The price of a goblin is determined by BALANCE_ROOT["Reinforcements"]["CostMultiplier"] * BALANCE_ROOT["Reinforcements"]["CostGrowth"] ^ TOTAL_LEVELS.

The base value of a goblin level is increase by StatModifierType=4. The cost is divided by StatModifierType=2 or 3. (2 is just straight up, 3 is multiplicative per checkpoint.)

#### Deliveries

The value of a Delivery depends on the type.

enum DeliveryType {
GOBLIN = 1
ELIXIR = 2
GOLD = 3
DYNAMITE = 4
}

- If type=1, the value is GOBLIN_CANNON_LEVEL + BALANCE_ROOT["Deliveries"][n]["QuantityBase"]
- If type=2, the value is UNKNOWN (have not figured this out yet)
- If type=3, the value is INCOME_PER_SEC * QuantityMultiplier * (1 + BoostPercentage% from statModifierType=13)
- If type=4, the value is HIGHEST_LEVEL_OF_A_GOBLIN_ON_THE_MAP (leave this a placeholder text for now, say "Highest Goblin Lvl")

#### Card Rarities

enum Rarity {
COMMON = 1
UNCOMMON = 2
RARE = 3
EPIC = 4
LEGENDARY = 5
MAJESTIC = 6
ANCESTRAL = 7
}
(Use this for cards in source)

Everything else can be defined from the source.

### Active State Types

Active state stores current player/app assumptions, not interpreted balance objects.

type ActiveState = {
schemaVersion: number;
balanceId: string;
selectedZoneId: string;
maximumCurrency: number;

map: {
checkpointsOpened: number;
mineshaftIdsOpened: string[];
// later: cleared rocks, cell overrides, etc.
};

goblins: {
currentGoblinLevel: number;
currentGoblinLevelProgress: number;
};

cards: Record<string, CardInput>;

generators: Record<string, GeneratorInput>;

deliveries: Record<string, DeliveryInput>;
};

CardInput is like {"ca001": {"level": 14, "quantity": 5000}}
(where Quantity is the count within the current level)

GeneratorInput is like {"amethyst": {"level": 200}}

There won't be any map inputting yet, just the number of checkpoints open, and checklist of mineshafts by if the player has indicated that it's unlocked (NOT the card, the actual mineshaft in the map). Hint "spawningcart" will always appear in mineshaftIdsOpened.

We won't wire in deliveries yet either. Just make it a dummy/blank type

### Derived Types

You can build this based on the following descriptions of Body.

### Balance Selector Menu

- Only show a schedule entry if currentDate <= LTE_SCHEDULE_ENTRY["EndDateTimeUtc"] (ONLY consider the date, not the time. Example: 2026-03-16T10:00:00Z is valid until 2026-03-16 23:59:59 local time regardless of timezone.)
- Add an override to localization processing to display "space1" and "space2" as "Space (Left)" and "Space (Right)".
- Make the date text about 12px, vertically centered, and right aligned.
- Change "All Events" label to "All Balances". Make the first entry evergreen/Main Mines, with a special more significant border beneath. Following LTE entries should be ordered alphabetically by display name, not key.
- The selected entry, whether that be schedule or direct balance, should be highlighted.
- If a schedule entry is selected, the default zone is `zone{the value of LTE_SCHEDULE_ENTRY["ExclusiveZoneNumber"]}`. If a direct balance is selected, the default zone is zone1.

### Body - Tab Selectors

- The list of tabs should extend the full width of the screen, and have the appearance of actual tabs (.nav-tabs)
- The selected zone is extremely important. The selector should persistently display immediately above the tab list. It will be able to be modified no matter what tab is selected.

### Body - Summary Tab

The Summary tab will contain a label saying "Fill in the input boxes under Card and Mineshaft to get started!", then below that two containers stacked on top of each other. The first will be Input. The second will be Output.

#### Basic Inputs

- Checkpoint: Count of checkpoints that have been opened. Max value is how many checkpoints are in the current zone.
- Current Goblin Level: A simple input box containing the level of the goblin cannon. Default is 1

These won't implement anything new, they're just being drawn from (map.checkpointsOpened, goblins.currentGoblinLevel).

#### Basic Outputs

- For now, only display the income per second and per hour. Do this for both inactive play (only raw automated rates) and active play (counting deliveries).

### Body - Card Tab

Card Table is defined as follows:
| Card Name | Rarity | Level | Effect | Description |
| (unchanged from current) | localization key card.rarity.{rarityId}.singular | (unchanged) | effect (just unformatted number for now) | localization key for effect is now *.description rather than *.name.long.

### Body - Mineshaft Tab

- Managers column is a bit screwed up. It needs to contain all managers with the input box for their associated level. The label should be the rarity (i.e., Common or Uncommon). For whatever one has the automation requirement, it needs to have that next to it (e.g., Auto at 11).
- Income / Sec will depend on if the Auto criterion is met. If not, then it'll be 0.

It is critical that mineshafts which do not exist in the current zone are shown as greyed out and disabled.

Below this will be a table where you can select any mineshaft via a dropdown menu and it'll show the list of upgrades and cost to get to the next upgrade like in the previous commit version, BUT big difference, it'll only be ONE mineshaft at a time. There will be no fancy formatting for this table. All mineshafts will be an option to choose from. It will also contain a third column which is Elixir Gained. The value of this is: {TBD}

### Body - Map Tab

- The map is probably the most overall complex part of the program, especially when you consider the fact that it'll need to be interactive. For now, we will make it prettier and able to be modified by client inputs, but the user cannot directly manipulate it yet.
- The raw ZONE["Grid"] CSV is stored in display order from top-left to bottom-right.
- For gameplay/progression interpretation, treat the bottom-left cell as the start of the map. The parser should walk left-to-right across the bottom row, then move one row upward and repeat. In other words
  - CSV index order: top row to bottom row
  - progression/parser order: bottom row to top row
  - within each row: left to right
- Parse each cell. If it's blank, it will be left grey. If it's not blank, then split it by ":". The first element in the array is a single character:
  - If character is "x": look up the second array index in BALANCE_JSON["Obstructions"] by "Id". Starting from its bottom left corner, it spans DepthCells high and WidthCells to the right. Those cells should all end up appearing black in the table.
  - If character is "r": look up the second array index in BALANCE_JSON["Rocks"] by "Id". Starting from its bottom left corner, it spans DepthCells high and WidthCells to the right. Those cells should all end up appearing very light grey in the table (this will change, because some "rocks" are different than others but we are staying simple here for now.) a number should be shown inside, and that number is the value of the third array index.
  - If character is "s": it is a mineshaft. The formatting of the split array is [s, MINESHAFT_ID, GACHA_REWARD_ID, CARD_ID_THAT_AUTOMATES_IT, LEVEL_THAT_CARD_ID_MUST_BE_GREATER_THAN_OR_EQUAL_TO_AUTOMATE_ELSE_RUNS_MANUALLY] IT MUST BE added to the list of active mineshafts in the current zone. Its DepthCells and WidthCells are found in BALANCE_JSON["MineShafts"] keyed by "Id". The display contents should be "{Display Name of Mineshaft}\nAutomated: {Yes or No based on card levels}\nIncome per Cycle: {Income per Cycle number formatted}". BG Color should be red for now.
  - If character is "c": it is the spawning cart. Its width is always 1 high by 5 wide. It should display contents: "Spawning Cart | Income per Cycle: {income per cycle number formatted}". because it will always be automated we don't need to include the automated section. BG Color should be red for now. Note: if number of checkpoints is greater than 0, the spawning cart will actually be shown in the nth checkpoint area starting from the bottom and any checkpoints at or below the nth number of checkpoint will not be displayed.
  - If character is "p": it is a checkpoint. Its width is always 1 high by 5 wide. It should be gold-ish bg and display contents: "Checkpoint #N: {level}" where level is the third value in the joined array.
  - If character is "e": it is an exit. its width is always 1 high by 3 wide. It should be gold-ish bg and display contents: "Exit: {level}" where level is the third value in the joined array.
  - Note: each individual cell should be exactly square and have a x-axis scroller if needed.

### Body - Goblins Tab

Show a table of goblin levels and costs within levels.
Should have columns left to right starting at label, then 1...1/BALANCE_ROOT["Reinforcements"]["LevelMultiplier"]. And rows generated going until currency exceeds BALANCE_ROOT["BalanceProperties"][0]["AntiCheatSettings"]["CoreCurrencyMax"]. The goblin number label on the left should take into account goblin level statmodifier offset.

### Body - Deliveries Tab

- Deliveries should be displayed like they are presented in docs/DESIGN_SPEC_02_Appendix_A.js (JS rendering) and docs/DESIGN_SPEC_02_Appendix_B.py (Python delivery cycle reference). But Also include the computed value that I discussed before for each type.
- The time between each delivery is BALANCE_ROOT["BalanceProperties"][0]["DeliveryDelaySecBase"] * (BALANCE_ROOT["BalanceProperties"][0]["DeliveryDelaySecGrowth"] ^ DeliveriesInCycle). The DeliveriesInCycle number resets every BALANCE_ROOT["BalanceProperties"][0]["DeliveryClaimCountResetSec"]. The actual collected deliveries resets every BALANCE_ROOT["BalanceProperties"][0]["DeliveryMaxDupesResetSec"]. THIS IS CORROBORATED IN THE PYTHON FILE.
  - basically, we want to get the income rate of active delivery farming derived over the full four-hour interval divided to per second. THAT value will be seen here AND in summary tab.
  - The actual individual collected deliveries will be implemented once full save interpreting is implemented.

### Body - Gacha Tab

- Show Walls + Shafts open as a non-editable number calculated from checkpointsOpened + len(mineshaftIdsOpened) in ActiveState.map.
- Rename "Walls + Shafts open" to "Unlocked Checkpoints and Shafts"
- If a card with statModifierType=16 is available, wire that one in too as a dropdown.
- Show the gacha table as normal.
- Have another table showing the scripted gachas, with their ID in one column, with "{GuaranteedCardIds} x{GuaranteedCardCounts}" in another column (each one split by a comma), and then another column for SoftCurrencyMin labeled "Elixir" and another column for LeaderboardCurrency labeled "Crowns".

### Body - Save Tab

The Save tab will not be changed visually for now. Instead, a successful PlayFab API response will be decoded into json according to gng_pb2.py and the response will be displayed.

## Testing Approach

Pure game logic should be implemented in `.ts` calculation/projection modules rather than inside `.tsx` views whenever possible. This includes map parsing, active-state initialization, income calculations, delivery calculations, gacha unlock counts, and save-to-active-state interpretation.

For pure logic, define expected behavior before or alongside implementation and cover it with focused tests. UI components can be implemented first, then verified with targeted rendering/smoke tests and manual browser checks.

Priority test targets for Spec 2:

- active state defaults and updates
- map CSV parsing and bottom-left progression order
- map object sizing rules

Create a basic skeleton but do not populate these values yet:

- generator automation and income per second
- summary projections
- delivery active-income calculations once formulas are implemented

## Other

- Fix the bug where FastAPI/Uvicorn will not read API_PORT.
- KEEP IT SIMPLE. If you're unsure about something, don't implement it and let me know.
- Do not run any "modifying" git commands like commit/branch/switch/etc.
- Use docs/DESIGN_CHECKLIST_02.md to keep track of progress. Check it off every time you complete something.
