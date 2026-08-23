// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SmartWallet
 * @dev A simple smart contract wallet owned by a single External Owner Account (EOA).
 * All functions that transfer funds or execute transactions are restricted to the owner.
 */
contract SmartWallet {
    // The EOA address that owns and controls this wallet.
    address public owner;
    
    // A sequential counter to prevent transaction replay attacks and track operations.
    uint256 public nonce;

    // Event emitted when the contract receives Ether.
    event ETHReceived(address indexed sender, uint256 amount);

    // Event emitted when the contract sends a simple Ether transfer.
    event ETHSent(address indexed recipient, uint256 amount);

    // Event emitted when the contract executes a more complex low-level transaction.
    event TransactionExecuted(address indexed target, uint256 value, bytes data, uint256 opNonce);

    /**
     * @dev Restricts execution to the contract owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "SmartWallet: Caller is not the owner");
        _;
    }

    /**
     * @dev Sets the owner of the smart wallet during deployment.
     * @param _owner The address of the EOA that will control this contract.
     */
    constructor(address _owner) {
        require(_owner != address(0), "SmartWallet: Owner cannot be the zero address");
        owner = _owner;
    }

    /**
     * @dev Fallback function to receive Ether.
     */
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    /**
     * @dev Returns the balance of the contract in Wei.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Executes an arbitrary transaction or contract call as the contract owner.
     * Useful for interacting with other smart contracts or executing custom operations.
     * Only executable by the owner. Increments the nonce.
     * @param target The address of the contract or account to call.
     * @param value The amount of Ether (in Wei) to send with the call.
     * @param data The payload data (bytecode) to send with the call.
     * @return The bytes returned by the target call.
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bytes memory) {
        require(target != address(0), "SmartWallet: Target cannot be the zero address");
        require(address(this).balance >= value, "SmartWallet: Insufficient balance in wallet");

        // Increment nonce before executing external actions.
        uint256 currentNonce = nonce;
        nonce++;

        // Execute the call using target.call
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "SmartWallet: Transaction execution failed");

        emit TransactionExecuted(target, value, data, currentNonce);

        // If the execution was a simple ETH transfer (no data), emit the ETHSent event as well.
        if (data.length == 0 && value > 0) {
            emit ETHSent(target, value);
        }

        return result;
    }
}
