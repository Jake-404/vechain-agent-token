import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. Deploy VeChainAgent token
  const VeChainAgent = await ethers.getContractFactory("VeChainAgent");
  const token = await VeChainAgent.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("VeChainAgent (VA) deployed to:", tokenAddress);

  // 2. Create game signer (or use env var for deterministic key)
  const gameSignerKey =
    process.env.GAME_SIGNER_KEY || ethers.Wallet.createRandom().privateKey;
  const gameSigner = new ethers.Wallet(gameSignerKey);
  console.log("Game signer address:", gameSigner.address);

  // 3. Deploy GameRewards
  const maxScore = 100;
  const cooldown = 30;
  const GameRewards = await ethers.getContractFactory("GameRewards");
  const rewards = await GameRewards.deploy(
    tokenAddress,
    gameSigner.address,
    maxScore,
    cooldown
  );
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("GameRewards deployed to:", rewardsAddress);

  // 4. Fund reward pool with 100,000 VA
  const fundAmount = ethers.parseEther("100000");
  const fundTx = await token.transfer(rewardsAddress, fundAmount);
  await fundTx.wait();
  console.log(
    `Funded GameRewards pool with ${ethers.formatEther(fundAmount)} VA`
  );

  // 5. Summary
  const poolBal = await rewards.poolBalance();
  const deployerBal = await token.balanceOf(deployer.address);
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Token:   ${await token.name()} (${await token.symbol()})`);
  console.log(`Supply:  ${ethers.formatEther(await token.totalSupply())} VA`);
  console.log(`\nAdd these to frontend/.env:`);
  console.log(`VITE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_GAME_REWARDS_ADDRESS=${rewardsAddress}`);
  console.log(`VITE_GAME_SIGNER_KEY=${gameSignerKey}`);
  console.log(`\nPool balance:     ${ethers.formatEther(poolBal)} VA`);
  console.log(
    `Deployer balance: ${ethers.formatEther(deployerBal)} VA`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
