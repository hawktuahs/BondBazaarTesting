// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BondToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondFactory
 * @dev Factory contract to deploy and manage bond tokens
 */
contract BondFactory is Ownable {
    struct DeployedBond {
        address tokenAddress;
        string bondId;
        string issuer;
        uint256 deployedAt;
        bool active;
    }

    mapping(string => DeployedBond) public bonds;
    mapping(address => bool) public authorizedIssuers;
    string[] public bondIds;
    
    event BondDeployed(
        string indexed bondId,
        address indexed tokenAddress,
        string issuer,
        uint256 totalSupply
    );
    
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event BondDeactivated(string indexed bondId);

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized issuer");
        _;
    }

    /**
     * @dev Authorize an issuer to deploy bonds
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @dev Revoke issuer authorization
     */
    function revokeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    /**
     * @dev Deploy a new bond token
     */
    function deployBond(
        string memory _bondId,
        string memory _name,
        string memory _symbol,
        string memory _issuer,
        uint256 _faceValue,
        uint256 _couponRate,
        uint256 _maturityDate,
        string memory _rating,
        uint256 _totalSupply
    ) external onlyAuthorizedIssuer returns (address) {
        require(bonds[_bondId].tokenAddress == address(0), "Bond already exists");
        
        BondToken newBond = new BondToken(
            _name,
            _symbol,
            _bondId,
            _issuer,
            _faceValue,
            _couponRate,
            _maturityDate,
            _rating,
            _totalSupply
        );
        
        address tokenAddress = address(newBond);
        
        bonds[_bondId] = DeployedBond({
            tokenAddress: tokenAddress,
            bondId: _bondId,
            issuer: _issuer,
            deployedAt: block.timestamp,
            active: true
        });
        
        bondIds.push(_bondId);
        
        // Authorize this factory as a trader on the new bond
        newBond.authorizeTrader(address(this));
        
        emit BondDeployed(_bondId, tokenAddress, _issuer, _totalSupply);
        
        return tokenAddress;
    }

    /**
     * @dev Execute a trade between users
     */
    function executeTrade(
        string memory _bondId,
        address from,
        address to,
        uint256 amount,
        uint256 price,
        bytes32 tradeId
    ) external onlyOwner {
        require(bonds[_bondId].active, "Bond not active");
        
        BondToken bondToken = BondToken(bonds[_bondId].tokenAddress);
        bondToken.executeTrade(from, to, amount, price, tradeId);
    }

    /**
     * @dev Deactivate a bond
     */
    function deactivateBond(string memory _bondId) external onlyOwner {
        require(bonds[_bondId].tokenAddress != address(0), "Bond does not exist");
        bonds[_bondId].active = false;
        emit BondDeactivated(_bondId);
    }

    /**
     * @dev Get bond token address
     */
    function getBondToken(string memory _bondId) external view returns (address) {
        return bonds[_bondId].tokenAddress;
    }

    /**
     * @dev Get all bond IDs
     */
    function getAllBondIds() external view returns (string[] memory) {
        return bondIds;
    }

    /**
     * @dev Get bond info
     */
    function getBondInfo(string memory _bondId) external view returns (DeployedBond memory) {
        return bonds[_bondId];
    }
}
