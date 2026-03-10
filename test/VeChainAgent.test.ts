import { expect } from "chai";
import { ethers } from "hardhat";

describe("VeChainAgent", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const VeChainAgent = await ethers.getContractFactory("VeChainAgent");
    const token = await VeChainAgent.deploy();
    return { token, owner, alice, bob };
  }

  describe("Deployment", function () {
    it("should have correct name", async function () {
      const { token } = await deployFixture();
      expect(await token.name()).to.equal("VeChainAgent");
    });

    it("should have correct symbol", async function () {
      const { token } = await deployFixture();
      expect(await token.symbol()).to.equal("VA");
    });

    it("should have 18 decimals", async function () {
      const { token } = await deployFixture();
      expect(await token.decimals()).to.equal(18);
    });

    it("should mint 1,000,000 tokens to deployer", async function () {
      const { token, owner } = await deployFixture();
      const expected = ethers.parseEther("1000000");
      expect(await token.totalSupply()).to.equal(expected);
      expect(await token.balanceOf(owner.address)).to.equal(expected);
    });
  });

  describe("Transfers", function () {
    it("should transfer tokens between accounts", async function () {
      const { token, owner, alice } = await deployFixture();
      const amount = ethers.parseEther("100");

      await token.transfer(alice.address, amount);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(
        ethers.parseEther("999900")
      );
    });

    it("should emit Transfer event", async function () {
      const { token, owner, alice } = await deployFixture();
      const amount = ethers.parseEther("50");

      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, amount);
    });

    it("should revert when sender has insufficient balance", async function () {
      const { token, alice, bob } = await deployFixture();
      const amount = ethers.parseEther("1");

      await expect(
        token.connect(alice).transfer(bob.address, amount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Allowances", function () {
    it("should approve and check allowance", async function () {
      const { token, owner, alice } = await deployFixture();
      const amount = ethers.parseEther("500");

      await token.approve(alice.address, amount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(
        amount
      );
    });

    it("should transferFrom with approval", async function () {
      const { token, owner, alice, bob } = await deployFixture();
      const amount = ethers.parseEther("200");

      await token.approve(alice.address, amount);
      await token
        .connect(alice)
        .transferFrom(owner.address, bob.address, amount);

      expect(await token.balanceOf(bob.address)).to.equal(amount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(0);
    });

    it("should revert transferFrom without sufficient allowance", async function () {
      const { token, owner, alice, bob } = await deployFixture();
      const amount = ethers.parseEther("100");

      await expect(
        token.connect(alice).transferFrom(owner.address, bob.address, amount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });
  });
});
