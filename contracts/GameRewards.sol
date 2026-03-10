// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GameRewards
 * @dev Distributes VA tokens to players based on their Flappy Bird scores.
 *      Uses signed-message verification to prevent fake score submissions.
 *      The "game signer" key signs each (player, score, nonce, contract) tuple.
 */
contract GameRewards is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IERC20 public immutable vaToken;
    address public gameSigner;
    uint256 public maxScorePerClaim;
    uint256 public cooldownSeconds;

    mapping(address => uint256) public nonces;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalClaimed;

    event RewardClaimed(address indexed player, uint256 score, uint256 amount);
    event GameSignerUpdated(address indexed newSigner);
    event PoolWithdrawn(address indexed owner, uint256 amount);

    constructor(
        address _vaToken,
        address _gameSigner,
        uint256 _maxScorePerClaim,
        uint256 _cooldownSeconds
    ) Ownable(msg.sender) {
        vaToken = IERC20(_vaToken);
        gameSigner = _gameSigner;
        maxScorePerClaim = _maxScorePerClaim;
        cooldownSeconds = _cooldownSeconds;
    }

    /**
     * @dev Claim VA token rewards for a verified game score.
     * @param score Number of pipes passed (tokens to receive)
     * @param nonce Player's current nonce (prevents replay)
     * @param signature Signed message from the game signer
     */
    function claimReward(
        uint256 score,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        require(score > 0, "Score must be > 0");
        require(score <= maxScorePerClaim, "Score exceeds maximum");
        require(nonce == nonces[msg.sender], "Invalid nonce");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + cooldownSeconds,
            "Cooldown active"
        );

        // Verify signature: hash(player, score, nonce, contractAddress)
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, score, nonce, address(this))
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
        require(recovered == gameSigner, "Invalid signature");

        uint256 amount = score * 1e18;
        require(vaToken.balanceOf(address(this)) >= amount, "Reward pool empty");

        nonces[msg.sender]++;
        lastClaimTime[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += amount;

        vaToken.transfer(msg.sender, amount);

        emit RewardClaimed(msg.sender, score, amount);
    }

    // --- Owner functions ---

    function setGameSigner(address _signer) external onlyOwner {
        gameSigner = _signer;
        emit GameSignerUpdated(_signer);
    }

    function setMaxScore(uint256 _max) external onlyOwner {
        maxScorePerClaim = _max;
    }

    function setCooldown(uint256 _seconds) external onlyOwner {
        cooldownSeconds = _seconds;
    }

    function withdrawPool(uint256 amount) external onlyOwner {
        vaToken.transfer(msg.sender, amount);
        emit PoolWithdrawn(msg.sender, amount);
    }

    function poolBalance() external view returns (uint256) {
        return vaToken.balanceOf(address(this));
    }
}
