/* global ethers */

const CONFIG = {
  // Sepolia
  expectedChainId: 11155111n,
  expectedChainIdHex: "0xaa36a7",
  explorerBase: "https://sepolia.etherscan.io/tx/",

  // ====== ВСТАВИШЬ ПОСЛЕ ДЕПЛОЯ ======
  crowdfundingAddress: "0x...", // Ilon
  tokenAddress: "0x...",        // MoonQueue

  // Если контракт токена задеплоен давно, можно ускорить:
  // поставить block, с которого начинать поиск JoinedQueue.
  // Если не знаешь — оставь 0 (будет медленнее).
  tokenDeploymentBlock: 0,

  // Safety limits
  maxUsersToCheck: 600
};

// ==== ABIs (минимально нужное) ====
const CROWDFUNDING_ABI = [
  "function createCrowdFunding(string _title, string _description, uint256 _goal, uint256 _startAt, uint256 _endAt) external",
  "function contribute(uint256 _id) payable",
  "function claim(uint256 _id)",
  "function crowdFundings(uint256) view returns (address owner, string title, string description, uint256 goal, uint256 pledged, uint256 startAt, uint256 endAt, bool claimed)",
  "function pledgedAmount(uint256 campaignId, address user) view returns (uint256)",
  "function crowdFundingCount() view returns (uint256)"
];

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event JoinedQueue(address indexed user, uint256 tokensMinted)"
];

let provider, signer, userAddress;
let crowdfunding, token;

// --- helpers ---
const $ = (id) => document.getElementById(id);

function setText(id, t) { $(id).textContent = t; }
function setHTML(id, h) { $(id).innerHTML = h; }

function shortAddr(a) {
  if (!a) return "—";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function txLink(hash) {
  if (!hash) return "";
  const url = CONFIG.explorerBase + hash;
  return `<a href="${url}" target="_blank" rel="noreferrer">View on explorer</a>`;
}

function configReady() {
  return (
    CONFIG.crowdfundingAddress?.startsWith("0x") && CONFIG.crowdfundingAddress.length === 42 &&
    CONFIG.tokenAddress?.startsWith("0x") && CONFIG.tokenAddress.length === 42 &&
    CONFIG.crowdfundingAddress !== "0x..." &&
    CONFIG.tokenAddress !== "0x..."
  );
}

async function monitorTx(txPromise, boxId) {
  setHTML(boxId, "Sending transaction...");
  try {
    const tx = await txPromise;
    setHTML(boxId, `Submitted: <b>${tx.hash}</b><br/>${txLink(tx.hash)}`);

    const receipt = await tx.wait();
    if (receipt.status === 1) {
      setHTML(boxId, `<span class="good">Success</span> ✅<br/>Tx: <b>${tx.hash}</b><br/>${txLink(tx.hash)}`);
    } else {
      setHTML(boxId, `<span class="bad">Failed</span> ❌<br/>Tx: <b>${tx.hash}</b><br/>${txLink(tx.hash)}`);
    }
    return receipt;
  } catch (e) {
    setHTML(boxId, `<span class="bad">Error</span>: ${escapeHtml(e?.shortMessage || e?.message || String(e))}`);
    return null;
  }
}

// --- core ---
async function connect() {
  if (!window.ethereum) {
    alert("MetaMask not found.");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  setText("walletStatus", `Connected: ${userAddress}`);

  await verifyNetwork();
  initContracts();

  await refreshBalances();
  await loadCampaigns();
  await loadLeaderboard();

  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

async function verifyNetwork() {
  const net = await provider.getNetwork();
  const chainId = BigInt(net.chainId);
  setText("networkStatus", `${net.name} (chainId: ${chainId})`);

  if (chainId !== CONFIG.expectedChainId) {
    setText("networkHint", `Wrong network. Expected Sepolia (11155111), got ${chainId}`);
    $("networkHint").classList.remove("good");
    $("networkHint").classList.add("bad");
  } else {
    setText("networkHint", "Network OK (Sepolia)");
    $("networkHint").classList.remove("bad");
    $("networkHint").classList.add("good");
  }
}

function initContracts() {
  if (!configReady()) {
    setText("tokenMeta", "Set contract addresses in app.js (CONFIG.crowdfundingAddress / tokenAddress)");
    return;
  }

  crowdfunding = new ethers.Contract(CONFIG.crowdfundingAddress, CROWDFUNDING_ABI, signer);
  token = new ethers.Contract(CONFIG.tokenAddress, TOKEN_ABI, provider);

  setText("tokenMeta", `MoonQueue @ ${shortAddr(CONFIG.tokenAddress)}`);
}

async function refreshBalances() {
  if (!provider || !userAddress) return;

  const eth = await provider.getBalance(userAddress);
  setText("ethBalance", `${ethers.formatEther(eth)} ETH`);

  if (token) {
    try {
      const bal = await token.balanceOf(userAddress);
      setText("tokenBalance", `${bal.toString()} MQ`); // decimals не дали, поэтому показываем raw
    } catch {
      setText("tokenBalance", "—");
    }
  }
}

// --- actions ---
async function createCampaign() {
  if (!crowdfunding) return alert("Connect + set contract addresses.");

  const title = $("cTitle").value.trim();
  const desc = $("cDesc").value.trim();
  const goalEth = $("cGoalEth").value.trim();
  const startAt = $("cStartAt").value.trim();
  const endAt = $("cEndAt").value.trim();

  if (!title || !desc || !goalEth || !startAt || !endAt) {
    alert("Fill all fields.");
    return;
  }

  // _goal в контракте uint. Обычно это WEI. UI вводит ETH → переводим в wei.
  const goalWei = ethers.parseEther(goalEth);

  const receipt = await monitorTx(
    crowdfunding.createCrowdFunding(title, desc, goalWei, BigInt(startAt), BigInt(endAt)),
    "createTx"
  );

  if (receipt) {
    await loadCampaigns();
  }
}

async function contribute() {
  if (!crowdfunding) return alert("Connect + set contract addresses.");

  const idStr = $("campaignId").value.trim();
  const amountEth = $("contribEth").value.trim();

  if (idStr === "") return alert("Enter campaign ID.");
  if (!amountEth) return alert("Enter ETH amount.");

  const id = BigInt(idStr);
  const value = ethers.parseEther(amountEth);

  const receipt = await monitorTx(
    crowdfunding.contribute(id, { value }),
    "contribTx"
  );

  if (receipt) {
    await refreshBalances();
    await loadCampaigns();
    await loadLeaderboard(); // если за вклад минтятся токены
  }
}

async function claim() {
  if (!crowdfunding) return alert("Connect + set contract addresses.");

  const idStr = $("campaignId").value.trim();
  if (idStr === "") return alert("Enter campaign ID.");
  const id = BigInt(idStr);

  const receipt = await monitorTx(
    crowdfunding.claim(id),
    "contribTx"
  );

  if (receipt) {
    await refreshBalances();
    await loadCampaigns();
  }
}

// --- reads ---
async function loadCampaigns() {
  if (!crowdfunding || !provider) {
    setText("campaignsList", "Connect + configure contract.");
    return;
  }

  setText("campaignsList", "Loading...");
  try {
    const count = await crowdfunding.crowdFundingCount();
    const n = Number(count);

    if (n === 0) {
      setText("campaignsList", "— no campaigns —");
      return;
    }

    const items = [];
    for (let i = 0; i < n; i++) {
      const cf = await crowdfunding.crowdFundings(i);

      const owner = cf.owner;
      const title = cf.title;
      const description = cf.description;
      const goalEth = ethers.formatEther(cf.goal);
      const pledgedEth = ethers.formatEther(cf.pledged);
      const start = new Date(Number(cf.startAt) * 1000).toLocaleString();
      const end = new Date(Number(cf.endAt) * 1000).toLocaleString();
      const claimed = cf.claimed;

      // user pledged
      let mine = "—";
      try {
        const p = await crowdfunding.pledgedAmount(i, userAddress);
        mine = ethers.formatEther(p);
      } catch {}

      items.push(`
        <div class="item">
          <div class="top">
            <div>
              <div><b>#${i}</b> ${escapeHtml(title)} <span class="badge">${shortAddr(owner)}</span></div>
              <div class="muted small">${escapeHtml(description)}</div>
              <div class="muted small">
                Goal: ${goalEth} ETH • Pledged: ${pledgedEth} ETH • You: ${mine} ETH
              </div>
              <div class="muted small">
                Start: ${escapeHtml(start)} • End: ${escapeHtml(end)} • Claimed: ${claimed ? "<span class='good'>yes</span>" : "no"}
              </div>
            </div>
            <button class="btn ghost" onclick="fillId(${i})">Use</button>
          </div>
        </div>
      `);
    }

    setHTML("campaignsList", items.join(""));
  } catch (e) {
    setText("campaignsList", "Error loading campaigns (check address/ABI).");
  }
}

// expose for button
window.fillId = function (i) {
  $("campaignId").value = String(i);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// --- leaderboard ---
async function loadLeaderboard() {
  if (!token || !provider || !configReady()) {
    setText("leaderboard", "Connect + configure token address.");
    return;
  }

  setText("leaderboard", "Reading JoinedQueue events...");

  try {
    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, Number(CONFIG.tokenDeploymentBlock || 0));

    // filter JoinedQueue(user,tokensMinted)
    const filter = token.filters.JoinedQueue(null, null);
    const logs = await token.queryFilter(filter, fromBlock, latest);

    const usersSet = new Set();
    for (const log of logs) {
      const u = log.args?.user;
      if (u && ethers.isAddress(u)) usersSet.add(u.toLowerCase());
      if (usersSet.size >= CONFIG.maxUsersToCheck) break;
    }

    const users = Array.from(usersSet);
    if (!users.length) {
      setText("leaderboard", "— no JoinedQueue events found (check tokenDeploymentBlock) —");
      return;
    }

    setText("leaderboard", `Found ${users.length} users. Fetching balances...`);

    const rows = [];
    for (const addr of users) {
      try {
        const bal = await token.balanceOf(addr);
        rows.push({ addr, bal });
      } catch {}
    }

    rows.sort((a, b) => (b.bal > a.bal ? 1 : b.bal < a.bal ? -1 : 0));
    const top = rows.slice(0, 15);

    const html = top.map((x, idx) => `
      <div class="item">
        <div class="top">
          <div>
            <b>#${idx + 1}</b> <span class="badge">${shortAddr(x.addr)}</span>
            <div class="muted small">${x.bal.toString()} MQ</div>
          </div>
        </div>
      </div>
    `).join("");

    setHTML("leaderboard", html || "—");
  } catch (e) {
    setText("leaderboard", "Leaderboard error (range too big / wrong address / RPC limits).");
  }
}

// --- UI binding ---
function bindUI() {
  $("btnConnect").addEventListener("click", connect);
  $("btnCreateCampaign").addEventListener("click", createCampaign);
  $("btnContribute").addEventListener("click", contribute);
  $("btnClaim").addEventListener("click", claim);
  $("btnRefreshCampaigns").addEventListener("click", loadCampaigns);
  $("btnRefreshLeaderboard").addEventListener("click", loadLeaderboard);
}

bindUI();
