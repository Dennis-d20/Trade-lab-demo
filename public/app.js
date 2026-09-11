const STARTING_BALANCE = 10000;
const FEE_RATE = 0.001;

const markets = {
  "BTC/USD": 67420,
  "ETH/USD": 3520,
  "SOL/USD": 154,
  "EUR/USD": 1.172
};

let state = JSON.parse(localStorage.getItem("tradelabState")) || {
  balance: STARTING_BALANCE,
  positions: [],
  history: []
};

let selectedMarket = "BTC/USD";
let side = "BUY";
let prices = {};
let chartData = {};

Object.keys(markets).forEach((market) => {
  prices[market] = markets[market];
  chartData[market] = Array.from({ length: 40 }, (_, i) => {
    return markets[market] * (1 + (Math.random() - 0.5) * 0.02);
  });
});

const $ = (id) => document.getElementById(id);

function money(value) {
  return "$" + Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function save() {
  localStorage.setItem("tradelabState", JSON.stringify(state));
}

function getUnrealizedPnL() {
  return state.positions.reduce((total, position) => {
    const current = prices[position.market];
    const difference =
      position.side === "BUY"
        ? current - position.entry
        : position.entry - current;

    return total + (difference / position.entry) * position.amount;
  }, 0);
}

function updateStats() {
  const pnl = getUnrealizedPnL();
  const equity = state.balance + pnl;

  $("balance").textContent = money(state.balance);
  $("equity").textContent = money(equity);
  $("pnl").textContent = money(pnl);
  $("pnl").className = pnl >= 0 ? "positive" : "negative";
  $("positionCount").textContent = state.positions.length;
}

function updateMarketDisplay() {
  const price = prices[selectedMarket];

  $("marketTitle").textContent = selectedMarket;
  $("currentPrice").textContent = money(price);
  $("orderPrice").textContent = money(price);

  const previous =
    chartData[selectedMarket][chartData[selectedMarket].length - 2] || price;

  const change = ((price - previous) / previous) * 100;

  $("priceChange").textContent =
    (change >= 0 ? "+" : "") + change.toFixed(2) + "%";

  $("priceChange").className =
    change >= 0 ? "positive" : "negative";

  const amount = Number($("amount").value) || 0;
  $("fee").textContent = money(amount * FEE_RATE);

  $("placeOrder").textContent =
    `${side} ${selectedMarket}`;

  $("placeOrder").className =
    side === "SELL"
      ? "primary-button sell-mode"
      : "primary-button";
}

function drawChart() {
  const canvas = $("chart");
  const ctx = canvas.getContext("2d");

  const width = canvas.clientWidth || 700;
  const height = 300;

  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.clearRect(0, 0, width, height);

  const data = chartData[selectedMarket];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  ctx.strokeStyle = "#33404d";
  ctx.lineWidth = 1;

  for (let i = 1; i < 5; i++) {
    const y = (height / 5) * i;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#55c982";
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 20) - 10;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

function renderPositions() {
  const body = $("positionsBody");

  if (!state.positions.length) {
    body.innerHTML =
      `<tr><td colspan="7" class="empty">No open positions</td></tr>`;
    return;
  }

  body.innerHTML = state.positions
    .map((position) => {
      const current = prices[position.market];

      const pnl =
        position.side === "BUY"
          ? ((current - position.entry) / position.entry) * position.amount
          : ((position.entry - current) / position.entry) * position.amount;

      return `
        <tr>
          <td>${position.market}</td>
          <td class="${position.side === "BUY" ? "positive" : "negative"}">
            ${position.side}
          </td>
          <td>${money(position.amount)}</td>
          <td>${money(position.entry)}</td>
          <td>${money(current)}</td>
          <td class="${pnl >= 0 ? "positive" : "negative"}">
            ${money(pnl)}
          </td>
          <td>
            <button class="close-button" onclick="closePosition('${position.id}')">
              Close
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderHistory() {
  const body = $("historyBody");

  if (!state.history.length) {
    body.innerHTML =
      `<tr><td colspan="6" class="empty">No trades yet</td></tr>`;
    return;
  }

  body.innerHTML = state.history
    .slice()
    .reverse()
    .map((trade) => {
      return `
        <tr>
          <td>${trade.time}</td>
          <td>${trade.market}</td>
          <td>${trade.action}</td>
          <td>${money(trade.amount)}</td>
          <td>${money(trade.price)}</td>
          <td class="${trade.result >= 0 ? "positive" : "negative"}">
            ${trade.result === null ? "Open" : money(trade.result)}
          </td>
        </tr>
      `;
    })
    .join("");
}

function placeOrder() {
  const amount = Number($("amount").value);

  if (!amount || amount <= 0) {
    alert("Enter a valid trade amount.");
    return;
  }

  const fee = amount * FEE_RATE;

  if (amount + fee > state.balance) {
    alert("Insufficient demo balance.");
    return;
  }

  const position = {
    id: Date.now().toString(),
    market: selectedMarket,
    side,
    amount,
    entry: prices[selectedMarket]
  };

  state.balance -= amount + fee;

  state.positions.push(position);

  state.history.push({
    time: new Date().toLocaleString(),
    market: selectedMarket,
    action: side,
    amount,
    price: prices[selectedMarket],
    result: null
  });

  save();
  render();
}

function closePosition(id) {
  const index = state.positions.findIndex(
    (position) => position.id === id
  );

  if (index === -1) return;

  const position = state.positions[index];
  const current = prices[position.market];

  const pnl =
    position.side === "BUY"
      ? ((current - position.entry) / position.entry) * position.amount
      : ((position.entry - current) / position.entry) * position.amount;

  const fee = position.amount * FEE_RATE;

  state.balance += position.amount + pnl - fee;

  const historyItem = state.history.find(
    (trade) =>
      trade.market === position.market &&
      trade.action === position.side &&
      trade.amount === position.amount &&
      trade.result === null
  );

  if (historyItem) {
    historyItem.result = pnl - fee;
  }

  state.positions.splice(index, 1);

  save();
  render();
}

window.closePosition = closePosition;

function resetAccount() {
  if (!confirm("Reset the demo account and delete all trades?")) {
    return;
  }

  state = {
    balance: STARTING_BALANCE,
    positions: [],
    history: []
  };

  save();
  render();
}

function render() {
  updateStats();
  updateMarketDisplay();
  renderPositions();
  renderHistory();
  drawChart();
}

$("marketSelect").addEventListener("change", (event) => {
  selectedMarket = event.target.value;
  render();
});

$("buyBtn").addEventListener("click", () => {
  side = "BUY";
  $("buyBtn").classList.add("active");
  $("sellBtn").classList.remove("active");
  render();
});

$("sellBtn").addEventListener("click", () => {
  side = "SELL";
  $("sellBtn").classList.add("active");
  $("buyBtn").classList.remove("active");
  render();
});

$("amount").addEventListener("input", updateMarketDisplay);

document.querySelectorAll(".quick-buttons button").forEach((button) => {
  button.addEventListener("click", () => {
    $("amount").value = button.dataset.amount;
    updateMarketDisplay();
  });
});

$("placeOrder").addEventListener("click", placeOrder);

$("resetAccount").addEventListener("click", resetAccount);

$("clearHistory").addEventListener("click", () => {
  state.history = [];
  save();
  renderHistory();
});

window.addEventListener("resize", drawChart);

setInterval(() => {
  Object.keys(prices).forEach((market) => {
    const movement = (Math.random() - 0.5) * 0.003;

    prices[market] *= 1 + movement;

    chartData[market].push(prices[market]);

    if (chartData[market].length > 60) {
      chartData[market].shift();
    }
  });

  render();
}, 1400);

render();
