const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying SmartWallet with owner account:", deployer.address);

  // Deploy SmartWallet
  const SmartWallet = await hre.ethers.getContractFactory("SmartWallet");
  const wallet = await SmartWallet.deploy(deployer.address);
  await wallet.waitForDeployment();

  const address = await wallet.getAddress();
  console.log("SmartWallet successfully deployed to:", address);

  // Update configuration files
  const rootEnvPath = path.join(__dirname, "../.env");
  const frontendConfigPath = path.join(__dirname, "../frontend/config.json");

  updateEnvFile(rootEnvPath, address);
  updateJSONConfig(frontendConfigPath, address);
}

function updateEnvFile(filePath, deployedAddress) {
  let content = "";
  
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
    
    // Check if key already exists
    if (content.match(/VITE_SMART_WALLET_ADDRESS\s*=\s*/)) {
      content = content.replace(
        /VITE_SMART_WALLET_ADDRESS\s*=\s*([^\n]*)/,
        `VITE_SMART_WALLET_ADDRESS=${deployedAddress}`
      );
    } else {
      content += `\nVITE_SMART_WALLET_ADDRESS=${deployedAddress}`;
    }
  } else {
    // Create new .env file with default configurations
    content = `# Deployed Smart Contract Wallet Address
VITE_SMART_WALLET_ADDRESS=${deployedAddress}

# Sepolia Testnet RPC URL
VITE_SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia

# Sepolia Chain ID (11155111)
VITE_CHAIN_ID=11155111
`;
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Successfully wrote deployed address to env: ${filePath}`);
}

function updateJSONConfig(filePath, deployedAddress) {
  let content = {
    "VITE_SMART_WALLET_ADDRESS": deployedAddress,
    "VITE_SEPOLIA_RPC_URL": "https://rpc.ankr.com/eth_sepolia",
    "VITE_CHAIN_ID": 11155111
  };
  
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const existing = JSON.parse(raw);
      content = { ...content, ...existing, "VITE_SMART_WALLET_ADDRESS": deployedAddress };
    } catch (err) {
      // Ignore parse error and overwrite
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf8");
  console.log(`Successfully wrote deployed address to frontend config: ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
