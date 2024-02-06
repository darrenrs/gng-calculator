const FALLBACK_BALANCE_ID = 'evergreen';

const loadBalance = async(balanceId) => {
  // immediately set fallback if NULL
  if (!balanceId) {
    balanceId = FALLBACK_BALANCE_ID;
  }

  const data = await getMineshafts(balanceId);

  if (data["status"]) {
    document.querySelector('#errorText').classList.add('d-none');
    selectBalanceIdNavbar(balanceId);
    processData(data["content"]);
    return;
  } else if (data["content"] === 404) {
    const dataFallback = await getMineshafts(FALLBACK_BALANCE_ID);

    if (dataFallback["status"]) {
      document.querySelector('#errorText').classList.add('d-none');
      selectBalanceIdNavbar(FALLBACK_BALANCE_ID);
      processData(dataFallback["content"]);
    } else {
      document.querySelector('#errorText').innerText = `${dataFallback["content"]} error`;
      document.querySelector('#errorText').classList.remove('d-none');
    }
    return;
  }

  document.querySelector('#errorText').innerText = `${data["content"]} error`;
  document.querySelector('#errorText').classList.remove('d-none');
}

const getMineshafts = async(balanceId) => {
  return await fetch(`api/mineshaft?balance=${balanceId}`)
    .then(async (response) => {
      if (response.status === 200) {
        const content = await response.json()
        return {
          "status": true,
          "content": content
        };
      } else if (response.status === 404) {
        return {
          "status": false,
          "content": 404
        };
      } else {
        console.error(`Server error (${response.status})`);
        return {
          "status": false,
          "content": response.status
        };
      }
    })
    .catch((error) => {
      console.error(error);
      return {
        "status": false,
        "content": "Unknown"
      };
    })
}

const processData = (data) => {
  let minimumRowInterval = Infinity;
  let maximumTableLength = 0;

  for (let i of data) {
    let minInShaft = Math.min(...i["CountPerObjective"]);

    // first value is always one less because shaft levels begin at 1
    if (minInShaft === i["CountPerObjective"][0]) {
      minInShaft++;
    }

    if (minInShaft < minimumRowInterval) {
      minimumRowInterval = i["CountPerObjective"][1];
    }

    if (i["CostPerLevel"].length > maximumTableLength) {
      maximumTableLength = i["CostPerLevel"].length;
    }
  }
  
  const table = document.createElement('table');
  table.classList.add('table', 'table-striped', 'small', 'gng-mineshaft-table');

  const thead = document.createElement('thead');
  const thead_r1 = document.createElement('tr');
  const thead_r2 = document.createElement('tr');
  const tbody = document.createElement('tbody');

  // create table header
  const numberCol = document.createElement('th');
  numberCol.rowSpan = 2;
  numberCol.innerHTML = '&nbsp;';
  thead_r1.appendChild(numberCol);

  for (let i of data) {
    const name = document.createElement('th');
    name.innerText = i["Id"]
    name.colSpan = 2;

    const priceLabel = document.createElement('th');
    priceLabel.innerText = 'Price';

    const multiplierLabel = document.createElement('th');
    multiplierLabel.innerText = 'Multiplier';

    thead_r1.appendChild(name);
    thead_r2.appendChild(priceLabel);
    thead_r2.appendChild(multiplierLabel);
  }

  document.querySelector('#mineshaftTableContainer').appendChild(table);

  const levelsProcessed = [];
  const objectivesProcessed = [];
  for (let _ of data) {
    levelsProcessed.push(1);
    objectivesProcessed.push(0);
  }

  for (let i = minimumRowInterval; i <= maximumTableLength; i += minimumRowInterval) {
    const tr = document.createElement('tr');
    const n = document.createElement('td');
    n.innerText = i;

    tr.append(n);

    for (let jx = 0; jx < data.length; jx++) {
      const j = data[jx];
      const price = document.createElement('td');
      const multiplier = document.createElement('td');
      
      if (levelsProcessed[jx] + j["CountPerObjective"][objectivesProcessed[jx]] !== i || levelsProcessed[jx] + j["CountPerObjective"][objectivesProcessed[jx]] > j["CostPerLevel"].length) {
        price.innerText = '-';
        multiplier.innerText = '-';
      } else {
        const priceActual = j["CostPerLevel"].slice(i - j["CountPerObjective"][1], i).reduce((partialSum, a) => partialSum + a, 0);
        
        if (isNaN(priceActual) || priceActual === Infinity) {
          price.innerText = '-';
          multiplier.innerText = '-';
        } else {
          price.innerText = numberFormat(priceActual);

          const multiplierActual = j["MultiplierPerObjective"][objectivesProcessed[jx]];
          multiplier.innerText = multiplierActual.toLocaleString();

          if (multiplierActual > 100) {
            multiplier.classList.add('table-warning');
          }
        }

        levelsProcessed[jx] += j["CountPerObjective"][objectivesProcessed[jx]];
        objectivesProcessed[jx]++;
      }

      tr.append(price);
      tr.append(multiplier);
    }

    tbody.append(tr);
  }

  thead.appendChild(thead_r1);
  thead.appendChild(thead_r2);
  table.appendChild(thead);
  table.appendChild(tbody);

  // remove original entry if exists
  while (document.querySelectorAll('.gng-mineshaft-table').length > 1) {
    document.querySelectorAll('.gng-mineshaft-table')[0].remove();
  }
}

const selectBalanceIdNavbar = (balanceId) => {
  for (let i of document.querySelectorAll('.nav-item')) {
    if (i.getAttribute('data-balance') === balanceId) {
      i.classList.add('active');
    } else {
      i.classList.remove('active');
    }
  }
}

const numberFormat = (n) => {
  if (typeof n !== 'number') {
    return NaN;
  } else if (n < 1e+5) {
    return parseInt((Math.floor(n).toFixed(0))).toLocaleString();
  }

  let b1000 = Math.floor(Math.log(n) / Math.log(1000)); // power of 1000 needed to represent the number
  let b1000_formatted = (Math.floor((n / Math.pow(1000, b1000)).toFixed(4) * 100)/100).toFixed(2);

  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const b1000_override = [
    "N/A",
    "K",
    "M",
    "B",
    "T"
  ];

  let suffix;
  if (b1000 < b1000_override.length) {
    suffix = b1000_override[b1000];
  } else {
    let index = b1000 - b1000_override.length;
    suffix = alpha[Math.floor(index / 26)] + alpha[index % 26];
  }

  return b1000_formatted + ' ' + suffix;
}

window.addEventListener('hashchange', () => {
  const fragment = window.location.hash.substring(1);
  loadBalance(fragment);
});

window.addEventListener('load', async () => {
  const fragment = window.location.hash.substring(1);
  loadBalance(fragment);
});