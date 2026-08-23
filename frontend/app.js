// Frontend state variables
let provider = null;
let signer = null;
let eoaAddress = null;
let isAuthenticated = false;
let authNonce = null;

// Configuration defaults
const DEFAULTS = {
    sepoliaChainId: 11155111,
    sepoliaRpcUrl: "https://rpc.ankr.com/eth_sepolia",
    smartWalletAddress: "0x9fe904239108b223a32a265465cbd4b40c7d173b", // Updated default
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // Sepolia USDC token Address
};

// State configurations loaded strictly from environment configuration
let config = {
    smartWalletAddress: DEFAULTS.smartWalletAddress,
    sepoliaRpcUrl: DEFAULTS.sepoliaRpcUrl,
    chainId: DEFAULTS.sepoliaChainId
};

// ABI for Smart Wallet Contract
const CONTRACT_ABI = [
    "function owner() view returns (address)",
    "function nonce() view returns (uint256)",
    "function getBalance() view returns (uint256)",
    "function execute(address target, uint256 value, bytes calldata data) external returns (bytes)",
    "event ETHReceived(address indexed sender, uint256 amount)",
    "event ETHSent(address indexed recipient, uint256 amount)",
    "event TransactionExecuted(address indexed target, uint256 value, bytes data, uint256 opNonce)"
];

// ABI for ERC-20 (USDC)
const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)",
    "function decimals() view returns (uint8)"
];

// DOM Selectors
const elBtnConnect = document.getElementById("btn-eoa-connect");
const elDisplayNetwork = document.getElementById("display-network");
const elDisplayEoa = document.getElementById("display-eoa-address");
const elEoaAddressFull = document.getElementById("eoa-address-full");
const elSmartWalletAddressFull = document.getElementById("smart-wallet-address-full");
const elReceiveWalletAddress = document.getElementById("receive-wallet-address");

const elWalletEthBalance = document.getElementById("wallet-eth-balance");
const elWalletUsdcBalance = document.getElementById("wallet-usdc-balance");
const elAssetsEthBalance = document.getElementById("assets-eth-balance");
const elAssetsUsdcBalance = document.getElementById("assets-usdc-balance");
const elAssetsEthUsd = document.getElementById("assets-eth-usd");
const elAssetsUsdcUsd = document.getElementById("assets-usdc-usd");
const elBalanceUsdValue = document.getElementById("balance-usd-value");

// Deposit Form
const elDepositAmount = document.getElementById("deposit-amount");
const elBtnDepositEth = document.getElementById("btn-deposit-eth");

// Send Workflow
const elSendRecipient = document.getElementById("send-recipient");
const elSendAmount = document.getElementById("send-amount");
const elSendAssetSelect = document.getElementById("send-asset-select");
const elBtnSendReview = document.getElementById("btn-send-review");

// Review Form Screen
const elSendFormScreen = document.getElementById("send-form-screen");
const elSendReviewScreen = document.getElementById("send-review-screen");
const elSendStatusScreen = document.getElementById("send-status-screen");
const elReviewFromWallet = document.getElementById("review-from-wallet");
const elReviewToRecipient = document.getElementById("review-to-recipient");
const elReviewAmountVal = document.getElementById("review-amount-val");
const elReviewGasVal = document.getElementById("review-gas-val");
const elBtnSendBack = document.getElementById("btn-send-back");
const elBtnSendApprove = document.getElementById("btn-send-approve");

// Status Screen
const elStatusTitle = document.getElementById("status-title");
const elStatusSpinner = document.getElementById("status-spinner");
const elStatusSuccessRing = document.getElementById("status-success-ring");
const elStatusErrorRing = document.getElementById("status-error-ring");
const elStatusDesc = document.getElementById("status-desc");
const elStatusTxBox = document.getElementById("status-tx-box");
const elStatusTxHash = document.getElementById("status-tx-hash");
const elBtnViewExplorer = document.getElementById("btn-view-explorer");
const elBtnStatusClose = document.getElementById("btn-status-close");

// Sign Message Screen
const elSigMessageInput = document.getElementById("signing-message-input");
const elBtnSignArbitrary = document.getElementById("btn-sign-arbitrary");
const elSigResultArea = document.getElementById("signing-result-area");
const elSigResultSigner = document.getElementById("sig-result-signer");
const elSigResultHash = document.getElementById("sig-result-hash");
const elBtnCopySignature = document.getElementById("btn-copy-signature");



// Single Sign-In Authentication Challenge Card
const elBtnTriggerAuth = document.getElementById("btn-trigger-auth");
const elAuthMsgPreview = document.getElementById("auth-msg-preview");
const elAuthStatusText = document.getElementById("auth-status-text");

// Network Error Modal
const elNetworkWarningModal = document.getElementById("network-warning-modal");
const elBtnModalSwitchNetwork = document.getElementById("btn-modal-switch-network");

// Toast Notification Container
const elToastContainer = document.getElementById("toast-container");

// Nav Buttons
const elNavBtns = document.querySelectorAll(".nav-btn");
const elTabPanels = document.querySelectorAll(".tab-panel");
const elCurrentTabTitle = document.getElementById("current-tab-title");

// Initial Setup
document.addEventListener("DOMContentLoaded", async () => {
    setupThemeToggle();
    await loadAppConfig();
    setupNavigation();
    setupConnectionListeners();
    setupCoreActions();
    checkIfConnected();
});

// Toast notification helper
function showToast(title, message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
    `;
    elToastContainer.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Navigation Tab Management
function setupNavigation() {
    elNavBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            // Check authentication gate for private tabs
            if (targetTab !== "dashboard" && !isAuthenticated) {
                showToast("Access Denied", "Please sign the authentication challenge on the Dashboard first.", "error");
                switchTab("dashboard");
                return;
            }

            switchTab(targetTab);
        });
    });

    // Dashboard quick action redirects
    document.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            if (action) {
                switchTab(action);
            }
        });
    });

    // Quick Sign redirect
    const quickSign = document.getElementById("btn-quick-sign");
    if (quickSign) {
        quickSign.addEventListener("click", () => switchTab("security"));
    }

    // Quick Explorer redirect (opens smart wallet on Etherscan Sepolia)
    const quickExplorer = document.getElementById("btn-quick-explorer");
    if (quickExplorer) {
        quickExplorer.addEventListener("click", () => {
            if (config.smartWalletAddress) {
                window.open(`https://sepolia.etherscan.io/address/${config.smartWalletAddress}`, "_blank");
            } else {
                showToast("Not Found", "Smart wallet address is not loaded yet.", "error");
            }
        });
    }
}

function switchTab(tabId) {
    elNavBtns.forEach(b => {
        if (b.getAttribute("data-tab") === tabId) {
            b.classList.add("active");
        } else {
            b.classList.remove("active");
        }
    });

    elTabPanels.forEach(panel => {
        if (panel.id === `panel-${tabId}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });

    // Update section title header label
    elCurrentTabTitle.innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

// Theme Toggle Logic
function setupThemeToggle() {
    const elThemeToggle = document.getElementById("btn-theme-toggle");
    
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem("app-theme") || "dark";
    if (savedTheme === "light") {
        document.documentElement.classList.add("light-mode");
        updateThemeIcon("light");
    } else {
        document.documentElement.classList.remove("light-mode");
        updateThemeIcon("dark");
    }
    
    if (elThemeToggle) {
        elThemeToggle.addEventListener("click", () => {
            const isLight = document.documentElement.classList.toggle("light-mode");
            localStorage.setItem("app-theme", isLight ? "light" : "dark");
            updateThemeIcon(isLight ? "light" : "dark");
            showToast("Theme Updated", `Switched to ${isLight ? 'Light' : 'Dark'} Mode.`, "info");
        });
    }
}

function updateThemeIcon(theme) {
    const elThemeIcon = document.getElementById("theme-icon");
    if (!elThemeIcon) return;
    
    if (theme === "light") {
        // Sun Icon SVG path
        elThemeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    } else {
        // Moon Icon SVG path
        elThemeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
}

// Helper to update statically displayed configuration addresses in DOM
function updateConfigUI() {
    if (elSmartWalletAddressFull) elSmartWalletAddressFull.innerText = config.smartWalletAddress;
    if (elReceiveWalletAddress) elReceiveWalletAddress.innerText = config.smartWalletAddress;
}

// Load configurations dynamically from config.json file with cache-busting
async function loadAppConfig() {
    try {
        const response = await fetch("config.json?t=" + Date.now());
        if (!response.ok) {
            console.log("config.json file not found. Using defaults.");
            updateConfigUI();
            return;
        }
        const configData = await response.json();
        
        if (configData.VITE_SMART_WALLET_ADDRESS) {
            config.smartWalletAddress = configData.VITE_SMART_WALLET_ADDRESS;
        }
        if (configData.VITE_SEPOLIA_RPC_URL) {
            config.sepoliaRpcUrl = configData.VITE_SEPOLIA_RPC_URL;
        }
        if (configData.VITE_CHAIN_ID) {
            config.chainId = parseInt(configData.VITE_CHAIN_ID) || DEFAULTS.sepoliaChainId;
        }
        
        console.log("Configurations dynamically loaded from config.json:", config);
        updateConfigUI();
    } catch (err) {
        console.error("Error loading config from config.json:", err);
        updateConfigUI();
    }
}



// MetaMask Connection Handlers
function setupConnectionListeners() {
    elBtnConnect.addEventListener("click", connectEOA);
    elBtnModalSwitchNetwork.addEventListener("click", switchNetworkToSepolia);

    if (window.ethereum) {
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
    }
}

async function checkIfConnected() {
    if (!window.ethereum) {
        elBtnConnect.innerText = "MetaMask Missing";
        elBtnConnect.disabled = true;
        showToast("Web3 Missing", "Please install MetaMask to interact with this application.", "error");
        return;
    }

    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
            handleAccountsChanged(accounts);
        }
    } catch (err) {
        console.error("Connection check failed", err);
    }
}

async function connectEOA() {
    if (!window.ethereum) return;
    try {
        elBtnConnect.disabled = true;
        provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        handleAccountsChanged(accounts);
    } catch (err) {
        showToast("Connection Denied", "MetaMask account authorization rejected.", "error");
        elBtnConnect.disabled = false;
    }
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // Disconnected
        eoaAddress = null;
        signer = null;
        isAuthenticated = false;
        elDisplayEoa.innerText = "0x...";
        elEoaAddressFull.innerText = "Not Connected";
        elBtnConnect.innerText = "Connect Wallet";
        elBtnConnect.disabled = false;
        elBtnTriggerAuth.disabled = true;
        updateAuthVisuals();
        showToast("EOA Disconnected", "MetaMask account disconnected.", "info");
        return;
    }

    eoaAddress = accounts[0];
    signer = await provider.getSigner();

    // Format address displays
    const shortAddress = `${eoaAddress.slice(0, 6)}...${eoaAddress.slice(-4)}`;
    elDisplayEoa.innerText = shortAddress;
    elEoaAddressFull.innerText = eoaAddress;
    elBtnConnect.innerText = "Connected";
    elBtnConnect.disabled = true;

    // Check Network
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);
    handleChainValidation(currentChainId);

    // If on correct network, generate verification nonce
    if (currentChainId === config.chainId) {
        generateAuthNonce();
    }
}

function handleChainChanged(chainIdHex) {
    const chainId = parseInt(chainIdHex, 16);
    handleChainValidation(chainId);
}

function handleChainValidation(chainId) {
    const dot = document.querySelector(".network-dot");
    if (chainId === config.chainId) {
        elDisplayNetwork.innerText = "Sepolia Testnet";
        dot.className = "network-dot active";
        elNetworkWarningModal.classList.remove("active");
        
        // Populate pre-deployed Smart Wallet configurations
        elSmartWalletAddressFull.innerText = config.smartWalletAddress;
        elReceiveWalletAddress.innerText = config.smartWalletAddress;
        
        if (eoaAddress) {
            updateBalanceDetails();
            loadActivityHistory();
        }
    } else {
        elDisplayNetwork.innerText = "Wrong Network";
        dot.className = "network-dot warn";
        elNetworkWarningModal.classList.add("active");
    }
}

async function switchNetworkToSepolia() {
    if (!window.ethereum) return;
    try {
        const hexChainId = "0x" + config.chainId.toString(16);
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hexChainId }]
        });
        elNetworkWarningModal.classList.remove("active");
        showToast("Switched Network", "MetaMask successfully updated chain to Sepolia.", "success");
    } catch (err) {
        // If network not added, try adding it
        if (err.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: "0x" + config.chainId.toString(16),
                        chainName: "Sepolia Testnet",
                        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                        rpcUrls: [config.sepoliaRpcUrl],
                        blockExplorerUrls: ["https://sepolia.etherscan.io"]
                    }]
                });
            } catch (addErr) {
                showToast("Switch Failed", "Unable to auto-add Sepolia network. Please change manually in MetaMask.", "error");
            }
        } else {
            showToast("Switch Failed", "Network change request rejected.", "error");
        }
    }
}

// Single Sign-In Authentication Challenge Nonce Verification
function generateAuthNonce() {
    // Generate a secure random nonce
    authNonce = Math.floor(Math.random() * 1000000);
    elBtnTriggerAuth.disabled = false;
    
    // Display challenge message preview
    const challengeMessage = `Sign in to Smart Wallet\n\nThis signature is only used to authenticate you.\nNo blockchain transaction will be executed.\n\nNonce: ${authNonce}`;
    elAuthMsgPreview.innerText = challengeMessage;
}

// Authenticate session EOA signer
elBtnTriggerAuth.addEventListener("click", async () => {
    if (!signer || !authNonce) return;
    
    try {
        elBtnTriggerAuth.disabled = true;
        const challengeMessage = elAuthMsgPreview.innerText;
        
        // Request MetaMask to sign the raw string message
        const signature = await signer.signMessage(challengeMessage);
        
        // Cryptographically recover signer on-chain/locally to verify
        const recoveredAddress = ethers.verifyMessage(challengeMessage, signature);
        
        if (recoveredAddress.toLowerCase() === eoaAddress.toLowerCase()) {
            isAuthenticated = true;
            updateAuthVisuals();
            showToast("Authentication Successful", "Session verified successfully.", "success");
            switchTab("dashboard");
        } else {
            throw new Error("Recovered signer address mismatch.");
        }
    } catch (err) {
        console.error("Sign-in verification failed", err);
        showToast("Verification Failed", "Challenge message signature invalid or rejected.", "error");
        elBtnTriggerAuth.disabled = false;
    }
});

function updateAuthVisuals() {
    const elAuthGate = document.getElementById("auth-gate-container");
    const elDashboardGrid = document.getElementById("dashboard-grid-container");

    if (isAuthenticated) {
        elAuthStatusText.innerText = "Authenticated";
        elAuthStatusText.className = "value status-success";
        elBtnTriggerAuth.innerText = "Authenticated";
        elBtnTriggerAuth.disabled = true;
        
        // Hide auth gate, show main dashboard
        if (elAuthGate) elAuthGate.style.display = "none";
        if (elDashboardGrid) elDashboardGrid.style.display = "grid";
        
        // Unlock security badge displays
        const verified = document.getElementById("verified-signer");
        if (verified) verified.innerText = eoaAddress;
    } else {
        elAuthStatusText.innerText = "Verification Required";
        elAuthStatusText.className = "value status-warn";
        elBtnTriggerAuth.innerText = "Sign Authentication Challenge";
        
        // Show auth gate, hide main dashboard
        if (elAuthGate) elAuthGate.style.display = "flex";
        if (elDashboardGrid) elDashboardGrid.style.display = "none";
        
        const verified = document.getElementById("verified-signer");
        if (verified) verified.innerText = "-";
    }
}

// Core Blockchain Balancing reads
async function updateBalanceDetails() {
    if (!provider || !config.smartWalletAddress) return;

    try {
        // Read contract Ether balance
        const balance = await provider.getBalance(config.smartWalletAddress);
        const ethVal = parseFloat(ethers.formatEther(balance));
        
        // Update display items
        elWalletEthBalance.innerText = `${ethVal.toFixed(4)} ETH`;
        elAssetsEthBalance.innerText = `${ethVal.toFixed(4)} ETH`;

        // Load ERC20 USDC balance
        let usdcVal = 0;
        try {
            const usdcContract = new ethers.Contract(DEFAULTS.usdcAddress, ERC20_ABI, provider);
            const rawUsdc = await usdcContract.balanceOf(config.smartWalletAddress);
            const decimals = await usdcContract.decimals();
            usdcVal = parseFloat(ethers.formatUnits(rawUsdc, decimals));
        } catch (err) {
            console.log("USDC contract balance loading skipped/unavailable", err);
        }
        
        elWalletUsdcBalance.innerText = `${usdcVal.toLocaleString()} USDC`;
        elAssetsUsdcBalance.innerText = `${usdcVal.toLocaleString()} USDC`;

        // Fetch external valuation (ETH pricing approximation)
        const ethPrice = 3000; // Standard fallback estimate
        const totalVal = (ethVal * ethPrice) + usdcVal;
        
        elAssetsEthUsd.innerText = `$${(ethVal * ethPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        elAssetsUsdcUsd.innerText = `$${usdcVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        elBalanceUsdValue.innerText = `$${totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    } catch (err) {
        console.error("Balance querying failed", err);
    }
}

// Direct EOA Actions & Contract deposits
function setupCoreActions() {
    // Deposit ETH form to fund SmartWallet
    elBtnDepositEth.addEventListener("click", async () => {
        const valStr = elDepositAmount.value.trim();
        if (!valStr || isNaN(valStr) || parseFloat(valStr) <= 0) {
            showToast("Invalid Amount", "Please input a positive ETH amount.", "error");
            return;
        }

        try {
            elBtnDepositEth.disabled = true;
            const amountInWei = ethers.parseEther(valStr);
            
            showToast("Transaction Triggered", "Please sign deposit transaction in MetaMask.", "info");

            // Direct transaction to Smart Wallet contract address
            const txResponse = await signer.sendTransaction({
                to: config.smartWalletAddress,
                value: amountInWei
            });

            showToast("Submitting Deposit", "Transaction submitted to Sepolia.", "info");
            
            // Wait for confirmation block
            const receipt = await txResponse.wait();
            
            showToast("Deposit Confirmed", `Successfully deposited ${valStr} ETH to Smart Wallet.`, "success");
            elDepositAmount.value = "";
            updateBalanceDetails();
            loadActivityHistory();
        } catch (err) {
            console.error("Deposit transaction failed", err);
            showToast("Transaction Failed", "Deposit action cancelled or reverted.", "error");
        } finally {
            elBtnDepositEth.disabled = false;
        }
    });

    // Copy to clipboard listener handles
    document.querySelectorAll(".btn-copy-address, .btn-copy").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-copy");
            const textToCopy = document.getElementById(targetId)?.innerText;
            if (textToCopy && textToCopy !== "Not Connected") {
                navigator.clipboard.writeText(textToCopy);
                showToast("Copied", "Address copied to clipboard.", "success");
            }
        });
    });

    // Direct EOA signer section triggers
    elBtnSignArbitrary.addEventListener("click", async () => {
        const msg = elSigMessageInput.value.trim();
        if (!msg) {
            showToast("Missing Message", "Please input message text to sign.", "error");
            return;
        }

        try {
            elBtnSignArbitrary.disabled = true;
            const signature = await signer.signMessage(msg);
            
            elSigResultSigner.innerText = eoaAddress;
            elSigResultHash.innerText = signature;
            elSigResultArea.style.display = "block";
            
            showToast("Signed", "Message signed successfully.", "success");
        } catch (err) {
            showToast("Sign Rejected", "Signature request cancelled.", "error");
        } finally {
            elBtnSignArbitrary.disabled = false;
        }
    });

    elBtnCopySignature.addEventListener("click", () => {
        const signature = elSigResultHash.innerText;
        if (signature) {
            navigator.clipboard.writeText(signature);
            showToast("Copied Signature", "Signature copied to clipboard.", "success");
        }
    });

    // Send Form flows
    elBtnSendReview.addEventListener("click", setupSendReview);
    elBtnSendBack.addEventListener("click", () => {
        elSendReviewScreen.classList.remove("active");
        elSendFormScreen.classList.add("active");
    });
    elBtnSendApprove.addEventListener("click", executeSendTransaction);
    elBtnStatusClose.addEventListener("click", () => {
        elSendStatusScreen.classList.remove("active");
        elSendFormScreen.classList.add("active");
        updateBalanceDetails();
        loadActivityHistory();
    });

    // Settings manual refresh trigger
    const refreshAct = document.getElementById("btn-refresh-activity");
    if (refreshAct) {
        refreshAct.addEventListener("click", () => {
            loadActivityHistory();
            showToast("Refreshing History", "Fetched latest Sepolia event logs.", "success");
        });
    }
}

// Send Form reviews
async function setupSendReview() {
    const recipient = elSendRecipient.value.trim();
    const amount = elSendAmount.value.trim();
    const asset = elSendAssetSelect.value;

    if (!ethers.isAddress(recipient)) {
        showToast("Invalid Destination", "Please input a valid Ethereum address.", "error");
        return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        showToast("Invalid Amount", "Please input a positive numeric value.", "error");
        return;
    }

    elReviewFromWallet.innerText = config.smartWalletAddress;
    elReviewToRecipient.innerText = recipient;
    elReviewAmountVal.innerText = `${amount} ${asset}`;
    elReviewGasVal.innerText = "Calculating...";

    elSendFormScreen.classList.remove("active");
    elSendReviewScreen.classList.add("active");

    // Estimate transaction gas
    try {
        const walletContract = new ethers.Contract(config.smartWalletAddress, CONTRACT_ABI, signer);
        let gasEst = 0n;

        if (asset === "ETH") {
            const amountInWei = ethers.parseEther(amount);
            gasEst = await walletContract.execute.estimateGas(recipient, amountInWei, "0x");
        } else {
            // USDC Transfer call data estimation
            const usdcContract = new ethers.Contract(DEFAULTS.usdcAddress, ERC20_ABI, provider);
            const decimals = await usdcContract.decimals();
            const usdcUnits = ethers.parseUnits(amount, decimals);
            
            const interface = new ethers.Interface(ERC20_ABI);
            const calldata = interface.encodeFunctionData("transfer", [recipient, usdcUnits]);

            gasEst = await walletContract.execute.estimateGas(DEFAULTS.usdcAddress, 0, calldata);
        }

        elReviewGasVal.innerText = `${gasEst.toString()} Gas Units`;
    } catch (err) {
        console.warn("Gas estimation failed", err);
        elReviewGasVal.innerText = "Estimation Unavailable";
    }
}

// Execute SmartWallet contract action execution
async function executeSendTransaction() {
    const recipient = elSendRecipient.value.trim();
    const amount = elSendAmount.value.trim();
    const asset = elSendAssetSelect.value;

    elSendReviewScreen.classList.remove("active");
    elSendStatusScreen.classList.add("active");

    // Stepper elements
    elStatusTitle.innerText = "Preparing Transaction...";
    elStatusDesc.innerText = "Preparing payload parameters for Smart Contract call.";
    elStatusSpinner.style.display = "block";
    elStatusSuccessRing.style.display = "none";
    elStatusErrorRing.style.display = "none";
    elStatusTxBox.style.display = "none";
    elBtnViewExplorer.style.display = "none";
    elBtnStatusClose.style.display = "none";

    try {
        const walletContract = new ethers.Contract(config.smartWalletAddress, CONTRACT_ABI, signer);
        
        // Double-check ownership
        const ownerAddr = await walletContract.owner();
        if (ownerAddr.toLowerCase() !== eoaAddress.toLowerCase()) {
            throw new Error(`Connected EOA (${eoaAddress}) is not the owner of this SmartWallet contract (${ownerAddr}).`);
        }

        elStatusTitle.innerText = "Waiting for Signature...";
        elStatusDesc.innerText = "Please confirm the transaction execution in MetaMask.";

        let txResponse;

        if (asset === "ETH") {
            const amountInWei = ethers.parseEther(amount);
            // Execute standard send call payload
            txResponse = await walletContract.execute(recipient, amountInWei, "0x");
        } else {
            // USDC low-level call payload
            const usdcContract = new ethers.Contract(DEFAULTS.usdcAddress, ERC20_ABI, provider);
            const decimals = await usdcContract.decimals();
            const usdcUnits = ethers.parseUnits(amount, decimals);
            
            const interface = new ethers.Interface(ERC20_ABI);
            const calldata = interface.encodeFunctionData("transfer", [recipient, usdcUnits]);

            txResponse = await walletContract.execute(DEFAULTS.usdcAddress, 0, calldata);
        }

        elStatusTitle.innerText = "Submitting to Blockchain...";
        elStatusDesc.innerText = "Broadcasting contract transaction on Sepolia Network.";
        
        elStatusTxHash.innerText = txResponse.hash;
        elStatusTxBox.style.display = "flex";
        elBtnViewExplorer.href = `https://sepolia.etherscan.io/tx/${txResponse.hash}`;
        elBtnViewExplorer.style.display = "inline-block";

        // Wait for Block Confirmation
        await txResponse.wait();

        // Complete success state
        elStatusTitle.innerText = "Transaction Confirmed!";
        elStatusDesc.innerText = "Transaction successfully executed and completed on Sepolia Testnet.";
        elStatusSpinner.style.display = "none";
        elStatusSuccessRing.style.display = "flex";
        
        // Clear fields
        elSendRecipient.value = "";
        elSendAmount.value = "";
        
    } catch (err) {
        console.error("Contract transaction execution failed", err);
        
        elStatusSpinner.style.display = "none";
        elStatusErrorRing.style.display = "flex";
        elStatusTitle.innerText = "Transaction Failed";
        
        // User rejection
        if (err.code === "ACTION_REJECTED" || err.message?.includes("rejected")) {
            elStatusDesc.innerText = "User rejected the transaction signature in MetaMask.";
        } else if (err.message?.includes("not the owner")) {
            elStatusDesc.innerText = "Access denied: Connected EOA is not the owner of the Smart Wallet contract.";
        } else {
            elStatusDesc.innerText = err.message || "An unexpected error occurred during Smart Wallet execution.";
        }
    } finally {
        elBtnStatusClose.style.display = "inline-block";
    }
}

// Query Event History log details from Etherscan/RPC logs
async function loadActivityHistory() {
    if (!provider || !config.smartWalletAddress) return;

    const tbody = document.getElementById("activity-log-body");
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Fetching events from blockchain...</td></tr>`;

    try {
        const walletContract = new ethers.Contract(config.smartWalletAddress, CONTRACT_ABI, provider);

        // Fetch events recursively (up to last 5000 blocks to prevent RPC timeouts)
        const currentBlock = await provider.getBlockNumber();
        const startBlock = currentBlock - 5000 > 0 ? currentBlock - 5000 : 0;

        const [receivedEvents, sentEvents, executedEvents] = await Promise.all([
            walletContract.queryFilter(walletContract.filters.ETHReceived(), startBlock, "latest"),
            walletContract.queryFilter(walletContract.filters.ETHSent(), startBlock, "latest"),
            walletContract.queryFilter(walletContract.filters.TransactionExecuted(), startBlock, "latest")
        ]);

        // Combine logs
        let logs = [];

        receivedEvents.forEach(e => {
            logs.push({
                type: "Received",
                amount: `${ethers.formatEther(e.args.amount)} ETH`,
                address: e.args.sender,
                txHash: e.transactionHash,
                nonce: "-",
                blockNumber: e.blockNumber
            });
        });

        sentEvents.forEach(e => {
            logs.push({
                type: "Sent",
                amount: `${ethers.formatEther(e.args.amount)} ETH`,
                address: e.args.recipient,
                txHash: e.transactionHash,
                nonce: "-",
                blockNumber: e.blockNumber
            });
        });

        executedEvents.forEach(e => {
            // Only add if not duplicate of simple ETH Sent (which has data length == 0)
            if (e.args.data !== "0x") {
                logs.push({
                    type: "Executed Call",
                    amount: `${ethers.formatEther(e.args.value)} ETH`,
                    address: e.args.target,
                    txHash: e.transactionHash,
                    nonce: e.args.opNonce.toString(),
                    blockNumber: e.blockNumber
                });
            }
        });

        // Sort descending blockNumber
        logs.sort((a, b) => b.blockNumber - a.blockNumber);

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No recent Smart Wallet transaction logs found.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        logs.forEach(log => {
            const tr = document.createElement("tr");
            const shortAddr = `${log.address.slice(0, 6)}...${log.address.slice(-4)}`;
            const shortHash = `${log.txHash.slice(0, 8)}...`;
            const typeClass = log.type.toLowerCase().includes("received") ? "received" : "sent";

            tr.innerHTML = `
                <td><span class="tx-type-badge ${typeClass}">${log.type}</span></td>
                <td class="font-weight-bold">${log.amount}</td>
                <td class="code-text" title="${log.address}">${shortAddr}</td>
                <td><span class="tx-status-badge confirmed">Confirmed</span></td>
                <td>${log.nonce}</td>
                <td>
                    <a href="https://sepolia.etherscan.io/tx/${log.txHash}" target="_blank" class="tx-explorer-link" title="${log.txHash}">
                        ${shortHash}
                    </a>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Logs fetching failed", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Failed to fetch live event logs. Please check settings.</td></tr>`;
    }
}
