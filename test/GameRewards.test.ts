import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("GameRewards", function () {
  async function deployFixture() {
    const [owner, player, player2] = await ethers.getSigners();

    // Create a game signer wallet
    const gameSigner = ethers.Wallet.createRandom().connect(ethers.provider);

    // Deploy VA token
    const VeChainAgent = await ethers.getContractFactory("VeChainAgent");
    const token = await VeChainAgent.deploy();

    // Deploy GameRewards: max 100 score, 30s cooldown
    const GameRewards = await ethers.getContractFactory("GameRewards");
    const rewards = await GameRewards.deploy(
      await token.getAddress(),
      gameSigner.address,
      100,
      30
    );

    // Fund the reward pool with 100,000 VA
    const fundAmount = ethers.parseEther("100000");
    await token.transfer(await rewards.getAddress(), fundAmount);

    return { token, rewards, owner, player, player2, gameSigner };
  }

  async function signScore(
    gameSigner: ethers.HDNodeWallet,
    playerAddress: string,
    score: number,
    nonce: number,
    contractAddress: string
  ): Promise<string> {
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [playerAddress, score, nonce, contractAddress]
    );
    return gameSigner.signMessage(ethers.getBytes(messageHash));
  }

  describe("Deployment", function () {
    it("should set correct token, signer, maxScore, and cooldown", async function () {
      const { token, rewards, gameSigner } = await deployFixture();
      expect(await rewards.vaToken()).to.equal(await token.getAddress());
      expect(await rewards.gameSigner()).to.equal(gameSigner.address);
      expect(await rewards.maxScorePerClaim()).to.equal(100);
      expect(await rewards.cooldownSeconds()).to.equal(30);
    });

    it("should have 100,000 VA in the pool", async function () {
      const { rewards } = await deployFixture();
      expect(await rewards.poolBalance()).to.equal(ethers.parseEther("100000"));
    });
  });

  describe("Claiming Rewards", function () {
    it("should allow a valid claim", async function () {
      const { token, rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();
      const sig = await signScore(gameSigner, player.address, 5, 0, rewardsAddr);

      await rewards.connect(player).claimReward(5, 0, sig);

      expect(await token.balanceOf(player.address)).to.equal(ethers.parseEther("5"));
      expect(await rewards.nonces(player.address)).to.equal(1);
      expect(await rewards.totalClaimed(player.address)).to.equal(ethers.parseEther("5"));
    });

    it("should emit RewardClaimed event", async function () {
      const { rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();
      const sig = await signScore(gameSigner, player.address, 10, 0, rewardsAddr);

      await expect(rewards.connect(player).claimReward(10, 0, sig))
        .to.emit(rewards, "RewardClaimed")
        .withArgs(player.address, 10, ethers.parseEther("10"));
    });

    it("should reject replay (same nonce)", async function () {
      const { rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();
      const sig = await signScore(gameSigner, player.address, 5, 0, rewardsAddr);

      await rewards.connect(player).claimReward(5, 0, sig);

      // Replay with same nonce should fail (nonce already incremented to 1)
      await expect(
        rewards.connect(player).claimReward(5, 0, sig)
      ).to.be.revertedWith("Invalid nonce");
    });

    it("should reject wrong signer", async function () {
      const { rewards, player } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();
      const fakeSigner = ethers.Wallet.createRandom();
      const sig = await signScore(
        fakeSigner as any,
        player.address,
        5,
        0,
        rewardsAddr
      );

      await expect(
        rewards.connect(player).claimReward(5, 0, sig)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should reject score above max", async function () {
      const { rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();
      const sig = await signScore(gameSigner, player.address, 101, 0, rewardsAddr);

      await expect(
        rewards.connect(player).claimReward(101, 0, sig)
      ).to.be.revertedWith("Score exceeds maximum");
    });

    it("should reject zero score", async function () {
      const { rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();
      const sig = await signScore(gameSigner, player.address, 0, 0, rewardsAddr);

      await expect(
        rewards.connect(player).claimReward(0, 0, sig)
      ).to.be.revertedWith("Score must be > 0");
    });

    it("should enforce cooldown", async function () {
      const { rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();

      const sig1 = await signScore(gameSigner, player.address, 3, 0, rewardsAddr);
      await rewards.connect(player).claimReward(3, 0, sig1);

      // Try claiming again immediately (nonce 1 now)
      const sig2 = await signScore(gameSigner, player.address, 2, 1, rewardsAddr);
      await expect(
        rewards.connect(player).claimReward(2, 1, sig2)
      ).to.be.revertedWith("Cooldown active");
    });

    it("should allow claim after cooldown passes", async function () {
      const { token, rewards, player, gameSigner } = await deployFixture();
      const rewardsAddr = await rewards.getAddress();

      const sig1 = await signScore(gameSigner, player.address, 3, 0, rewardsAddr);
      await rewards.connect(player).claimReward(3, 0, sig1);

      // Advance time past cooldown
      await time.increase(31);

      const sig2 = await signScore(gameSigner, player.address, 7, 1, rewardsAddr);
      await rewards.connect(player).claimReward(7, 1, sig2);

      expect(await token.balanceOf(player.address)).to.equal(ethers.parseEther("10"));
      expect(await rewards.nonces(player.address)).to.equal(2);
    });
  });

  describe("Owner Functions", function () {
    it("should let owner update game signer", async function () {
      const { rewards, owner } = await deployFixture();
      const newSigner = ethers.Wallet.createRandom();

      await rewards.setGameSigner(newSigner.address);
      expect(await rewards.gameSigner()).to.equal(newSigner.address);
    });

    it("should reject non-owner from updating signer", async function () {
      const { rewards, player } = await deployFixture();
      const newSigner = ethers.Wallet.createRandom();

      await expect(
        rewards.connect(player).setGameSigner(newSigner.address)
      ).to.be.revertedWithCustomError(rewards, "OwnableUnauthorizedAccount");
    });

    it("should let owner withdraw pool", async function () {
      const { token, rewards, owner } = await deployFixture();
      const ownerBalBefore = await token.balanceOf(owner.address);

      await rewards.withdrawPool(ethers.parseEther("1000"));

      expect(await token.balanceOf(owner.address)).to.equal(
        ownerBalBefore + ethers.parseEther("1000")
      );
    });
  });
});
