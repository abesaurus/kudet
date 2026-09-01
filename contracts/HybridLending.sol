// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title HYBRID Lending — collateralized lending on Robinhood Chain
/// @notice Deposit HYBRID, borrow USDG up to 50% LTV. No liquidation.
///         Keeper-fed rolling price samples, proportional redemption.
/// @dev Standalone contract (deployed directly; the address = the "HYBRID proxy"
///      shown on the site). Mirrors the PonsLoan model.
interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

contract HybridLending {
    // ── constants ──
    uint256 internal constant BPS = 10_000;
    uint256 internal constant WAD = 1e18;
    uint256 internal constant MAX_SAMPLES = 7;
    uint256 internal constant COOLDOWN = 60;        // 1 minute between keeper samples
    uint256 internal constant MAX_JUMP_BPS = 1000;  // reject >10% jump vs sample avg

    // ── config (immutable after init) ──
    address public owner;
    address public keeper;
    IERC20Min public collateral;   // HYBRID
    IERC20Min public borrow;       // USDG
    uint256 public debtCap;        // max total USDG outstanding
    uint256 public feeBps;         // borrow fee (300 = 3%)
    uint256 public maxLtvBps;      // 5000 = 50%
    uint256 public safetyFactorBps;// 9500 = 95%
    uint256 public minBorrow;      // min USDG to borrow
    bool public initialized;

    // ── price samples ──
    uint256[] public samples;
    uint256 public lastSampleAt;

    // ── positions ──
    struct Position { uint256 collateral; uint256 debt; }
    mapping(address => Position) public positions;
    uint256 public totalDebt;
    uint256 public totalCollateral;

    // ── events ──
    event Borrowed(address indexed user, uint256 collateralIn, uint256 grossDebt, uint256 netUsdg, uint256 fee);
    event Repaid(address indexed user, uint256 repayAmount, uint256 collateralOut);
    event SampleSet(uint256 price, uint256 avg);
    event ConfigChanged();

    modifier onlyOwner() { require(msg.sender == owner, "NOT_OWNER"); _; }
    modifier onlyKeeperOrOwner() { require(msg.sender == keeper || msg.sender == owner, "NOT_KEEPER"); _; }

    constructor(address _owner) {
        owner = _owner;
        keeper = _owner;
    }

    /// @dev one-time init; can only be called by deployer before use
    function initialize(address _collateral, address _borrow, uint256 _debtCap) external {
        require(!initialized, "INIT");
        require(msg.sender == owner, "NOT_OWNER");
        require(_collateral != address(0) && _borrow != address(0), "ZERO");
        collateral = IERC20Min(_collateral);
        borrow = IERC20Min(_borrow);
        debtCap = _debtCap;
        feeBps = 300;
        maxLtvBps = 5000;
        safetyFactorBps = 9500;
        minBorrow = 1e16; // 0.01 USDG
        initialized = true;
        emit ConfigChanged();
    }

    // ═══════════════ CONFIG ═══════════════

    function setKeeper(address _keeper) external onlyOwner { keeper = _keeper; emit ConfigChanged(); }
    function setDebtCap(uint256 _cap) external onlyOwner { debtCap = _cap; emit ConfigChanged(); }
    function setFee(uint256 _feeBps) external onlyOwner { require(_feeBps <= 1000, "FEE_HIGH"); feeBps = _feeBps; emit ConfigChanged(); }
    function setMaxLtv(uint256 _ltvBps) external onlyOwner { require(_ltvBps <= 9000, "LTV_HIGH"); maxLtvBps = _ltvBps; emit ConfigChanged(); }
    function setSafetyFactor(uint256 _sfBps) external onlyOwner { require(_sfBps <= BPS, "SF_HIGH"); safetyFactorBps = _sfBps; emit ConfigChanged(); }
    function setMinBorrow(uint256 _min) external onlyOwner { minBorrow = _min; emit ConfigChanged(); }

    // ═══════════════ PRICE SAFETY ═══════════════

    /// @dev keeper/owner submits a price sample (USDG per 1e18 HYBRID).
    ///      Averages up to 7 samples, 1-min cooldown, rejects >10% jumps.
    function setPriceSample(uint256 _price) external onlyKeeperOrOwner {
        require(_price > 0, "PRICE_ZERO");
        require(block.timestamp - lastSampleAt >= COOLDOWN, "COOLDOWN");
        if (samples.length > 0) {
            uint256 avg = sampleAvg();
            uint256 diff = _price > avg ? _price - avg : avg - _price;
            require(diff * BPS / avg <= MAX_JUMP_BPS, "JUMP_TOO_BIG");
        }
        samples.push(_price);
        if (samples.length > MAX_SAMPLES) {
            // drop oldest (shift left)
            for (uint256 i = 1; i < samples.length; i++) samples[i - 1] = samples[i];
            samples.pop();
        }
        lastSampleAt = block.timestamp;
        emit SampleSet(_price, sampleAvg());
    }

    /// @dev protected price = rolling average × safety factor (95%)
    function price() public view returns (uint256) {
        require(samples.length > 0, "NO_PRICE");
        return sampleAvg() * safetyFactorBps / BPS;
    }

    function sampleAvg() public view returns (uint256) {
        require(samples.length > 0, "NO_PRICE");
        uint256 sum;
        for (uint256 i = 0; i < samples.length; i++) sum += samples[i];
        return sum / samples.length;
    }

    function sampleCount() external view returns (uint256) { return samples.length; }

    // ═══════════════ BORROW ═══════════════

    /// @dev deposit HYBRID + borrow USDG in one call. Requires approve(collateral).
    ///      Sends net USDG (gross debt − 3% fee) from vault liquidity.
    function depositAndBorrow(uint256 collateralAmount) external returns (uint256 netUsdg) {
        require(initialized, "NOT_INIT");
        require(collateralAmount > 0, "ZERO_COLL");
        uint256 _price = price();

        // pull collateral
        collateral.transferFrom(msg.sender, address(this), collateralAmount);

        // value of collateral at protected price
        uint256 collValue = collateralAmount * _price / WAD;

        // borrowable at LTV
        uint256 borrowable = collValue * maxLtvBps / BPS;

        // pool-share check: no single user may exceed the debt cap
        uint256 avail = debtCap > totalDebt ? debtCap - totalDebt : 0;
        if (borrowable > avail) borrowable = avail;

        require(borrowable >= minBorrow, "BELOW_MIN");

        uint256 fee = borrowable * feeBps / BPS;
        uint256 net = borrowable - fee;
        require(borrow.balanceOf(address(this)) >= net, "VAULT_LOW");

        positions[msg.sender].collateral += collateralAmount;
        positions[msg.sender].debt += borrowable;
        totalCollateral += collateralAmount;
        totalDebt += borrowable;

        borrow.transfer(msg.sender, net);
        emit Borrowed(msg.sender, collateralAmount, borrowable, net, fee);
        return net;
    }

    /// @dev repay USDG + redeem collateral proportionally. Requires approve(borrow).
    function repayAndRedeemProportionally(uint256 repayAmount) external returns (uint256 collateralOut) {
        Position storage pos = positions[msg.sender];
        require(pos.debt > 0, "NO_DEBT");
        require(repayAmount > 0, "ZERO_REPAY");

        // don't over-apply: max = full debt; refund excess automatically handled by only pulling actual
        uint256 applied = repayAmount > pos.debt ? pos.debt : repayAmount;
        borrow.transferFrom(msg.sender, address(this), applied);

        // proportional redemption: collateralOut = applied/debt × collateral
        collateralOut = applied * pos.collateral / pos.debt;

        pos.collateral -= collateralOut;
        pos.debt -= applied;
        totalCollateral -= collateralOut;
        totalDebt -= applied;

        if (collateralOut > 0) collateral.transfer(msg.sender, collateralOut);
        emit Repaid(msg.sender, applied, collateralOut);
        return collateralOut;
    }

    // ═══════════════ VIEWS ═══════════════

    function vaultLiquidity() external view returns (uint256) { return borrow.balanceOf(address(this)); }
    function utilizationBps() external view returns (uint256) {
        return debtCap == 0 ? 0 : totalDebt * BPS / debtCap;
    }

    // ═══════════════ OWNER ═══════════════

    /// @dev owner may withdraw excess borrow asset (above outstanding debt) — safety valve.
    function rescueBorrow(uint256 amount) external onlyOwner {
        uint256 max = borrow.balanceOf(address(this)) - totalDebt;
        require(amount <= max, "TOO_MUCH");
        borrow.transfer(owner, amount);
    }

    /// @dev owner may reclaim wrongly-sent collateral.
    function rescueCollateral(uint256 amount) external onlyOwner {
        uint256 max = collateral.balanceOf(address(this)) - totalCollateral;
        require(amount <= max, "TOO_MUCH");
        collateral.transfer(owner, amount);
    }
}
