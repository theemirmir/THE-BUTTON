(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    const hint = document.getElementById("enter-hint");
    if (hint) hint.textContent = "FAILED TO LOAD 3D ENGINE";
    return;
  }

  const HIGH_SCORE_KEY = "the-button-high-pulses";
  const FAIR_STATS_KEY = "the-button-fair-stats";
  const RUN_SAVE_KEY = "the-button-active-run";
  const ASCEND_KEY = "the-button-ascend";
  const SERVERS_KEY = "the-button-servers";
  const PLAYER_NAME_KEY = "the-button-player-name";
  const PLAYER_ID_KEY = "the-button-player-id";
  const LEADERBOARD_KEY = "the-button-leaderboard";
  // Live shared board (dreamlo). Browser calls go through HTTPS proxies because
  // dreamlo itself is HTTP-only and gets blocked as "own score only" otherwise.
  const DREAMLO_PRIVATE = "YCEoF2ZMqEmDZbeKNKEEFAwXGR8Ki-DEWL81BuZ1XuBg";
  const DREAMLO_PUBLIC = "6ae4b4408f40bb201434c97c";
  const DREAMLO_ADD =
    "http://dreamlo.com/lb/" + DREAMLO_PRIVATE + "/add/";
  const DREAMLO_JSON =
    "http://dreamlo.com/lb/" + DREAMLO_PUBLIC + "/json";
  const DREAMLO_JSONP =
    "http://dreamlo.com/lb/" + DREAMLO_PUBLIC + "/json-jsonp";

  const canvas = document.getElementById("scene");
  const gamePane = document.getElementById("game-pane");
  const shopPanel = document.getElementById("shop-panel");
  const splitHandle = document.getElementById("split-handle");
  const coinCountEl = document.getElementById("coin-count");
  const pulseCountEl = document.getElementById("pulse-count");
  const bestCountEl = document.getElementById("best-count");
  const oddsDisplayEl = document.getElementById("odds-display");
  const highScoreEl = document.getElementById("high-score");
  const fairLineEl = document.getElementById("fair-line");
  const promptEl = document.getElementById("prompt");
  const hudStats = document.getElementById("hud-stats");
  const deathOverlay = document.getElementById("death-overlay");
  const deathCoinsEl = document.getElementById("death-coins");
  const retryBtn = document.getElementById("retry-btn");
  const coinFlash = document.getElementById("coin-flash");
  const titleScreen = document.getElementById("title-screen");
  const enterWipe = document.getElementById("enter-wipe");
  const enterHint = document.getElementById("enter-hint");
  const shopDeathOddsEl = document.getElementById("shop-death-odds");
  const shopCoinOddsEl = document.getElementById("shop-coin-odds");
  const shopUpgradePreviewEl = document.getElementById("shop-upgrade-preview");
  const shopStrengthPreviewEl = document.getElementById("shop-strength-preview");
  const shopAutoPreviewEl = document.getElementById("shop-auto-preview");
  const shopEffectivenessPreviewEl = document.getElementById(
    "shop-effectiveness-preview"
  );
  const shopAscendPreviewEl = document.getElementById("shop-ascend-preview");
  const shopBuyBtn = document.getElementById("shop-buy-btn");
  const shopStrengthBtn = document.getElementById("shop-strength-btn");
  const shopAutoBtn = document.getElementById("shop-auto-btn");
  const shopEffectivenessBtn = document.getElementById("shop-effectiveness-btn");
  const shopAscendBtn = document.getElementById("shop-ascend-btn");
  const shopBuyMsg = document.getElementById("shop-buy-msg");
  const autoCountEl = document.getElementById("auto-count");
  const deathPulsesEl = document.getElementById("death-pulses");
  const deathCodeEl = document.getElementById("death-code");
  const deathTitleEl = document.getElementById("death-title");
  const deathSubEl = document.getElementById("death-sub");
  const buyQtyBar = document.getElementById("buy-qty");
  const hookOverlay = document.getElementById("hook-overlay");
  const ascendLineEl = document.getElementById("ascend-line");
  const serversBtn = document.getElementById("servers-btn");
  const serversPanel = document.getElementById("servers-panel");
  const serversList = document.getElementById("servers-list");
  const serversEmpty = document.getElementById("servers-empty");
  const serversClose = document.getElementById("servers-close");
  const enterGameBtn = document.getElementById("enter-game-btn");
  const mainMenuBtn = document.getElementById("main-menu-btn");
  const leaderboardBtn = document.getElementById("leaderboard-btn");
  const leaderboardPanel = document.getElementById("leaderboard-panel");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardEmpty = document.getElementById("leaderboard-empty");
  const leaderboardClose = document.getElementById("leaderboard-close");
  const leaderboardSub = document.getElementById("leaderboard-sub");
  const changeNameBtn = document.getElementById("change-name-btn");
  const nameGate = document.getElementById("name-gate");
  const nameInput = document.getElementById("name-input");
  const nameConfirmBtn = document.getElementById("name-confirm-btn");
  const nameGateError = document.getElementById("name-gate-error");
  const playerLineEl = document.getElementById("player-line");

  const BASE_UPGRADE_COST = 5;
  const BASE_STRENGTH_COST = 25;
  const BASE_AUTO_COST = 50;
  const BASE_EFFECTIVENESS_COST = 500;
  const BASE_ASCEND_COST = 200;
  const BASE_DEATH_CHANCE = 0.1;

  let coins = 0;
  let pulses = 0;
  let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
  if (!Number.isFinite(highScore)) highScore = 0;
  let alive = true;
  let pressing = false;
  let resolving = false;
  let inGame = false;
  let entering = false;
  let buttonAppear = 0;
  let shopOpen = false;
  let deathChance = BASE_DEATH_CHANCE;
  let nextUpgradeCost = BASE_UPGRADE_COST;
  let upgradeLevel = 0;
  let buttonStrength = 0;
  let strengthCoinBonus = 0;
  let nextStrengthCost = BASE_STRENGTH_COST;
  let autoClicksPerSec = 0;
  let nextAutoCost = BASE_AUTO_COST;
  let effectiveness = 0;
  let nextEffectivenessCost = BASE_EFFECTIVENESS_COST;
  let buyQty = 1;
  let autoTimer = null;
  let shopWidthPct = 34;
  let buttonShiftX = 0;
  let buttonShiftTarget = 0;
  let resizingSplit = false;
  let rollBag = [];
  let ascending = false;
  let currentServerId = null;
  let playerName = (localStorage.getItem(PLAYER_NAME_KEY) || "").trim();

  let ascendLevel = 0;
  let ascendCoinBonus = 0;
  let nextAscendCost = BASE_ASCEND_COST;
  try {
    const savedAscend = JSON.parse(localStorage.getItem(ASCEND_KEY) || "{}");
    if (Number.isFinite(savedAscend.level)) ascendLevel = savedAscend.level | 0;
    if (Number.isFinite(savedAscend.bonus)) {
      ascendCoinBonus = Number(savedAscend.bonus);
    } else {
      ascendCoinBonus = ascendLevel;
    }
    if (Number.isFinite(savedAscend.cost) && savedAscend.cost > 0) {
      nextAscendCost = savedAscend.cost;
    } else {
      nextAscendCost = BASE_ASCEND_COST * Math.pow(2, ascendLevel);
    }
  } catch (err) {
    ascendLevel = 0;
    ascendCoinBonus = 0;
    nextAscendCost = BASE_ASCEND_COST;
  }

  function saveAscend() {
    localStorage.setItem(
      ASCEND_KEY,
      JSON.stringify({
        level: ascendLevel,
        bonus: ascendCoinBonus,
        cost: nextAscendCost,
      })
    );
    updateAscendLine();
  }

  function formatEffMult(n) {
    const s = Number(n).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return s || "1";
  }

  function effectivenessPower() {
    // Each Effectiveness level multiplies FUTURE upgrade power by 1.5 (not itself).
    return Math.pow(1.5, effectiveness);
  }

  function nextStrengthGain() {
    return 2 * effectivenessPower();
  }

  function nextAutoGain() {
    return effectivenessPower();
  }

  function nextAscendGain() {
    // Ascension is never scaled by Effectiveness.
    return 1;
  }

  function oddsDivisorPerBuy() {
    // Base ÷2, scaled by current Effectiveness (e.g. ×1.5 → ÷3)
    return 2 * effectivenessPower();
  }

  function autoClickRate() {
    return autoClicksPerSec;
  }

  function updateAscendLine() {
    if (ascendLineEl) {
      ascendLineEl.textContent =
        "ASCENSION LEVEL " +
        ascendLevel +
        " · BASE " +
        formatEffMult(1 + ascendCoinBonus) +
        " COIN / CLICK" +
        (effectiveness > 0
          ? " · NEXT NON-ASCEND ×" + formatEffMult(effectivenessPower())
          : "");
    }
  }

  function coinsPerClick() {
    // Bonuses are locked in at purchase time — Effectiveness is not retroactive.
    return 1 + ascendCoinBonus + strengthCoinBonus;
  }

  function normalizeName(raw) {
    return String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);
  }

  function hasPlayerName() {
    return normalizeName(playerName).length > 0;
  }

  function getPlayerId() {
    let id = "";
    try {
      id = String(localStorage.getItem(PLAYER_ID_KEY) || "");
    } catch (err) {
      id = "";
    }
    if (!/^op[a-z0-9]{10,40}$/i.test(id)) {
      id =
        "op" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      try {
        localStorage.setItem(PLAYER_ID_KEY, id);
      } catch (err) {
        /* ignore */
      }
    }
    return id;
  }

  let leaderboardPollTimer = 0;

  function updatePlayerLine() {
    if (playerLineEl) {
      playerLineEl.textContent = hasPlayerName()
        ? "OPERATOR · " + playerName.toUpperCase()
        : "OPERATOR · ???";
    }
  }

  function sortLeaderboard(list) {
    return (list || []).slice().sort(function (a, b) {
      return (b.pulses | 0) - (a.pulses | 0);
    });
  }

  function saveLeaderboardCache(list) {
    try {
      localStorage.setItem(
        LEADERBOARD_KEY,
        JSON.stringify(sortLeaderboard(list).slice(0, 100))
      );
    } catch (err) {
      /* ignore */
    }
  }

  function loadLeaderboardCache() {
    try {
      const list = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function bustUrl(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now();
  }

  function proxyUrls(targetUrl) {
    const inner = bustUrl(targetUrl);
    return [
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(inner),
      "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(inner),
    ];
  }

  function fetchTextFirstOk(urls) {
    let chain = Promise.reject(new Error("no urls"));
    urls.forEach(function (url) {
      chain = chain.catch(function () {
        return fetch(url, { method: "GET", mode: "cors", cache: "no-store" }).then(
          function (res) {
            if (!res.ok) throw new Error("http " + res.status);
            return res.text();
          }
        );
      });
    });
    return chain;
  }

  function parseDreamloEntries(data) {
    try {
      if (typeof data === "string") {
        data = JSON.parse(data);
      }
      const board = data && data.dreamlo && data.dreamlo.leaderboard;
      if (!board || !board.entry) return [];
      const raw = board.entry;
      const arr = Array.isArray(raw) ? raw : [raw];
      return arr
        .map(function (row) {
          const id = String(row.name || "").trim();
          if (!id) return null;
          const fromText = normalizeName(row.text);
          const label =
            fromText ||
            (/^op[a-z0-9]+$/i.test(id) ? "OPERATOR" : normalizeName(id)) ||
            "OPERATOR";
          return {
            id: id,
            name: label,
            pulses: Math.max(0, parseInt(row.score, 10) || 0),
            date: String(row.date || ""),
          };
        })
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function submitScoreOnline(pulsesValue) {
    const clean = normalizeName(playerName);
    const score = Math.max(0, pulsesValue | 0);
    const id = getPlayerId();
    if (!clean || score <= 0 || !id) return Promise.resolve(false);
    const direct =
      DREAMLO_ADD +
      encodeURIComponent(id) +
      "/" +
      encodeURIComponent(String(score)) +
      "/0/" +
      encodeURIComponent(clean);

    const attempts = [direct].concat(proxyUrls(direct));
    return fetchTextFirstOk(attempts)
      .then(function () {
        return true;
      })
      .catch(function () {
        try {
          const img = new Image();
          img.src = bustUrl(direct);
        } catch (err) {
          /* ignore */
        }
        return false;
      });
  }

  function fetchOnlineLeaderboardJsonp() {
    return new Promise(function (resolve, reject) {
      const cbName = "_tbLb" + Date.now();
      let settled = false;
      const script = document.createElement("script");
      const timer = setTimeout(function () {
        finish(null, new Error("jsonp timeout"));
      }, 8000);

      function finish(data, err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          delete window[cbName];
        } catch (e) {
          window[cbName] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
        if (err) reject(err);
        else resolve(parseDreamloEntries(data));
      }

      window[cbName] = function (data) {
        finish(data, null);
      };
      script.onerror = function () {
        finish(null, new Error("jsonp failed"));
      };
      script.src = bustUrl(
        DREAMLO_JSONP + "?jsonp=" + encodeURIComponent(cbName)
      );
      document.head.appendChild(script);
    });
  }

  function fetchOnlineLeaderboard() {
    const direct = bustUrl(DREAMLO_JSON);
    return fetchTextFirstOk([direct].concat(proxyUrls(DREAMLO_JSON)))
      .then(function (text) {
        return parseDreamloEntries(text);
      })
      .catch(function () {
        return fetchOnlineLeaderboardJsonp();
      });
  }

  function updateLeaderboardScore() {
    if (!hasPlayerName()) return Promise.resolve(false);
    const score = Math.max(0, highScore | 0);
    if (score <= 0) return Promise.resolve(false);
    return submitScoreOnline(score);
  }

  function renderLeaderboard(list, statusText) {
    if (!leaderboardList) return;
    const rows = sortLeaderboard(list);
    const myId = getPlayerId();
    leaderboardList.innerHTML = "";
    if (leaderboardEmpty) leaderboardEmpty.hidden = rows.length > 0;
    if (leaderboardSub) {
      leaderboardSub.textContent =
        statusText ||
        "ALL PLAYERS · OTHER BROWSERS/DEVICES SHOW HERE";
    }
    rows.forEach(function (entry, i) {
      const row = document.createElement("div");
      const isYou = entry.id && entry.id === myId;
      row.className = "lb-row" + (isYou ? " is-you" : "");

      const rank = document.createElement("div");
      rank.className = "lb-rank";
      rank.textContent = String(i + 1);

      const meta = document.createElement("div");
      meta.className = "lb-meta";

      const nameEl = document.createElement("div");
      nameEl.className = "lb-name";
      nameEl.textContent =
        String(entry.name || "UNKNOWN").toUpperCase() + (isYou ? " · YOU" : "");

      const dateEl = document.createElement("div");
      dateEl.className = "lb-date";
      dateEl.textContent = entry.date
        ? "UPDATED · " + entry.date
        : "LIVE RECORD";

      meta.appendChild(nameEl);
      meta.appendChild(dateEl);

      const score = document.createElement("div");
      score.className = "lb-score";
      score.textContent = formatCoins(entry.pulses | 0);

      row.appendChild(rank);
      row.appendChild(meta);
      row.appendChild(score);
      leaderboardList.appendChild(row);
    });
  }

  function refreshLeaderboardView() {
    return fetchOnlineLeaderboard()
      .then(function (online) {
        saveLeaderboardCache(online);
        const n = online.length;
        renderLeaderboard(
          online,
          n
            ? "LIVE · " +
                n +
                " PLAYER" +
                (n === 1 ? "" : "S") +
                " · RENAME ≠ NEW ACCOUNT"
            : "LIVE · NO SCORES YET — PLAY, THEN REOPEN"
        );
        return online;
      })
      .catch(function () {
        const cached = loadLeaderboardCache();
        renderLeaderboard(
          cached,
          cached.length
            ? "OFFLINE CACHE · COULD NOT REACH GLOBAL BOARD"
            : "COULD NOT REACH LIVE BOARD"
        );
        return cached;
      });
  }

  function openLeaderboard() {
    if (!hasPlayerName()) {
      openNameGate(true);
      return;
    }
    closeServersPanel();
    if (leaderboardPanel) leaderboardPanel.hidden = false;
    renderLeaderboard(loadLeaderboardCache(), "UPLOADING + SYNCING ALL PLAYERS…");

    updateLeaderboardScore()
      .catch(function () {
        return false;
      })
      .then(function () {
        return refreshLeaderboardView();
      });

    if (leaderboardPollTimer) clearInterval(leaderboardPollTimer);
    leaderboardPollTimer = setInterval(function () {
      if (!leaderboardPanel || leaderboardPanel.hidden) return;
      refreshLeaderboardView();
    }, 5000);
  }

  function closeLeaderboard() {
    if (leaderboardPanel) leaderboardPanel.hidden = true;
    if (leaderboardPollTimer) {
      clearInterval(leaderboardPollTimer);
      leaderboardPollTimer = 0;
    }
  }

  function openNameGate(force) {
    if (!nameGate) return;
    if (!force && hasPlayerName()) return;
    nameGate.hidden = false;
    if (nameInput) {
      nameInput.value = playerName || "";
      setTimeout(function () {
        nameInput.focus();
        nameInput.select();
      }, 50);
    }
    if (nameGateError) nameGateError.textContent = "";
  }

  function closeNameGate() {
    if (nameGate) nameGate.hidden = true;
  }

  function confirmPlayerName() {
    const next = normalizeName(nameInput ? nameInput.value : "");
    if (!next) {
      if (nameGateError) nameGateError.textContent = "NAME REQUIRED";
      return false;
    }
    if (!/^[a-zA-Z0-9 _.\-]+$/.test(next)) {
      if (nameGateError) {
        nameGateError.textContent = "USE LETTERS, NUMBERS, SPACES ONLY";
      }
      return false;
    }
    playerName = next;
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
    updatePlayerLine();
    updateLeaderboardScore();
    closeNameGate();
    if (enterHint) enterHint.textContent = "SAVED RUNS APPEAR UNDER SERVERS";
    return true;
  }

  function ensureNamedOrGate() {
    if (hasPlayerName()) return true;
    openNameGate(true);
    if (nameGateError) nameGateError.textContent = "ENTER A NAME TO PLAY";
    return false;
  }

  /** Sum of start + 2*start + 4*start + ... for n buys (exact sequential prices) */
  function bulkCost(startCost, n) {
    if (n <= 0) return 0;
    let total = 0;
    let cost = startCost;
    for (let i = 0; i < n; i++) {
      total += cost;
      if (!Number.isFinite(total)) return Infinity;
      cost *= 2;
      if (!Number.isFinite(cost) && i < n - 1) return Infinity;
    }
    return total;
  }

  function canAfford(total) {
    return Number.isFinite(total) && coins >= total;
  }

  function formatCoins(n) {
    if (!Number.isFinite(n)) return "∞";
    if (n >= 1e15) return n.toExponential(2).replace(/e\+?/, "e");
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n));
  }

  function stopAutoClicker() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function syncAutoClicker() {
    stopAutoClicker();
    const rate = autoClickRate();
    if (!inGame || !alive || rate <= 0) return;
    const ms = Math.max(16, 1000 / rate);
    autoTimer = setInterval(function () {
      if (!inGame || !alive || resolving || pressing) return;
      performPress(true);
    }, ms);
  }

  function buildRunSnapshot() {
    return {
      coins: coins,
      pulses: pulses,
      alive: alive,
      deathChance: deathChance,
      nextUpgradeCost: nextUpgradeCost,
      upgradeLevel: upgradeLevel,
      buttonStrength: buttonStrength,
      strengthCoinBonus: strengthCoinBonus,
      nextStrengthCost: nextStrengthCost,
      autoClicksPerSec: autoClicksPerSec,
      nextAutoCost: nextAutoCost,
      effectiveness: effectiveness,
      nextEffectivenessCost: nextEffectivenessCost,
      buyQty: buyQty,
      shopOpen: shopOpen,
      shopWidthPct: shopWidthPct,
      rollBag: rollBag,
      shopMsg: shopBuyMsg ? shopBuyMsg.textContent : "",
      shopMsgOk: shopBuyMsg ? shopBuyMsg.classList.contains("is-ok") : false,
      serverId: currentServerId,
    };
  }

  function saveActiveRun() {
    if (!inGame) return;
    try {
      localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(buildRunSnapshot()));
    } catch (err) {
      /* quota / private mode */
    }
  }

  function clearActiveRun() {
    try {
      localStorage.removeItem(RUN_SAVE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function readActiveRun() {
    try {
      const raw = localStorage.getItem(RUN_SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.coins !== "number") return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function loadServers() {
    try {
      const list = JSON.parse(localStorage.getItem(SERVERS_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function saveServers(list) {
    try {
      localStorage.setItem(SERVERS_KEY, JSON.stringify(list.slice(0, 24)));
    } catch (err) {
      /* ignore */
    }
  }

  function makeServerName(run) {
    return (
      "FACTORY · " +
      (run.pulses | 0) +
      "P / " +
      formatCoins(run.coins | 0) +
      "C"
    );
  }

  function upsertServerFromCurrentRun() {
    const snapshot = buildRunSnapshot();
    const list = loadServers();
    const now = Date.now();
    if (currentServerId) {
      const idx = list.findIndex(function (s) {
        return s.id === currentServerId;
      });
      if (idx >= 0) {
        list[idx].run = snapshot;
        list[idx].name = makeServerName(snapshot);
        list[idx].savedAt = now;
        saveServers(list);
        return list[idx];
      }
    }
    const server = {
      id: "srv-" + now + "-" + Math.random().toString(36).slice(2, 7),
      name: makeServerName(snapshot),
      savedAt: now,
      run: snapshot,
    };
    list.unshift(server);
    saveServers(list);
    currentServerId = server.id;
    return server;
  }

  function removeServer(id) {
    if (!id) return;
    saveServers(
      loadServers().filter(function (s) {
        return s.id !== id;
      })
    );
  }

  function renderServersList() {
    if (!serversList) return;
    const list = loadServers();
    serversList.innerHTML = "";
    if (serversEmpty) serversEmpty.hidden = list.length > 0;
    list.forEach(function (server) {
      const row = document.createElement("div");
      row.className = "server-row";

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "server-name";
      name.textContent = server.name || "UNKNOWN SIGNAL";
      const meta = document.createElement("span");
      meta.className = "server-meta";
      const when = server.savedAt
        ? new Date(server.savedAt).toLocaleString()
        : "";
      meta.textContent = when;
      info.appendChild(name);
      info.appendChild(meta);

      const joinBtn = document.createElement("button");
      joinBtn.type = "button";
      joinBtn.className = "server-join";
      joinBtn.textContent = "JOIN";
      joinBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        joinServer(server.id);
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "server-delete";
      delBtn.textContent = "DEL";
      delBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        removeServer(server.id);
        renderServersList();
      });

      row.appendChild(info);
      row.appendChild(joinBtn);
      row.appendChild(delBtn);
      serversList.appendChild(row);
    });
  }

  function openServersPanel() {
    if (!serversPanel) return;
    renderServersList();
    serversPanel.hidden = false;
  }

  function closeServersPanel() {
    if (!serversPanel) return;
    serversPanel.hidden = true;
  }

  function joinServer(id) {
    if (!ensureNamedOrGate()) return;
    const server = loadServers().find(function (s) {
      return s.id === id;
    });
    if (!server || !server.run) return;
    closeServersPanel();
    closeLeaderboard();
    currentServerId = server.id;
    resumeActiveRun(server.run);
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const buf = new Uint32Array(1);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(buf);
        var j = buf[0] % (i + 1);
      } else {
        var j = (Math.random() * (i + 1)) | 0;
      }
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  const MAX_FAIR_BAG = 5000;

  /** Exact fair decks from death % (10% → 9 coin + 1 death, 5% → 19 + 1, etc.) */
  function refillRollBag() {
    if (deathChance <= 0) {
      rollBag = [true];
      return;
    }
    const ideal = Math.max(2, Math.round(1 / deathChance));
    // Cap bag size so deep odds / bulk buys can't freeze the tab
    if (ideal > MAX_FAIR_BAG) {
      rollBag = [];
      return;
    }
    rollBag = [];
    for (let i = 0; i < ideal - 1; i++) rollBag.push(true);
    rollBag.push(false);
    shuffleInPlace(rollBag);
  }

  let fairStats = { coins: 0, deaths: 0 };
  try {
    const savedFair = JSON.parse(localStorage.getItem(FAIR_STATS_KEY) || "{}");
    if (Number.isFinite(savedFair.coins)) fairStats.coins = savedFair.coins | 0;
    if (Number.isFinite(savedFair.deaths)) fairStats.deaths = savedFair.deaths | 0;
  } catch (err) {
    fairStats = { coins: 0, deaths: 0 };
  }

  function updateFairLine() {
    const total = fairStats.coins + fairStats.deaths;
    const pct =
      total > 0 ? Math.round((fairStats.coins / total) * 100) : 50;
    if (fairLineEl) {
      fairLineEl.textContent =
        "LIFETIME ROLLS · " +
        fairStats.coins +
        " COIN / " +
        fairStats.deaths +
        " DEATH · " +
        pct +
        "% COIN";
    }
  }

  function saveFairStats() {
    localStorage.setItem(FAIR_STATS_KEY, JSON.stringify(fairStats));
    updateFairLine();
  }

  /** Draw from a fair shuffled bag so streaks can't lie about the odds */
  function rollGotCoin() {
    if (deathChance <= 0) return true;
    if (!rollBag.length) refillRollBag();
    if (!rollBag.length) {
      // Bag too large to materialize — fall back to direct chance
      return Math.random() >= deathChance;
    }
    return rollBag.pop();
  }

  function formatPct(chance) {
    const pct = chance * 100;
    if (!(pct > 0)) return "0%";
    if (pct >= 10) return Math.round(pct * 10) / 10 + "%";
    if (pct >= 1) return Math.round(pct * 100) / 100 + "%";
    // Always plain 0.000… decimals — never scientific e-notation
    const decimals =
      pct >= 0.01
        ? 3
        : Math.min(12, Math.max(4, Math.ceil(-Math.log10(pct)) + 1));
    let s = pct.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
    if (s.charAt(0) === ".") s = "0" + s;
    return s + "%";
  }

  function oddsPromptText() {
    const death = formatPct(deathChance);
    const coin = formatPct(1 - deathChance);
    return coin + " COIN · " + death + " DEATH";
  }

  function updateOddsUI() {
    const deathText = formatPct(deathChance);
    const coinText = formatPct(1 - deathChance);
    const oddsTotal = bulkCost(nextUpgradeCost, buyQty);
    const strengthTotal = bulkCost(nextStrengthCost, buyQty);
    const autoTotal = bulkCost(nextAutoCost, buyQty);
    const effectivenessTotal = bulkCost(nextEffectivenessCost, buyQty);
    const eff = effectivenessPower();
    const afterOddsDeath =
      deathChance / Math.pow(oddsDivisorPerBuy(), buyQty);
    const strengthGain = nextStrengthGain();
    const afterStrength = coinsPerClick() + buyQty * strengthGain;
    const autoGain = nextAutoGain();
    const afterAuto = autoClickRate() + buyQty * autoGain;
    const baseCoins = 1 + ascendCoinBonus;
    const afterAscendBase = baseCoins + nextAscendGain();
    const afterEff = Math.pow(1.5, effectiveness + buyQty);

    if (oddsDisplayEl) oddsDisplayEl.textContent = deathText;
    if (shopDeathOddsEl) shopDeathOddsEl.textContent = deathText;
    if (shopCoinOddsEl) {
      shopCoinOddsEl.textContent =
        "COIN CHANCE " +
        coinText +
        " · +" +
        formatEffMult(coinsPerClick()) +
        " / CLICK (BASE " +
        formatEffMult(baseCoins) +
        (effectiveness > 0
          ? " · NEXT UPGRADES ×" + formatEffMult(eff)
          : "") +
        ")";
    }
    if (autoCountEl) {
      autoCountEl.textContent = formatEffMult(autoClickRate()) + "/s";
    }
    updateAscendLine();

    if (shopUpgradePreviewEl) {
      shopUpgradePreviewEl.textContent =
        "x" +
        buyQty +
        " · " +
        formatPct(deathChance) +
        " → " +
        formatPct(afterOddsDeath) +
        " DEATH · ÷" +
        formatEffMult(oddsDivisorPerBuy()) +
        " · COST " +
        formatCoins(oddsTotal);
    }
    if (shopStrengthPreviewEl) {
      shopStrengthPreviewEl.textContent =
        "x" +
        buyQty +
        " · +" +
        formatEffMult(coinsPerClick()) +
        " → +" +
        formatEffMult(afterStrength) +
        " / CLICK (+" +
        formatEffMult(strengthGain) +
        " EACH) · COST " +
        formatCoins(strengthTotal);
    }
    if (shopAutoPreviewEl) {
      shopAutoPreviewEl.textContent =
        "x" +
        buyQty +
        " · " +
        formatEffMult(autoClickRate()) +
        " → " +
        formatEffMult(afterAuto) +
        " / SEC · COST " +
        formatCoins(autoTotal);
    }
    if (shopEffectivenessPreviewEl) {
      shopEffectivenessPreviewEl.textContent =
        "x" +
        buyQty +
        " · ×" +
        formatEffMult(eff) +
        " → ×" +
        formatEffMult(afterEff) +
        " FUTURE POWER · COST " +
        formatCoins(effectivenessTotal);
    }
    if (shopBuyBtn) {
      shopBuyBtn.disabled =
        !alive || !shopOpen || ascending || !canAfford(oddsTotal);
      shopBuyBtn.textContent =
        "BUY x" + buyQty + " · " + formatCoins(oddsTotal);
    }
    if (shopStrengthBtn) {
      shopStrengthBtn.disabled =
        !alive || !shopOpen || ascending || !canAfford(strengthTotal);
      shopStrengthBtn.textContent =
        "BUY x" + buyQty + " · " + formatCoins(strengthTotal);
    }
    if (shopAutoBtn) {
      shopAutoBtn.disabled =
        !alive || !shopOpen || ascending || !canAfford(autoTotal);
      shopAutoBtn.textContent =
        "BUY x" + buyQty + " · " + formatCoins(autoTotal);
    }
    if (shopEffectivenessBtn) {
      shopEffectivenessBtn.disabled =
        !alive || !shopOpen || ascending || !canAfford(effectivenessTotal);
      shopEffectivenessBtn.textContent =
        "BUY x" + buyQty + " · " + formatCoins(effectivenessTotal);
    }
    if (shopAscendPreviewEl) {
      shopAscendPreviewEl.textContent =
        "NEXT · BASE " +
        formatEffMult(baseCoins) +
        " → " +
        formatEffMult(afterAscendBase) +
        " / CLICK · COST " +
        formatCoins(nextAscendCost);
    }
    if (shopAscendBtn) {
      shopAscendBtn.disabled =
        !alive || !shopOpen || ascending || !canAfford(nextAscendCost);
      shopAscendBtn.textContent =
        "ASCEND · " + formatCoins(nextAscendCost);
    }
  }

  function applyShopLayout() {
    if (shopOpen) {
      document.documentElement.style.setProperty(
        "--shop-width",
        shopWidthPct + "%"
      );
      document.body.classList.add("has-shop");
      shopPanel.hidden = false;
      splitHandle.hidden = false;
      buttonShiftTarget = -1.15;
    } else {
      document.body.classList.remove("has-shop", "is-shop-opening");
      shopPanel.hidden = true;
      splitHandle.hidden = true;
      buttonShiftTarget = 0;
      buttonShiftX = 0;
    }
    resize();
    updateOddsUI();
  }

  function audio() {
    return window.ButtonAudio || null;
  }

  function openShop(silent) {
    if (shopOpen) return;
    shopOpen = true;
    if (!silent && audio()) audio().shopUnlock();
    if (!silent) document.body.classList.add("is-shop-opening");
    applyShopLayout();
    if (shopBuyMsg && !silent) {
      shopBuyMsg.textContent = "MENU ONLINE · UPLINK STABLE";
      shopBuyMsg.classList.add("is-ok");
    }
    if (!silent) promptEl.textContent = "DIGITAL MENU UNLOCKED";
    setTimeout(function () {
      document.body.classList.remove("is-shop-opening");
      if (alive && inGame && !silent) promptEl.textContent = oddsPromptText();
    }, silent ? 0 : 900);
    saveActiveRun();
  }

  function denyPurchase() {
    if (shopBuyMsg) {
      shopBuyMsg.textContent = "NOT ENOUGH COINS";
      shopBuyMsg.classList.remove("is-ok");
    }
    if (audio()) audio().buttonRelease();
  }

  function buyHigherOdds() {
    if (!shopOpen || !alive || !inGame || ascending) return;
    const qty = buyQty;
    const total = bulkCost(nextUpgradeCost, qty);
    if (!canAfford(total)) {
      denyPurchase();
      return;
    }

    coins -= total;
    coinCountEl.textContent = String(coins);
    for (let i = 0; i < qty; i++) {
      deathChance = deathChance / oddsDivisorPerBuy();
      upgradeLevel += 1;
      nextUpgradeCost = nextUpgradeCost * 2;
    }
    refillRollBag();
    if (audio()) audio().upgrade();

    shopBuyMsg.textContent =
      "UPGRADED x" + qty + " · DEATH NOW " + formatPct(deathChance);
    shopBuyMsg.classList.add("is-ok");
    promptEl.textContent = "ODDS UPGRADED · " + oddsPromptText();
    updateOddsUI();
    saveActiveRun();

    setTimeout(function () {
      if (alive && inGame) promptEl.textContent = oddsPromptText();
    }, 1100);
  }

  function buyButtonStrength() {
    if (!shopOpen || !alive || !inGame || ascending) return;
    const qty = buyQty;
    const total = bulkCost(nextStrengthCost, qty);
    if (!canAfford(total)) {
      denyPurchase();
      return;
    }

    coins -= total;
    coinCountEl.textContent = String(coins);
    for (let i = 0; i < qty; i++) {
      strengthCoinBonus += nextStrengthGain();
      buttonStrength += 1;
      nextStrengthCost = nextStrengthCost * 2;
    }
    if (audio()) audio().upgrade();

    shopBuyMsg.textContent =
      "STRENGTH x" +
      qty +
      " · +" +
      formatEffMult(coinsPerClick()) +
      " / CLICK";
    shopBuyMsg.classList.add("is-ok");
    promptEl.textContent =
      "BUTTON STRENGTH · +" + formatEffMult(coinsPerClick()) + " / CLICK";
    updateOddsUI();
    saveActiveRun();

    setTimeout(function () {
      if (alive && inGame) promptEl.textContent = oddsPromptText();
    }, 1100);
  }

  function buyAutoClicker() {
    if (!shopOpen || !alive || !inGame || ascending) return;
    const qty = buyQty;
    const total = bulkCost(nextAutoCost, qty);
    if (!canAfford(total)) {
      denyPurchase();
      return;
    }

    coins -= total;
    coinCountEl.textContent = String(coins);
    for (let i = 0; i < qty; i++) {
      autoClicksPerSec += nextAutoGain();
      nextAutoCost = nextAutoCost * 2;
    }
    if (audio()) audio().upgrade();

    shopBuyMsg.textContent =
      "AUTO x" +
      qty +
      " · " +
      formatEffMult(autoClickRate()) +
      " CLICKS / SEC";
    shopBuyMsg.classList.add("is-ok");
    promptEl.textContent =
      "AUTO CLICKER · " + formatEffMult(autoClickRate()) + " / SEC";
    updateOddsUI();
    syncAutoClicker();
    saveActiveRun();

    setTimeout(function () {
      if (alive && inGame) promptEl.textContent = oddsPromptText();
    }, 1100);
  }

  function buyEffectiveness() {
    if (!shopOpen || !alive || !inGame || ascending) return;
    const qty = buyQty;
    const total = bulkCost(nextEffectivenessCost, qty);
    if (!canAfford(total)) {
      denyPurchase();
      return;
    }

    coins -= total;
    coinCountEl.textContent = String(coins);
    for (let i = 0; i < qty; i++) {
      effectiveness += 1;
      nextEffectivenessCost = nextEffectivenessCost * 2;
    }
    // Only future purchases are stronger — do not touch current odds/strength/auto.
    if (audio()) audio().upgrade();

    shopBuyMsg.textContent =
      "EFFECTIVENESS x" +
      qty +
      " · FUTURE UPGRADES ×" +
      formatEffMult(effectivenessPower());
    shopBuyMsg.classList.add("is-ok");
    promptEl.textContent =
      "EFFECTIVENESS · ×" +
      formatEffMult(effectivenessPower()) +
      " FUTURE POWER";
    updateOddsUI();
    saveActiveRun();

    setTimeout(function () {
      if (alive && inGame) promptEl.textContent = oddsPromptText();
    }, 1100);
  }

  function setBuyQty(qty) {
    buyQty = qty;
    if (buyQtyBar) {
      buyQtyBar.querySelectorAll(".buy-qty-btn").forEach(function (btn) {
        btn.classList.toggle("is-active", Number(btn.dataset.qty) === qty);
      });
    }
    updateOddsUI();
    saveActiveRun();
  }

  function buyAscend() {
    if (!shopOpen || !alive || !inGame || ascending) return;
    if (!canAfford(nextAscendCost)) {
      denyPurchase();
      return;
    }

    coins -= nextAscendCost;
    coinCountEl.textContent = String(coins);
    ascendCoinBonus += nextAscendGain();
    ascendLevel += 1;
    nextAscendCost = nextAscendCost * 2;
    saveAscend();
    ascending = true;
    stopAutoClicker();
    updateOddsUI();
    syncNewRunBtn();
    syncMainMenuBtn();
    saveActiveRun();

    if (shopBuyMsg) {
      shopBuyMsg.textContent =
        "ASCENSION " +
        ascendLevel +
        " · BASE " +
        formatEffMult(1 + ascendCoinBonus) +
        " / CLICK";
      shopBuyMsg.classList.add("is-ok");
    }
    promptEl.textContent = "THE HOOK COMES";

    if (audio()) audio().upgrade();
    playHookAscend();
  }

  function playHookAscend() {
    if (hookOverlay) {
      hookOverlay.hidden = false;
      hookOverlay.classList.add("is-active");
    }
    document.body.classList.add("is-hooked");

    // Camera yanked upward with the hook
    const startY = camera.position.y;
    const startZ = camera.position.z;
    const t0 = performance.now();
    const duration = 2300;

    function yankFrame(now) {
      const u = Math.min(1, (now - t0) / duration);
      const ease = u * u * u;
      camera.position.y = startY + ease * 18;
      camera.position.z = startZ - ease * 4;
      camera.rotation.z = ease * 0.45;
      camera.lookAt(buttonShiftX, 0.7 + ease * 10, 0);
      if (u < 1 && ascending) {
        requestAnimationFrame(yankFrame);
      }
    }
    requestAnimationFrame(yankFrame);

    setTimeout(function () {
      if (hookOverlay) {
        hookOverlay.hidden = true;
        hookOverlay.classList.remove("is-active");
      }
      document.body.classList.remove("is-hooked");
      camera.position.y = startY;
      camera.position.z = startZ;
      camera.rotation.z = 0;
      die(false, true);
      ascending = false;
    }, 2400);
  }

  highScoreEl.textContent = String(highScore);
  bestCountEl.textContent = String(highScore);
  updateFairLine();
  updateAscendLine();
  updatePlayerLine();
  updateOddsUI();
  if (hasPlayerName()) {
    updateLeaderboardScore();
    if (enterHint) enterHint.textContent = "SAVED RUNS APPEAR UNDER SERVERS";
  } else {
    openNameGate(true);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040706);
  scene.fog = new THREE.FogExp2(0x040706, 0.026);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(0, 1.28, 3.35);
  camera.lookAt(0, 0.7, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if ("toneMapping" in renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }

  const ambient = new THREE.AmbientLight(0x1c3a2e, 0.62);
  scene.add(ambient);

  const fill = new THREE.DirectionalLight(0x4a8a68, 0.4);
  fill.position.set(-4, 6, 3);
  scene.add(fill);

  const overhead = new THREE.PointLight(0x7dffb0, 0.62, 18, 2);
  overhead.position.set(0, 4.2, 1.5);
  scene.add(overhead);

  const buttonGlow = new THREE.PointLight(0xff2a22, 0, 12, 1.6);
  buttonGlow.position.set(0, 1.2, 0.35);
  scene.add(buttonGlow);

  const buttonFill = new THREE.PointLight(0xff6655, 0, 6, 2);
  buttonFill.position.set(0.15, 1.9, 1.1);
  scene.add(buttonFill);

  const rim = new THREE.SpotLight(0xff4444, 0, 14, Math.PI / 4.5, 0.4, 1);
  rim.position.set(0, 3.4, 2.8);
  rim.target.position.set(0, 1.2, 0);
  scene.add(rim);
  scene.add(rim.target);

  function makeFloor() {
    const geo = new THREE.PlaneGeometry(40, 40, 48, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a110e,
      roughness: 0.88,
      metalness: 0.22,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(40, 40, 0x24553c, 0x102a1e);
    grid.position.y = 0.012;
    grid.material.transparent = true;
    grid.material.opacity = 0.38;
    scene.add(grid);

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x121a16,
      metalness: 0.55,
      roughness: 0.5,
    });
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -1; gz <= 2; gz++) {
        if (gx === 0 && gz === 0) continue;
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.04, 1.35),
          plateMat
        );
        plate.position.set(gx * 1.55, 0.02, gz * 1.55 - 0.4);
        plate.receiveShadow = true;
        scene.add(plate);
      }
    }

    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      emissive: 0x5a3e00,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.55,
    });
    const hazardRing = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.78, 64),
      hazardMat
    );
    hazardRing.rotation.x = -Math.PI / 2;
    hazardRing.position.y = 0.03;
    scene.add(hazardRing);
  }

  function makeWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x09110e,
      roughness: 0.92,
      metalness: 0.08,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0d1814,
      roughness: 0.7,
      metalness: 0.25,
    });

    const back = new THREE.Mesh(new THREE.PlaneGeometry(28, 10), wallMat);
    back.position.set(0, 5, -6);
    scene.add(back);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
    left.position.set(-8, 5, 0);
    left.rotation.y = Math.PI / 2;
    scene.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
    right.position.set(8, 5, 0);
    right.rotation.y = -Math.PI / 2;
    scene.add(right);

    for (let i = -3; i <= 3; i++) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.4, 0.08),
        panelMat
      );
      panel.position.set(i * 1.85, 2.2, -5.92);
      scene.add(panel);
    }

    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x1c3228,
      metalness: 0.82,
      roughness: 0.28,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x2a4034,
      metalness: 0.7,
      roughness: 0.35,
    });

    for (let i = 0; i < 5; i++) {
      const y = 1.35 + i * 0.7;
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 14, 16),
        pipeMat
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, y, -5.78);
      scene.add(pipe);

      [-4.5, 0, 4.5].forEach(function (x) {
        const joint = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.04, 8, 16),
          jointMat
        );
        joint.rotation.y = Math.PI / 2;
        joint.position.set(x, y, -5.78);
        scene.add(joint);
      });
    }

    const verticalPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 5.2, 16),
      pipeMat
    );
    verticalPipe.position.set(-6.8, 2.6, -3.2);
    scene.add(verticalPipe);
    const verticalPipe2 = verticalPipe.clone();
    verticalPipe2.position.set(6.8, 2.6, -3.2);
    scene.add(verticalPipe2);

    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x070e0b,
      metalness: 0.45,
      roughness: 0.55,
    });
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x040806,
      metalness: 0.3,
      roughness: 0.7,
    });
    [-5.6, -3.9, 3.9, 5.6].forEach(function (x, idx) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.05, 3.4, 0.75), rackMat);
      rack.position.set(x, 1.7, -4.15);
      rack.castShadow = true;
      scene.add(rack);

      for (let row = 0; row < 5; row++) {
        const bay = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.38, 0.12),
          bayMat
        );
        bay.position.set(x, 0.55 + row * 0.55, -3.72);
        scene.add(bay);

        const ledMat = new THREE.MeshStandardMaterial({
          color: row % 2 === idx % 2 ? 0x3cff8a : 0xff4422,
          emissive: row % 2 === idx % 2 ? 0x1a8844 : 0xaa2200,
          emissiveIntensity: 1.1 + (row % 3) * 0.2,
        });
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 0.04),
          ledMat
        );
        led.position.set(x + 0.32, 0.55 + row * 0.55, -3.64);
        scene.add(led);
      }

      const glow = new THREE.PointLight(
        idx % 2 === 0 ? 0x3cff8a : 0xff4422,
        0.28,
        2.8,
        2
      );
      glow.position.set(x, 2.5, -3.7);
      scene.add(glow);
    });
  }

  function makeCeiling() {
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 20),
      new THREE.MeshStandardMaterial({
        color: 0x060b09,
        roughness: 0.88,
        metalness: 0.25,
      })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5.5;
    scene.add(ceil);

    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x141c18,
      metalness: 0.6,
      roughness: 0.4,
    });
    [-3, 0, 3].forEach(function (z) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.18, 0.28), beamMat);
      beam.position.set(0, 5.35, z);
      scene.add(beam);
    });

    const fixtureMat = new THREE.MeshStandardMaterial({
      color: 0xb8ffd0,
      emissive: 0x2f7a4e,
      emissiveIntensity: 1.05,
      roughness: 0.35,
    });
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x1a2820,
      metalness: 0.7,
      roughness: 0.4,
    });

    [-2.6, 0, 2.6].forEach(function (x) {
      const cage = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 0.5), cageMat);
      cage.position.set(x, 5.38, 0.45);
      scene.add(cage);
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 0.06, 0.32),
        fixtureMat
      );
      fixture.position.set(x, 5.28, 0.45);
      scene.add(fixture);
    });
  }

  const BUTTON_BASE_Y = -0.45;
  const buttonGroup = new THREE.Group();
  buttonGroup.visible = false;
  buttonGroup.position.y = BUTTON_BASE_Y;
  buttonGroup.scale.set(0.01, 0.01, 0.01);
  scene.add(buttonGroup);

  function makeConsole() {
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x101612,
      metalness: 0.62,
      roughness: 0.36,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x171f1a,
      metalness: 0.75,
      roughness: 0.28,
    });
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0x9aa8a0,
      metalness: 0.9,
      roughness: 0.22,
    });

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 1.02, 0.98, 8),
      baseMat
    );
    pedestal.position.y = 0.49;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    buttonGroup.add(pedestal);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.2, 0.12, 8),
      accentMat
    );
    foot.position.y = 0.06;
    foot.receiveShadow = true;
    buttonGroup.add(foot);

    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.16, 48),
      accentMat
    );
    deck.position.y = 1.02;
    deck.castShadow = true;
    deck.receiveShadow = true;
    buttonGroup.add(deck);

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10),
        boltMat
      );
      bolt.position.set(Math.cos(ang) * 1.02, 1.12, Math.sin(ang) * 1.02);
      buttonGroup.add(bolt);
    }

    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.1, 48),
      new THREE.MeshStandardMaterial({
        color: 0x030303,
        metalness: 0.45,
        roughness: 0.65,
      })
    );
    well.position.y = 1.12;
    buttonGroup.add(well);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.075, 18, 64),
      new THREE.MeshStandardMaterial({
        color: 0xd0d8d2,
        metalness: 0.96,
        roughness: 0.14,
        emissive: 0x1a221e,
        emissiveIntensity: 0.3,
      })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.18;
    buttonGroup.add(collar);

    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.035, 10, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffcc33,
        emissive: 0xaa6600,
        emissiveIntensity: 0.95,
        metalness: 0.25,
        roughness: 0.4,
      })
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = 1.1;
    buttonGroup.add(stripe);

    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x1a1010,
      roughness: 0.7,
      metalness: 0.15,
    });
    [-0.55, 0.55].forEach(function (x) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.1, 10),
        cableMat
      );
      cable.position.set(x, 0.55, 0.85);
      cable.rotation.x = 0.35;
      buttonGroup.add(cable);
    });
  }

  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    emissive: 0xff0000,
    emissiveIntensity: 2.55,
    metalness: 0.18,
    roughness: 0.24,
  });

  const buttonTopMat = new THREE.MeshStandardMaterial({
    color: 0xff5555,
    emissive: 0xff2800,
    emissiveIntensity: 3.0,
    metalness: 0.12,
    roughness: 0.18,
  });

  const buttonMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.52, 0.28, 64),
    buttonMat
  );
  buttonMesh.position.y = 1.18;
  buttonMesh.castShadow = true;
  buttonMesh.name = "THE_BUTTON";
  buttonGroup.add(buttonMesh);

  const buttonTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 64),
    buttonTopMat
  );
  buttonTop.rotation.x = -Math.PI / 2;
  buttonTop.position.y = 1.322;
  buttonTop.name = "THE_BUTTON";
  buttonGroup.add(buttonTop);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.72, 64),
    new THREE.MeshBasicMaterial({
      color: 0xff2a10,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 1.2;
  buttonGroup.add(halo);

  const glowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff1600,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  glowDisc.rotation.x = -Math.PI / 2;
  glowDisc.position.y = 1.11;
  buttonGroup.add(glowDisc);

  makeFloor();
  makeWalls();
  makeCeiling();
  makeConsole();

  const moteCount = 120;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (Math.random() - 0.5) * 16;
    motePos[i * 3 + 1] = Math.random() * 5;
    motePos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: 0x6fff9a,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  scene.add(motes);

  // Invisible larger hit target so the button is easy to click
  const buttonHit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.45, 24),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  buttonHit.position.y = 1.22;
  buttonHit.name = "THE_BUTTON";
  buttonGroup.add(buttonHit);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactables = [buttonHit, buttonMesh, buttonTop];

  function resize() {
    const w = gamePane.clientWidth || window.innerWidth;
    const h = gamePane.clientHeight || window.innerHeight;
    camera.aspect = Math.max(w, 1) / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  resize();

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function hitButton() {
    if (!inGame || buttonAppear < 0.95) return false;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(interactables, false).length > 0;
  }

  function saveHighScore() {
    if (pulses > highScore) {
      highScore = pulses;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }
    highScoreEl.textContent = String(highScore);
    bestCountEl.textContent = String(highScore);
    if (hasPlayerName()) updateLeaderboardScore();
  }

  function pressVisual(down, withSound) {
    pressing = down;
    buttonMesh.position.y = down ? 1.08 : 1.18;
    buttonTop.position.y = down ? 1.222 : 1.322;
    if (typeof buttonHit !== "undefined" && buttonHit) {
      buttonHit.position.y = down ? 1.12 : 1.22;
    }
    buttonGlow.intensity = down ? 7.5 : 5.2 * buttonAppear;
    buttonFill.intensity = down ? 2.8 : 1.6 * buttonAppear;
    if (withSound && audio()) {
      if (down) audio().buttonPress();
      else audio().buttonRelease();
    }
  }

  function gainCoin() {
    const gained = coinsPerClick();
    coins += gained;
    fairStats.coins += 1;
    saveFairStats();
    coinCountEl.textContent = String(coins);
    saveHighScore();
    updateOddsUI();
    promptEl.textContent = "FAIR DRAW → COIN · +" + gained;
    coinFlash.classList.remove("active");
    void coinFlash.offsetWidth;
    coinFlash.classList.add("active");
    if (audio()) audio().coin();
    saveActiveRun();

    buttonMat.emissiveIntensity = 3.6;
    buttonTopMat.emissiveIntensity = 4.0;
    setTimeout(function () {
      if (alive && inGame) {
        buttonMat.emissiveIntensity = 2.4;
        buttonTopMat.emissiveIntensity = 2.8;
        promptEl.textContent = oddsPromptText();
      }
    }, 900);
  }

  function die(silent, fromAscend) {
    alive = false;
    stopAutoClicker();
    if (!silent) {
      fairStats.deaths += 1;
      saveFairStats();
    }
    saveHighScore();
    if (deathPulsesEl) deathPulsesEl.textContent = String(pulses);
    deathCoinsEl.textContent = String(coins);
    document.body.classList.add("is-dead");
    document.body.style.cursor = "default";
    if (fromAscend) {
      if (deathCodeEl) deathCodeEl.textContent = "ERR_ASCENDED";
      if (deathTitleEl) deathTitleEl.textContent = "ASCENDED";
      if (deathSubEl) {
        deathSubEl.textContent =
          "The hook took you. Base coins / click is now " +
          formatEffMult(1 + ascendCoinBonus) +
          " forever.";
      }
      promptEl.textContent =
        "ASCENDED · BASE " + formatEffMult(1 + ascendCoinBonus);
    } else {
      if (deathCodeEl) deathCodeEl.textContent = "ERR_SIGNAL_LOST";
      if (deathTitleEl) deathTitleEl.textContent = "YOU DIED";
      if (deathSubEl) {
        deathSubEl.textContent = "The factory kept running without you.";
      }
      promptEl.textContent = "FAIR DRAW → DEATH";
    }
    deathOverlay.hidden = false;
    buttonMat.emissiveIntensity = 0.2;
    buttonTopMat.emissiveIntensity = 0.2;
    buttonGlow.intensity = 0.5;
    buttonFill.intensity = 0.15;
    overhead.intensity = 0.15;
    updateOddsUI();
    if (!silent && audio()) audio().death();
    syncNewRunBtn();
    syncMainMenuBtn();
    saveActiveRun();
  }

  function performPress(fromAuto) {
    if (!inGame || !alive || pressing || resolving || ascending) return;
    if (!fromAuto && !hitButton()) return;

    resolving = true;
    // Pulses scale with click power (strength + ascension), same as coin payout
    pulses += coinsPerClick();
    pulseCountEl.textContent = String(pulses);
    saveHighScore();
    pressVisual(true, !fromAuto);
    promptEl.textContent = fromAuto ? "AUTO ROLLING…" : "ROLLING…";

    const gotCoin = rollGotCoin();
    const resolveMs = fromAuto
      ? Math.max(8, Math.floor(1000 / Math.max(1, autoClickRate()) * 0.7))
      : 160;

    setTimeout(function () {
      pressVisual(false, !fromAuto);
      if (!alive) {
        resolving = false;
        return;
      }
      if (gotCoin) gainCoin();
      else die();
      resolving = false;
      saveActiveRun();
    }, resolveMs);
  }

  function onPress() {
    performPress(false);
  }

  function enterGame() {
    if (inGame || entering) return;
    if (!ensureNamedOrGate()) return;
    entering = true;
    currentServerId = null;
    closeServersPanel();
    closeLeaderboard();
    if (audio()) {
      audio().unlock();
      audio().enterFactory();
    }

    document.body.classList.remove("is-title", "is-resuming");
    document.body.classList.add("is-entering");
    titleScreen.classList.add("is-gone");
    enterWipe.classList.remove("active");
    void enterWipe.offsetWidth;
    enterWipe.classList.add("active");

    coins = 0;
    pulses = 0;
    alive = true;
    deathChance = BASE_DEATH_CHANCE;
    nextUpgradeCost = BASE_UPGRADE_COST;
    upgradeLevel = 0;
    buttonStrength = 0;
    strengthCoinBonus = 0;
    nextStrengthCost = BASE_STRENGTH_COST;
    autoClicksPerSec = 0;
    nextAutoCost = BASE_AUTO_COST;
    effectiveness = 0;
    nextEffectivenessCost = BASE_EFFECTIVENESS_COST;
    buyQty = 1;
    stopAutoClicker();
    setBuyQty(1);
    shopOpen = false;
    shopWidthPct = 34;
    // Keep leftover fair-bag draws across runs so a death is followed by a owed coin
    if (shopBuyMsg) {
      shopBuyMsg.textContent = "";
      shopBuyMsg.classList.remove("is-ok");
    }
    coinCountEl.textContent = "0";
    pulseCountEl.textContent = "0";
    bestCountEl.textContent = String(highScore);
    if (autoCountEl) autoCountEl.textContent = "0/s";
    buttonAppear = 0;
    buttonShiftX = 0;
    buttonShiftTarget = 0;
    buttonGroup.visible = true;
    buttonGroup.position.x = 0;
    buttonGroup.scale.set(0.01, 0.01, 0.01);
    buttonGlow.intensity = 0;
    buttonFill.intensity = 0;
    rim.intensity = 0;
    pressVisual(false);
    buttonMat.emissiveIntensity = 2.4;
    buttonTopMat.emissiveIntensity = 2.8;
    overhead.intensity = 0.55;
    updateOddsUI();

    renderer.render(scene, camera);

    setTimeout(function () {
      document.body.classList.remove("is-entering");
      document.body.classList.add("is-playing");
      inGame = true;
      entering = false;
      openShop(true);
      hudStats.hidden = false;
      promptEl.hidden = false;
      promptEl.textContent = oddsPromptText();
      document.body.style.cursor = "crosshair";
      syncNewRunBtn();
      syncMainMenuBtn();
      saveActiveRun();
    }, 500);
  }

  function resumeActiveRun(data) {
    if (data.serverId) currentServerId = data.serverId;
    coins = data.coins | 0;
    pulses = data.pulses | 0;
    alive = data.alive !== false;
    deathChance =
      typeof data.deathChance === "number" && data.deathChance > 0
        ? data.deathChance
        : BASE_DEATH_CHANCE;
    nextUpgradeCost =
      typeof data.nextUpgradeCost === "number"
        ? data.nextUpgradeCost
        : BASE_UPGRADE_COST;
    upgradeLevel = data.upgradeLevel | 0;
    buttonStrength = data.buttonStrength | 0;
    if (typeof data.strengthCoinBonus === "number") {
      strengthCoinBonus = data.strengthCoinBonus;
    } else {
      strengthCoinBonus = buttonStrength * 2;
    }
    nextStrengthCost =
      typeof data.nextStrengthCost === "number"
        ? data.nextStrengthCost
        : BASE_STRENGTH_COST;
    autoClicksPerSec = Number(data.autoClicksPerSec) || 0;
    nextAutoCost =
      typeof data.nextAutoCost === "number" ? data.nextAutoCost : BASE_AUTO_COST;
    effectiveness = data.effectiveness | 0;
    nextEffectivenessCost =
      typeof data.nextEffectivenessCost === "number"
        ? data.nextEffectivenessCost
        : BASE_EFFECTIVENESS_COST * Math.pow(1.5, effectiveness);
    buyQty = [1, 10, 100, 1000].indexOf(data.buyQty) >= 0 ? data.buyQty : 1;
    shopOpen = true;
    shopWidthPct =
      typeof data.shopWidthPct === "number" ? data.shopWidthPct : 34;
    rollBag = Array.isArray(data.rollBag) ? data.rollBag.slice() : [];

    document.body.classList.remove("is-title", "is-entering", "is-resuming");
    document.body.classList.add("is-playing");
    titleScreen.classList.add("is-gone");
    deathOverlay.hidden = true;
    document.body.classList.remove("is-dead");

    inGame = true;
    entering = false;
    pressing = false;
    resolving = false;
    buttonAppear = 1;

    buttonGroup.visible = true;
    buttonGroup.scale.set(1, 1, 1);
    applyShopLayout();
    buttonShiftX = buttonShiftTarget;
    buttonGroup.position.x = buttonShiftX;

    buttonGlow.intensity = 5.2;
    buttonFill.intensity = 1.6;
    rim.intensity = 2.4;
    pressVisual(false);
    buttonMat.emissiveIntensity = 2.4;
    buttonTopMat.emissiveIntensity = 2.8;
    overhead.intensity = alive ? 0.55 : 0.15;

    coinCountEl.textContent = String(coins);
    pulseCountEl.textContent = String(pulses);
    bestCountEl.textContent = String(highScore);
    if (autoCountEl) autoCountEl.textContent = autoClickRate() + "/s";
    hudStats.hidden = false;
    promptEl.hidden = false;
    promptEl.textContent = oddsPromptText();
    document.body.style.cursor = alive ? "crosshair" : "default";

    if (shopBuyMsg) {
      shopBuyMsg.textContent = data.shopMsg || "";
      shopBuyMsg.classList.toggle("is-ok", !!data.shopMsgOk);
    }

    setBuyQty(buyQty);
    updateOddsUI();
    resize();
    renderer.render(scene, camera);

    if (audio()) {
      audio().unlock();
      audio().enterFactory();
    }

    if (!alive) die(true);
    else syncAutoClicker();

    syncNewRunBtn();
    syncMainMenuBtn();
    saveActiveRun();
  }

  function returnToTitle(fromMainMenu) {
    const endedServerId = currentServerId;
    inGame = false;
    entering = false;
    alive = true;
    pressing = false;
    resolving = false;
    shopOpen = false;
    deathChance = BASE_DEATH_CHANCE;
    nextUpgradeCost = BASE_UPGRADE_COST;
    upgradeLevel = 0;
    buttonStrength = 0;
    strengthCoinBonus = 0;
    nextStrengthCost = BASE_STRENGTH_COST;
    autoClicksPerSec = 0;
    nextAutoCost = BASE_AUTO_COST;
    effectiveness = 0;
    nextEffectivenessCost = BASE_EFFECTIVENESS_COST;
    buyQty = 1;
    stopAutoClicker();
    buttonAppear = 0;
    buttonShiftX = 0;
    buttonShiftTarget = 0;
    buttonGroup.visible = false;
    buttonGroup.position.x = 0;
    buttonGroup.scale.set(0.01, 0.01, 0.01);
    buttonGlow.intensity = 0;
    buttonFill.intensity = 0;
    rim.intensity = 0;
    applyShopLayout();
    clearActiveRun();

    // Death / new-run ends the saved server; main menu keeps it
    if (!fromMainMenu && endedServerId) {
      removeServer(endedServerId);
    }
    currentServerId = null;

    ascending = false;
    if (hookOverlay) {
      hookOverlay.hidden = true;
      hookOverlay.classList.remove("is-active");
    }
    document.body.classList.remove(
      "is-dead",
      "is-playing",
      "is-entering",
      "is-resuming",
      "is-hooked"
    );
    document.body.classList.add("is-title");
    document.body.style.cursor = "pointer";
    deathOverlay.hidden = true;
    hudStats.hidden = true;
    promptEl.hidden = true;
    titleScreen.classList.remove("is-gone");
    highScoreEl.textContent = String(highScore);
    updateAscendLine();
    syncNewRunBtn();
    syncMainMenuBtn();
    closeServersPanel();
    if (enterHint) enterHint.textContent = "SAVED RUNS APPEAR UNDER SERVERS";
    if (audio()) audio().returnTitle();
  }

  function goToMainMenu() {
    if (!inGame || ascending) return;
    stopAutoClicker();
    if (alive) {
      upsertServerFromCurrentRun();
    } else if (currentServerId) {
      removeServer(currentServerId);
    }
    clearActiveRun();
    returnToTitle(true);
  }

  function tryEnterFromTitle(event) {
    if (!document.body.classList.contains("is-title")) return;
    if (serversPanel && !serversPanel.hidden) return;
    if (event) event.preventDefault();
    enterGame();
  }

  const muteBtn = document.getElementById("mute-btn");
  const newRunBtn = document.getElementById("new-run-btn");

  function syncNewRunBtn() {
    if (!newRunBtn) return;
    newRunBtn.hidden = !(inGame && alive && !ascending);
  }

  function syncMainMenuBtn() {
    if (!mainMenuBtn) return;
    mainMenuBtn.hidden = !(inGame && alive && !ascending);
  }

  function syncMuteBtn() {
    if (!muteBtn || !audio()) return;
    const isMuted = audio().isMuted();
    muteBtn.textContent = isMuted ? "SOUND OFF" : "SOUND ON";
    muteBtn.classList.toggle("is-muted", isMuted);
  }
  if (muteBtn) {
    muteBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      event.preventDefault();
      if (!audio()) return;
      audio().unlock();
      audio().toggleMute();
      if (!audio().isMuted() && document.body.classList.contains("is-title")) {
        audio().startTitle();
      }
      syncMuteBtn();
    });
  }
  if (newRunBtn) {
    newRunBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      event.preventDefault();
      if (!inGame || !alive || ascending) return;
      stopAutoClicker();
      die(false, false);
      syncNewRunBtn();
      syncMainMenuBtn();
    });
  }

  if (mainMenuBtn) {
    mainMenuBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      event.preventDefault();
      goToMainMenu();
    });
  }

  if (enterGameBtn) {
    enterGameBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      tryEnterFromTitle(event);
    });
  }

  if (serversBtn) {
    serversBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      event.preventDefault();
      if (!ensureNamedOrGate()) return;
      closeLeaderboard();
      openServersPanel();
    });
  }

  if (serversClose) {
    serversClose.addEventListener("click", function (event) {
      event.stopPropagation();
      closeServersPanel();
    });
  }

  if (serversPanel) {
    serversPanel.addEventListener("click", function (event) {
      event.stopPropagation();
      if (event.target === serversPanel) closeServersPanel();
    });
  }

  if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      event.preventDefault();
      openLeaderboard();
    });
  }

  if (leaderboardClose) {
    leaderboardClose.addEventListener("click", function (event) {
      event.stopPropagation();
      closeLeaderboard();
    });
  }

  if (leaderboardPanel) {
    leaderboardPanel.addEventListener("click", function (event) {
      event.stopPropagation();
      if (event.target === leaderboardPanel) closeLeaderboard();
    });
  }

  if (changeNameBtn) {
    changeNameBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      openNameGate(true);
    });
  }

  if (nameConfirmBtn) {
    nameConfirmBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      confirmPlayerName();
    });
  }

  if (nameInput) {
    nameInput.addEventListener("keydown", function (event) {
      if (event.code === "Enter") {
        event.preventDefault();
        confirmPlayerName();
      }
    });
  }

  if (nameGate) {
    nameGate.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  // Soft title drone after first gesture anywhere
  function armTitleAudio() {
    if (!audio()) return;
    audio().unlock();
    if (document.body.classList.contains("is-title")) audio().startTitle();
  }
  window.addEventListener("pointerdown", armTitleAudio, { once: true });
  window.addEventListener("keydown", armTitleAudio, { once: true });

  titleScreen.addEventListener("keydown", function (event) {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      if (serversPanel && !serversPanel.hidden) return;
      tryEnterFromTitle(event);
    }
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!inGame || !alive) return;
    setPointerFromEvent(event);
    document.body.style.cursor = hitButton() ? "pointer" : "crosshair";
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (!inGame) return;
    setPointerFromEvent(event);
    onPress();
  });

  window.addEventListener("keydown", function (event) {
    if (event.code !== "Space" && event.code !== "Enter") return;
    if (nameGate && !nameGate.hidden) return;
    event.preventDefault();
    if (!inGame) {
      if (serversPanel && !serversPanel.hidden) return;
      if (leaderboardPanel && !leaderboardPanel.hidden) return;
      enterGame();
      return;
    }
    if (!alive) return;
    pointer.x = 0;
    pointer.y = 0.05;
    onPress();
  });

  retryBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    returnToTitle(false);
  });

  shopBuyBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    buyHigherOdds();
  });

  if (shopStrengthBtn) {
    shopStrengthBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      buyButtonStrength();
    });
  }

  if (shopAutoBtn) {
    shopAutoBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      buyAutoClicker();
    });
  }

  if (shopEffectivenessBtn) {
    shopEffectivenessBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      buyEffectiveness();
    });
  }

  if (shopAscendBtn) {
    shopAscendBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      buyAscend();
    });
  }

  if (buyQtyBar) {
    buyQtyBar.addEventListener("click", function (event) {
      const btn = event.target.closest(".buy-qty-btn");
      if (!btn) return;
      event.stopPropagation();
      setBuyQty(Number(btn.dataset.qty) || 1);
    });
  }

  shopPanel.addEventListener("pointerdown", function (event) {
    event.stopPropagation();
  });

  function onSplitPointerDown(event) {
    if (!shopOpen) return;
    resizingSplit = true;
    splitHandle.setPointerCapture(event.pointerId);
    document.body.style.cursor = window.matchMedia("(max-width: 720px)").matches
      ? "row-resize"
      : "col-resize";
    event.preventDefault();
  }

  function onSplitPointerMove(event) {
    if (!resizingSplit || !shopOpen) return;
    const rect = document.getElementById("stage").getBoundingClientRect();
    const vertical = window.matchMedia("(max-width: 720px)").matches;
    let pct;
    if (vertical) {
      pct = ((rect.bottom - event.clientY) / rect.height) * 100;
    } else {
      pct = ((rect.right - event.clientX) / rect.width) * 100;
    }
    shopWidthPct = Math.min(72, Math.max(18, pct));
    document.documentElement.style.setProperty(
      "--shop-width",
      shopWidthPct + "%"
    );
    resize();
  }

  function onSplitPointerUp(event) {
    if (!resizingSplit) return;
    resizingSplit = false;
    try {
      splitHandle.releasePointerCapture(event.pointerId);
    } catch (err) {
      /* ignore */
    }
    document.body.style.cursor = inGame ? "crosshair" : "pointer";
    saveActiveRun();
  }

  splitHandle.addEventListener("pointerdown", onSplitPointerDown);
  splitHandle.addEventListener("pointermove", onSplitPointerMove);
  splitHandle.addEventListener("pointerup", onSplitPointerUp);
  splitHandle.addEventListener("pointercancel", onSplitPointerUp);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // Slide button left when the digital menu opens
    buttonShiftX += (buttonShiftTarget - buttonShiftX) * Math.min(1, dt * 4.5);
    buttonGroup.position.x = buttonShiftX;

    if ((inGame || entering) && buttonAppear < 1) {
      buttonAppear = Math.min(1, buttonAppear + dt * 1.35);
      const eased = 1 - Math.pow(1 - buttonAppear, 3);
      buttonGroup.scale.setScalar(0.01 + eased * 0.99);
      buttonGlow.intensity = 5.2 * eased;
      buttonFill.intensity = 1.6 * eased;
      rim.intensity = 2.4 * eased;
    }

    if (inGame && alive) {
      const pulse = 2.2 + Math.sin(t * 2.4) * 0.35;
      buttonMat.emissiveIntensity = pressing ? 3.5 : pulse;
      buttonTopMat.emissiveIntensity = pressing ? 4.0 : pulse + 0.4;
      if (buttonAppear >= 1) {
        buttonGlow.intensity = pressing ? 7.5 : 4.8 + Math.sin(t * 2.4) * 0.9;
        buttonFill.intensity = pressing ? 2.8 : 1.4 + Math.sin(t * 2.4) * 0.35;
      }
      glowDisc.material.opacity = 0.34 + Math.sin(t * 2.4) * 0.1;
      halo.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.12;
      overhead.intensity =
        0.4 + Math.sin(t * 7.3) * 0.06 + (Math.random() > 0.97 ? 0.15 : 0);

      camera.position.x = buttonShiftX * 0.35 + Math.sin(t * 0.35) * 0.025;
      camera.position.y = 1.28 + Math.sin(t * 0.5) * 0.012;
      camera.lookAt(buttonShiftX, 0.7, 0);
    }

    const pos = motes.geometry.attributes.position;
    for (let i = 0; i < moteCount; i++) {
      let y = pos.getY(i) + 0.004;
      if (y > 5) y = 0.2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;

    if (inGame || entering || document.body.classList.contains("is-playing")) {
      renderer.render(scene, camera);
    } else {
      renderer.setClearColor(0x050807, 1);
      renderer.clear();
    }
  }

  animate();
  window.__enterTheButton = enterGame;

  window.addEventListener("pagehide", saveActiveRun);
  window.addEventListener("beforeunload", saveActiveRun);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveActiveRun();
  });

  const pendingRun = readActiveRun();
  if (pendingRun) {
    resumeActiveRun(pendingRun);
  } else {
    document.body.classList.remove("is-resuming");
  }
})();
