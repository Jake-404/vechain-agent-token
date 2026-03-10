import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying VeChainAgent with account:", deployer.address);

  const VeChainAgent = await ethers.getContractFactory("VeChainAgent");
  const token = await VeChainAgent.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("VeChainAgent (VA) deployed to:", address);

  // Verify deployment
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  console.log(`Token: ${name} (${symbol})`);
  console.log(
    `Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`
  );
  console.log(
    `Deployer Balance: ${ethers.formatEther(await token.balanceOf(deployer.address))} ${symbol}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
