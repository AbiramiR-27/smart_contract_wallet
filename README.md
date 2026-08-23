# Aura Smart Contract Wallet

A premium Web3 single-signature Smart Contract Wallet interface built from scratch using standard HTML, CSS, Ethers.js v6, and Solidity. This DApp connects to your MetaMask EOA wallet to sign transactions and execute arbitrary calls on behalf of a pre-deployed smart contract wallet on the Sepolia Testnet.

---

## ✨ Features

- **EOA MetaMask Connection:** Connect your MetaMask wallet to act as the primary owner/signer of the Smart Wallet contract.
- **Cryptographic Session Authentication:** Employs a zero-gas message signing challenge to authenticate and secure your session before unlocking private client features.
- **Total Balance Tracking:** Displays the smart wallet's native ETH and USDC token balance dynamically (pre-configured to Sepolia USDC).
- **Dark/Light Mode Theme Toggle:** Fully responsive theme switcher mapping premium glassmorphism layouts in both Dark (Void Holographic) and Light (Frost Glassmorphism) modes with high-contrast accessibility.
- **Low-Level Bytecode Execution:** Propose, review, and execute arbitrary transactions or function calls from the contract wallet (restricted to the EOA owner).
- **Activity Log & Explorer Links:** Scans RPC events for transaction history logs, linking executions directly to Etherscan Sepolia.
- **Static Configuration Server-Safe:** Bypasses browser cache blocks on dotfiles by serving configurations dynamically from `config.json` with cache-busting.

---

## 📁 Repository Structure

- `contracts/SmartWallet.sol`: The Solidity smart contract wallet enforcing single-sign EOA ownership and raw call executions.
- `test/SmartWallet.test.js`: Hardhat unit tests (11 passing assertions) validating deployment bounds, deposits, reverts on calldata, and non-owner execution denials.
- `scripts/deploy.js`: Compiles the contract and automatically updates local `.env` and `frontend/config.json` configurations.
- `frontend/index.html`: Dashboard layout containing the authentication gate and feature tabs.
- `frontend/style.css`: Void holographic responsive CSS layout with Light Mode overrides.
- `frontend/app.js`: Web3 provider integration logic, signature recoveries, event filtering, and DOM bindings.
- `frontend/config.json`: Private client network configurations.

---

## 🚀 Getting Started

### 1. Installation
Install dependencies in the root directory:
```bash
npm install
```

### 2. Run Unit Tests
Validate the smart contract rules using Hardhat:
```bash
npx hardhat test
```

### 3. Running Locally
Serve the static frontend directory:
```bash
npx live-server frontend
```
*Note: Make sure your MetaMask is connected to **Sepolia Testnet**.*

---

## 🔧 Environment Configurations
To configure the DApp to interact with another deployed smart wallet contract:

1. Create a `config.json` inside the `frontend/` folder matching this layout:
```json
{
  "VITE_SMART_WALLET_ADDRESS": "0x9fe904239108b223a32a265465cbd4b40c7d173b",
  "VITE_SEPOLIA_RPC_URL": "https://rpc.ankr.com/eth_sepolia",
  "VITE_CHAIN_ID": 11155111
}
```
2. Update the values with your deployed contract address and RPC parameters. The client will parse the configurations automatically.
