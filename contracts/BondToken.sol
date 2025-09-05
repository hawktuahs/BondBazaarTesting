// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title BondToken
 * @dev ERC-20 token representing fractional ownership of a corporate bond
 */
contract BondToken is ERC20, Ownable, Pausable {
    struct BondInfo {
        string bondId;
        string issuer;
        uint256 faceValue;
        uint256 couponRate; // Basis points (e.g., 750 = 7.5%)
        uint256 maturityDate;
        string rating;
        uint256 totalSupply;
    }

    BondInfo public bondInfo;
    mapping(address => bool) public authorizedTraders;
    
    event TradeExecuted(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 price,
        bytes32 indexed tradeId
    );
    
    event TraderAuthorized(address indexed trader);
    event TraderRevoked(address indexed trader);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _bondId,
        string memory _issuer,
        uint256 _faceValue,
        uint256 _couponRate,
        uint256 _maturityDate,
        string memory _rating,
        uint256 _totalSupply
    ) ERC20(_name, _symbol) {
        bondInfo = BondInfo({
            bondId: _bondId,
            issuer: _issuer,
            faceValue: _faceValue,
            couponRate: _couponRate,
            maturityDate: _maturityDate,
            rating: _rating,
            totalSupply: _totalSupply
        });
        
        // Mint initial supply to contract owner
        _mint(msg.sender, _totalSupply);
    }

    modifier onlyAuthorizedTrader() {
        require(authorizedTraders[msg.sender] || msg.sender == owner(), "Not authorized trader");
        _;
    }

    /**
     * @dev Authorize a trader to execute trades
     */
    function authorizeTrader(address trader) external onlyOwner {
        authorizedTraders[trader] = true;
        emit TraderAuthorized(trader);
    }

    /**
     * @dev Revoke trader authorization
     */
    function revokeTrader(address trader) external onlyOwner {
        authorizedTraders[trader] = false;
        emit TraderRevoked(trader);
    }

    /**
     * @dev Execute a trade between two parties
     * @param from Seller address
     * @param to Buyer address
     * @param amount Token amount to transfer
     * @param price Price per token (for event logging)
     * @param tradeId Unique trade identifier
     */
    function executeTrade(
        address from,
        address to,
        uint256 amount,
        uint256 price,
        bytes32 tradeId
    ) external onlyAuthorizedTrader whenNotPaused {
        require(from != to, "Cannot trade with self");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        _transfer(from, to, amount);
        emit TradeExecuted(from, to, amount, price, tradeId);
    }

    /**
     * @dev Mint new tokens (for bond issuance)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        bondInfo.totalSupply += amount;
    }

    /**
     * @dev Burn tokens (for bond redemption)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        bondInfo.totalSupply -= amount;
    }

    /**
     * @dev Pause all token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override transfer to add pause functionality
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "Token transfers paused");
    }

    /**
     * @dev Get bond information
     */
    function getBondInfo() external view returns (BondInfo memory) {
        return bondInfo;
    }

    /**
     * @dev Calculate current yield based on market price
     */
    function calculateYield(uint256 marketPrice) external view returns (uint256) {
        require(marketPrice > 0, "Invalid market price");
        
        // Simple yield calculation: (coupon / price) * 100
        // This is a simplified calculation for demo purposes
        return (bondInfo.couponRate * bondInfo.faceValue) / marketPrice;
    }
}
