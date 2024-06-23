const endpointId = 'gacha-reward';
const globalState = {
  data: {}
}

const createTable = (gachaData, subZoneData, cardIncreaseRareLvl) => {
  const cardIncreaseRareCoeff = [
    1.0000,
    1.0435,
    1.0900,
    1.1395,
    1.1920,
    1.2475,
    1.3060,
    1.3675,
    1.4320,
    1.4995
  ];

  const gachaTypes = {
    '0': 'Normal',
    '1': 'Premium',
    '3': 'Rare'
  };

  const gachaLabels = [
    'Common',
    'Uncommon',
    'Rare',
    'EventEpic',
    'Legendary',
    'SoftCurrencyMin',
    'SoftCurrencyMax',
    'LeaderboardCurrency'
  ];

  const table = document.createElement('table');
  table.classList.add('table', 'table-striped', 'small', 'gng-mineshaft-table');

  const thead = document.createElement('thead');
  const thead_r1 = document.createElement('tr');
  const tbody = document.createElement('tbody');

  const defaultLabel = document.createElement('th');
  defaultLabel.innerText = 'GachaType';

  thead_r1.appendChild(defaultLabel);

  for (let i of gachaLabels) {
    const rarityName = document.createElement('th');
    rarityName.innerText = i;

    thead_r1.appendChild(rarityName);
  }
  
  for (let i of gachaData) {
    const cardType = gachaTypes[i.GachaType];

    const totalCards = Math.floor(i.BaseNumCards * subZoneData[`GachaCardsMult${cardType}`] * cardIncreaseRareCoeff[cardIncreaseRareLvl]);
    let totalUncommon = totalCards / i['UncommonWeight'];
    let totalRare = totalCards / i['RareWeight'];
    let totalEventEpic = totalCards / i['EventEpicWeight'];
    let totalLegendary = totalCards / i['LegendaryWeight'];

    // normalize to non-INF numbers
    if (totalUncommon === Infinity) {
      totalUncommon = 0;
    }

    if (totalRare === Infinity) {
      totalRare = 0;
    }

    if (totalEventEpic === Infinity) {
      totalEventEpic = 0;
    }

    if (totalLegendary === Infinity) {
      totalLegendary = 0;
    }

    const totalCommon = totalCards - (totalUncommon + totalRare + totalEventEpic + totalLegendary);

    const softCurrencyMin = i['SoftCurrencyMin'] * subZoneData[`GachaSoftCurrencyMult${cardType}`];
    const softCurrencyMax = i['SoftCurrencyMax'] * subZoneData[`GachaSoftCurrencyMult${cardType}`];
    const leaderboardCurrency = i['LeaderboardCurrency'] * subZoneData[`GachaLeaderboardCurrencyMult${cardType}`];

    const tr = document.createElement('tr');

    const tr_label = document.createElement('td');
    tr_label.innerText = i.Id;

    const tr_x_common = document.createElement('td');
    tr_x_common.innerText = totalCommon.toFixed(2);

    const tr_x_uncommon = document.createElement('td');
    tr_x_uncommon.innerText = totalUncommon.toFixed(2);

    const tr_x_rare = document.createElement('td');
    tr_x_rare.innerText = totalRare.toFixed(2);

    const tr_x_eventepic = document.createElement('td');
    tr_x_eventepic.innerText = totalEventEpic.toFixed(2);

    const tr_x_legendary = document.createElement('td');
    tr_x_legendary.innerText = totalLegendary.toFixed(5);

    const tr_x_elixirmin = document.createElement('td');
    tr_x_elixirmin.innerText = softCurrencyMin;

    const tr_x_elixirmax = document.createElement('td');
    tr_x_elixirmax.innerText = softCurrencyMax;

    const tr_x_crown = document.createElement('td');
    tr_x_crown.innerText = leaderboardCurrency;

    tr.appendChild(tr_label);
    tr.appendChild(tr_x_common);
    tr.appendChild(tr_x_uncommon);
    tr.appendChild(tr_x_rare);
    tr.appendChild(tr_x_eventepic);
    tr.appendChild(tr_x_legendary);
    tr.appendChild(tr_x_elixirmin);
    tr.appendChild(tr_x_elixirmax);
    tr.appendChild(tr_x_crown);
    tbody.appendChild(tr);
  }

  thead.appendChild(thead_r1);
  table.appendChild(thead);
  table.appendChild(tbody);

  return table;
}

const processData = (data) => {
  globalState.data = data;

  let maxSubZone = 0;

  document.querySelector('#zoneId').innerHTML = '';
  document.querySelector('#subzoneId').innerHTML = '';

  for (let z in data["Zones"]) {
    const zoneId = data["Zones"][z]["Id"];
    
    const zoneElement = document.createElement('option');
    zoneElement.value = zoneId;
    zoneElement.innerText = zoneId;

    document.querySelector('#zoneId').appendChild(zoneElement);
    
    if (data["Zones"][z]["SubZones"].length > maxSubZone) {
      maxSubZone = data["Zones"][z]["SubZones"].length;
    }
  }
  
  for (let i = 0; i < maxSubZone; i++) {
    const subZoneElement = document.createElement('option');
    subZoneElement.value = i;
    subZoneElement.innerText = i+1;

    document.querySelector('#subzoneId').appendChild(subZoneElement);
  }

  selectTable();
}

const selectTable = () => {
  const selectedZoneId = document.querySelector('#zoneId').options[
    document.querySelector('#zoneId').selectedIndex
  ].value;
  const selectedSubZoneId = document.querySelector('#subzoneId').options[
    document.querySelector('#subzoneId').selectedIndex
  ].value;
  const selectedCardIncreaseRareLvl = document.querySelector('#cardIncreaseRareLvl').options[
    document.querySelector('#cardIncreaseRareLvl').selectedIndex
  ].value;

  for (let i of globalState.data.Zones) {
    if (i.Id === selectedZoneId) {
      for (let j of i.SubZones) {
        if (j.Id === selectedSubZoneId) {
          document.querySelector('#statusSuccess').classList.remove('d-none');
          document.querySelector('#statusFailure').classList.add('d-none');

          document.querySelector('#tableContainer').innerHTML = '';
          document.querySelector('#tableContainer').appendChild(createTable(
            globalState.data.GachaChests,
            j,
            selectedCardIncreaseRareLvl
          ));
          return;
        }
      }
    }
  };

  document.querySelector('#statusSuccess').classList.add('d-none');
  document.querySelector('#statusFailure').classList.remove('d-none');
}

document.querySelector('#inputFields').addEventListener('change', () => {
  selectTable();
});