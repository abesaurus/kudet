// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AirdropDistributor
 * @notice One tx → many transfers. Looks like a platform airdrop, not a wallet-to-wallet transfer.
 *         Owner deposits tokens, then distributes to N recipients in one call.
 *         Each Transfer event shows `from: this contract` → `to: recipient`.
 */
contract AirdropDistributor {
    address public owner;
    mapping(address => uint256) public deposited; // token => amount

    event Distributed(address indexed token, address indexed recipient, uint256 amount);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deposit tokens so the contract can distribute them.
    /// @dev Caller must approve(this, amount) first.
    function deposit(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount zero");
        (bool ok,) = token.call(abi.encodeWithSignature(
            "transferFrom(address,address,uint256)", msg.sender, address(this), amount
        ));
        require(ok, "TransferFrom failed");
        deposited[token] += amount;
        emit Deposited(token, msg.sender, amount);
    }

    /// @notice Deposit native ETH for distribution.
    function depositEth() external payable onlyOwner {
        require(msg.value > 0, "Amount zero");
    }

    /// @notice Distribute ERC20 tokens to multiple recipients.
    /// @param token  The ERC20 token address (0x0 for native ETH)
    /// @param recipients  Array of recipient addresses
    /// @param amounts  Array of amounts (same length as recipients)
    function distribute(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(deposited[token] >= total, "Insufficient deposited balance");

        deposited[token] -= total;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Amount zero");
            (bool ok,) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", recipients[i], amounts[i])
            );
            require(ok, "Transfer failed");
            emit Distributed(token, recipients[i], amounts[i]);
        }
    }

    /// @notice Distribute native ETH to multiple recipients.
    function distributeEth(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(address(this).balance >= total, "Insufficient balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Amount zero");
            (bool ok,) = recipients[i].call{value: amounts[i]}("");
            require(ok, "ETH transfer failed");
            emit Distributed(address(0), recipients[i], amounts[i]);
        }
    }

    /// @notice Withdraw any remaining tokens (owner only).
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        require(deposited[token] >= amount, "Insufficient");
        deposited[token] -= amount;
        (bool ok,) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        require(ok, "Transfer failed");
        emit Withdrawn(token, to, amount);
    }

    /// @notice Withdraw remaining native ETH.
    function withdrawEth(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient");
        (bool ok,) = to.call{value: amount}("");
        require(ok, "ETH transfer failed");
        emit Withdrawn(address(0), to, amount);
    }
}