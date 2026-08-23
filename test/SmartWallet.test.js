const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartWallet", function () {
  let SmartWallet;
  let wallet;
  let owner;
  let nonOwner;
  let recipient;
  const zeroAddress = ethers.ZeroAddress;

  beforeEach(async function () {
    [owner, nonOwner, recipient] = await ethers.getSigners();
    SmartWallet = await ethers.getContractFactory("SmartWallet");
    wallet = await SmartWallet.deploy(owner.address);
    await wallet.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully and return a valid address", async function () {
      const address = await wallet.getAddress();
      expect(address).to.not.equal(zeroAddress);
      expect(address).to.not.be.undefined;
    });

    it("Should assign the owner correctly", async function () {
      expect(await wallet.owner()).to.equal(owner.address);
    });

    it("Should start with a nonce of 0", async function () {
      expect(await wallet.nonce()).to.equal(0n);
    });

    it("Should fail deployment if owner is zero address", async function () {
      await expect(SmartWallet.deploy(zeroAddress)).to.be.revertedWith(
        "SmartWallet: Owner cannot be the zero address"
      );
    });
  });

  describe("ETH Deposits and Balance Checking", function () {
    it("Should accept ETH deposits and update balance via receive()", async function () {
      const depositAmount = ethers.parseEther("1.5");
      const walletAddress = await wallet.getAddress();
      
      const tx = await owner.sendTransaction({
        to: walletAddress,
        value: depositAmount,
      });

      await expect(tx)
        .to.emit(wallet, "ETHReceived")
        .withArgs(owner.address, depositAmount);

      expect(await wallet.getBalance()).to.equal(depositAmount);
      const contractBalance = await ethers.provider.getBalance(walletAddress);
      expect(contractBalance).to.equal(depositAmount);
    });

    it("Should revert transactions with non-empty calldata (no fallback function)", async function () {
      const depositAmount = ethers.parseEther("2.0");
      const walletAddress = await wallet.getAddress();
      
      // Sending ETH with call data should revert because fallback is not defined
      await expect(
        owner.sendTransaction({
          to: walletAddress,
          value: depositAmount,
          data: "0x12345678"
        })
      ).to.be.reverted;
    });

  });

  describe("Low-level Execution (execute)", function () {
    beforeEach(async function () {
      const walletAddress = await wallet.getAddress();
      // Pre-fund the wallet
      await owner.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther("5.0"),
      });
    });

    it("Should allow owner to execute a transaction with value (send ETH)", async function () {
      const initialRecipientBalance = await ethers.provider.getBalance(recipient.address);
      const valueToSend = ethers.parseEther("1.5");

      // Execute execution
      const tx = await wallet.connect(owner).execute(recipient.address, valueToSend, "0x");

      // Verify events (both TransactionExecuted and ETHSent should trigger because data is empty)
      await expect(tx)
        .to.emit(wallet, "TransactionExecuted")
        .withArgs(recipient.address, valueToSend, "0x", 0n);

      await expect(tx)
        .to.emit(wallet, "ETHSent")
        .withArgs(recipient.address, valueToSend);

      expect(await wallet.getBalance()).to.equal(ethers.parseEther("3.5"));
      const finalRecipientBalance = await ethers.provider.getBalance(recipient.address);
      expect(finalRecipientBalance - initialRecipientBalance).to.equal(valueToSend);
    });

    it("Should increment nonce after successful execution", async function () {
      expect(await wallet.nonce()).to.equal(0n);
      await wallet.connect(owner).execute(recipient.address, ethers.parseEther("1.0"), "0x");
      expect(await wallet.nonce()).to.equal(1n);
    });

    it("Should prevent non-owner from executing transactions", async function () {
      await expect(
        wallet.connect(nonOwner).execute(recipient.address, ethers.parseEther("1.0"), "0x")
      ).to.be.revertedWith("SmartWallet: Caller is not the owner");
    });

    it("Should fail if contract balance is insufficient for value", async function () {
      await expect(
        wallet.connect(owner).execute(recipient.address, ethers.parseEther("6.0"), "0x")
      ).to.be.revertedWith("SmartWallet: Insufficient balance in wallet");
    });

    it("Should fail if target is zero address", async function () {
      await expect(
        wallet.connect(owner).execute(zeroAddress, ethers.parseEther("1.0"), "0x")
      ).to.be.revertedWith("SmartWallet: Target cannot be the zero address");
    });
  });
});
