// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title HYBRID — Collateral token for the HYBRID lending protocol
/// @notice ERC-20 (OpenZeppelin style, self-contained for standalone solc compile).
///         Minting is permissioned (lending contract / minter role). Burn optional.
contract HybridToken {
    string public constant name = "HYBRID";
    string public constant symbol = "HYBRID";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;
    address public minter;   // can mint (lending contract or deployer)

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyOwner() { require(msg.sender == owner, "NOT_OWNER"); _; }
    modifier onlyMinter() { require(msg.sender == minter, "NOT_MINTER"); _; }

    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        minter = msg.sender;
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == from || msg.sender == minter, "NOT_AUTHORIZED");
        _burn(from, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allow = allowance[from][msg.sender];
        require(allow >= amount, "ALLOWANCE");
        if (allow != type(uint256).max) {
            allowance[from][msg.sender] = allow - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "ZERO_ADDR");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "BALANCE");
        balanceOf[from] = bal - amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ZERO_ADDR");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        uint256 bal = balanceOf[from];
        require(bal >= amount, "BALANCE");
        balanceOf[from] = bal - amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
