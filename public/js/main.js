const FALLBACK_BALANCE_ID = 'evergreen';

// Basic check, can't really do much more because it's a public file
const getApiBaseUrl = () => {
  if (window.location.hostname === 'localhost') {
    return '/api';
  }
  
  return 'https://darrenskidmore.com/gng-calculator/api';
};
const apiUrl = getApiBaseUrl();

const get_balance_ids = async () => {
  return await fetch(`${apiUrl}/event/all`)
    .then(async (response) => {
      if (response.status === 200) {
        const data = await response.json()
        return {
          "status": true,
          "content": data
        };
      } else {
        console.error(`Server error (${response.status})`);
        return {
          "status": false,
          "content": response.status
        };
      }
    }
    )
    .catch((error) => {
      console.error(error);
      return {
        "status": false,
        "content": "Unknown"
      };
    }
    )
}

const loadBalance = async (balanceId) => {
  // immediately set fallback if NULL
  if (!balanceId) {
    balanceId = FALLBACK_BALANCE_ID;
  }

  const data = await getData(balanceId);

  if (data["status"]) {
    document.querySelector('#errorText').classList.add('d-none');
    selectBalanceIdNavbar(balanceId);
    processData(data["content"]);
    return;
  } else if (data["content"] === 404) {
    const dataFallback = await getData(FALLBACK_BALANCE_ID);

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

const getData = async (balanceId) => {
  return await fetch(`${apiUrl}/${endpointId}?balance=${balanceId}`)
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

const selectBalanceIdNavbar = (balanceId) => {
  for (let i of document.querySelectorAll('.nav-item')) {
    if (i.getAttribute('data-balance') === balanceId) {
      i.children[0].classList.add('active');
    } else {
      i.children[0].classList.remove('active');
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
  let b1000_formatted = (Math.floor((n / Math.pow(1000, b1000)).toFixed(4) * 100) / 100).toFixed(2);

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
  get_balance_ids().then((data) => {
    if (data["status"]) {
      for (let i of data["content"]) {
        const li = document.createElement('li');
        li.classList.add('nav-item');
        li.setAttribute('data-balance', i);
        li.innerHTML = `<a class="nav-link" href="#${i}">${i.charAt(0).toUpperCase() + i.slice(1)}</a>`;
        document.querySelector('.navbar-nav').appendChild(li);
      }

      // the navbar might not be ready before the highlighter loads 
      selectBalanceIdNavbar(fragment);
    } else {
      document.querySelector('#errorText').innerText = `${data["content"]} error`;
      document.querySelector('#errorText').classList.remove('d-none');
    }
  }
  );
});