const endpointId = 'mineshaft';

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

  document.querySelector('#tableContainer').appendChild(table);

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
            multiplier.classList.add('bg-danger');
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

