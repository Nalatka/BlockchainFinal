# Moon Queue Frontend

Lightweight frontend for the "Moon Queue" token project. This demo lets users connect a MetaMask wallet, view or simulate token balances, buy tokens (simulated by default), and see queue position (higher token balance -> earlier flight).

Features
- Connect to MetaMask
- Read ERC-20 token balance (if you provide a contract address)
- "Buy tokens" flow: will call on-chain buy function if contract address + ABI are provided, otherwise it simulates purchases locally
- Leaderboard/queue ordered by token holdings

How to run

- Option A (quick, no build): open `index.html` in a browser with MetaMask installed. For some browsers, directly opening the file works fine. If you run into CORS or file access issues, serve the folder with a simple static server (examples below).
- Option B (recommended): use a local static server from the repo root. In PowerShell:

```powershell
# If you have Python 3 installed
python -m http.server 8000

# Or run the included Node server (recommended)
npm install
npm start

# then open http://localhost:3000
```

Then open http://localhost:8000 in your browser.

Wiring to a real contract

- If you have a token sale / contract with a payable `buyTokens()` or similar method, paste the contract address and ABI into the UI (there are inputs for that). The app will attempt to call `buyTokens` with the ETH amount you enter. If your contract uses another method name, you can edit `src/app.js` to use the correct method.
- To read token balances, provide an ERC-20 ABI (the standard minimal ABI works) and the token contract address.

Notes & assumptions
- This frontend is a demo and includes a simulated-mode so you can test UX without deploying a contract.
- I assumed no smart contract or ABI was provided. If you share the contract address and ABI I can update the UI defaults to call your contract directly and add safety checks.

Next steps I can help with
- Wire this to your real sale contract and add IPFS-based user avatars
- Add server-side leaderboard persistence and signed receipts
- Build a React/Vite app or integrate with your existing codebase
