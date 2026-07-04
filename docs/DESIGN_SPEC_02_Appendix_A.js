// DO NOT USE THIS FILE, THIS IS ONLY FOR REFERENCE
const tableDelivery = document.createElement("table");
tableDelivery.classList.add("table", "table-dark", "table-sm", "mb-3");

tableDelivery.innerHTML = `
  <thead>
    <tr>
      <th>Id</th>
      <th>Reward</th>
      <th>Weight</th>
      <th>Obtained</th>
      <th>Total</th>
    </tr>
  </thead>
`;
const tableDeliveryBody = document.createElement("tbody");

for (let j of i["DeliveryData"]["Deliveries"]["Data"]) {
  const tableDeliveryRow = document.createElement("tr");

  tableDeliveryRow.innerHTML = `
    <td>${j["Id"]}</td>
    <td>${j["DeliveryName"]}</td>
    <td>${j["Weight"]}</td>
    <td>${j["Count"]}</td>
    <td>${j["Total"]}</td>
  `;

  tableDeliveryBody.appendChild(tableDeliveryRow);
}

const tableDeliveryRowSum = document.createElement("tr");

tableDeliveryRowSum.innerHTML = `
  <td colspan=3>All Deliveries</td>
  <td>${i["DeliveryData"]["Deliveries"]["Obtained"]}</td>
  <td>${i["DeliveryData"]["Deliveries"]["Total"]}</td>
`;
tableDeliveryBody.appendChild(tableDeliveryRowSum);

tableDelivery.appendChild(tableDeliveryBody);

worldContainer.appendChild(tableDelivery);

allContainer.appendChild(worldContainer);
