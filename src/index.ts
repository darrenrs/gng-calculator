import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { Mineshaft } from './mineshaft';
import { Gacha, GachaChest, Zone, ZoneMultiplier } from './gacha';
import { readdir } from "fs";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(express.static('public', {extensions: ['html']}));
app.use(express.static(__dirname + '/../node_modules/bootstrap/dist'));

app.get("/api/event/all", async (req: Request, res: Response) => {
  // return all eventids from balance folder
  const path = 'balance';
  
  try {
    const files = await new Promise<string[]>((resolve, reject) => {
      readdir(path, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
    const eventIds = files.map(file => file.replace('balance_', '').replace('.json', ''));
    const evergreenIndex = eventIds.indexOf('evergreen');
    eventIds.splice(evergreenIndex, 1);
    const eventIdsEvergreenFirst = ['evergreen', ...eventIds];

    res.json(eventIdsEvergreenFirst);
  } catch {
    res.sendStatus(404);
    return;
  }
});

app.get("/api/event/schedule", async (req: Request, res: Response) => {
  res.sendStatus(501);
});

app.get("/api/mineshaft", async (req: Request, res: Response) => {
  if (!req.query.balance || typeof req.query.balance !== 'string') {
    res.sendStatus(400);
    return;
  }

  const balance_id: string = req.query.balance;

  try {
    const json_data = JSON.parse(await readFile(`balance/balance_${balance_id}.json`, "utf8"));
    const return_data : Mineshaft[] = [];

    // do the forge first
    const exponent_forge : number = json_data.SpawningCart[0].UpgradeCostGrowth;
    const base_forge : number = json_data.SpawningCart[0].UpgradeCostBase;

    // get index for generator objective
    let generator_objective_idx_forge = -1;
    for (let i in json_data.GeneratorObjectives) {
      if (json_data.GeneratorObjectives[i].GeneratorId === 'spawningcart') {
        generator_objective_idx_forge = parseInt(i);
      }
    }

    // unable to find the matching generator objective
    if (generator_objective_idx_forge === -1) {
      res.sendStatus(500);
      return;
    }

    let absolute_limit_level_forge : number = (json_data.GeneratorObjectives[generator_objective_idx_forge].ObjectiveCount).reduce((partialSum : number, a : number) => partialSum + a, 0) + 1;
    let cost_per_level_forge : number[] = [0];
    let current_price_forge : number = base_forge + 0;
    
    while (isFinite(current_price_forge) && cost_per_level_forge.length < absolute_limit_level_forge) {
      cost_per_level_forge.push(current_price_forge);
      current_price_forge *= exponent_forge;
    }

    const forge_shaft : Mineshaft = {
      'Id': 'spawningcart',
      'CostPerLevel': cost_per_level_forge,
      'MultiplierPerObjective': json_data.GeneratorObjectives[generator_objective_idx_forge].CoreCurrencyMultiplier,
      'CountPerObjective': json_data.GeneratorObjectives[generator_objective_idx_forge].ObjectiveCount
    }

    return_data.push(forge_shaft)

    for (const mineshaft of json_data.MineShafts) {
      const name : string = mineshaft.Id;
      const exponent : number = mineshaft.UpgradeCostGrowth;
      const base : number = mineshaft.UpgradeCostBase;

      // get index for generator objective
      let generator_objective_idx = -1;
      for (let i in json_data.GeneratorObjectives) {
        if (json_data.GeneratorObjectives[i].GeneratorId === name) {
          generator_objective_idx = parseInt(i);
        }
      }

      // unable to find the matching generator objective
      if (generator_objective_idx === -1) {
        res.sendStatus(500);
        return;
      }

      let absolute_limit_level : number = (json_data.GeneratorObjectives[generator_objective_idx].ObjectiveCount).reduce((partialSum : number, a : number) => partialSum + a, 0) + 1;
      let cost_per_level : number[] = [0];
      let current_price : number = base + 0;

      while (isFinite(current_price) && cost_per_level.length < absolute_limit_level) {
        cost_per_level.push(current_price);
        current_price *= exponent;
      }

      const current_shaft : Mineshaft = {
        'Id': name,
        'CostPerLevel': cost_per_level,
        'MultiplierPerObjective': json_data.GeneratorObjectives[generator_objective_idx].CoreCurrencyMultiplier,
        'CountPerObjective': json_data.GeneratorObjectives[generator_objective_idx].ObjectiveCount
      }

      // console.log(current_shaft);
      return_data.push(current_shaft);
    }

    res.json(return_data);
  } catch {
    res.sendStatus(404);
    return;
  }
});

app.get("/api/gacha-reward", async (req: Request, res: Response) => {
  if (!req.query.balance || typeof req.query.balance !== 'string') {
    res.sendStatus(400);
    return;
  }

  const balance_id: string = req.query.balance;

  try {
    const json_data = JSON.parse(await readFile(`balance/balance_${balance_id}.json`, "utf8"));

    const gachaChests : GachaChest[] = [];

    // populate Gacha
    for (let gacha of json_data.Gacha) {
      const isScripted = gacha.GuaranteedCardIds.length > 0;
      const gachaChest : GachaChest = {
        Id: gacha.Id,
        IsScripted: isScripted,
        SoftCurrencyMin: gacha.SoftCurrencyMin,
        SoftCurrencyMax: gacha.SoftCurrencyMax,
        LeaderboardCurrency: gacha.LeaderboardCurrency,
        BaseNumCards: gacha.BaseNumCards,
        UncommonWeight: gacha.UncommonWeight,
        RareWeight: gacha.RareWeight,
        LegendaryWeight: gacha.LegendaryWeight,
        EventEpicWeight: gacha.EventEpicWeight
      }
      
      // don't want Scripted currently, but maybe in the future
      if (isScripted) {
        continue;
      }

      gachaChests.push(gachaChest);
    }

    const zones : Zone[] = [];

    for (let zone of json_data.Zones) {
      const zoneMultipliers : ZoneMultiplier[] = [];

      // index this one
      for (let zoneMultiplier in zone.RankMultipliers) {
        const zoneMultiplierDataFile = zone.RankMultipliers[zoneMultiplier];
        const zoneMultiplierObj : ZoneMultiplier = {
          Id: zoneMultiplier,
          GachaCardsMultNormal: zoneMultiplierDataFile.GachaCardsMultNormal,
          GachaCardsMultPremium: zoneMultiplierDataFile.GachaCardsMultPremium,
          GachaCardsMultRare: zoneMultiplierDataFile.GachaCardsMultRare,
          GachaLeaderboardCurrencyMultNormal: zoneMultiplierDataFile.GachaLeaderboardCurrencyMultNormal,
          GachaLeaderboardCurrencyMultPremium: zoneMultiplierDataFile.GachaLeaderboardCurrencyMultPremium,
          GachaLeaderboardCurrencyMultRare: zoneMultiplierDataFile.GachaLeaderboardCurrencyMultRare,
          GachaSoftCurrencyMultNormal: zoneMultiplierDataFile.GachaSoftCurrencyMultNormal,
          GachaSoftCurrencyMultPremium: zoneMultiplierDataFile.GachaSoftCurrencyMultPremium,
          GachaSoftCurrencyMultRare: zoneMultiplierDataFile.GachaSoftCurrencyMultRare,
          GenObjectiveSoftCurrencyMultiplier: zoneMultiplierDataFile.GeneratorId,
          MiningLeaderboardCurrencyMultiplier: zoneMultiplierDataFile.MiningLeaderboardCurrencyMultiplier,
          MiningSoftCurrencyMultiplier: zoneMultiplierDataFile.MiningSoftCurrencyMultiplier,
        }
        
        zoneMultipliers.push(zoneMultiplierObj);
      }

      const zoneObj : Zone = {
        Id: zone.Id,
        SubZones: zoneMultipliers
      }

      zones.push(zoneObj);
    }

    const return_data : Gacha = {
      GachaChests: gachaChests,
      Zones: zones
    }
    
    res.json(return_data);
  } catch {
    res.sendStatus(404);
    return;
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});