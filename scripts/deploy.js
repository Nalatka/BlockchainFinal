const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  console.log("\n1. Deploying MoonQueue token...");
  const Token = await hre.ethers.getContractFactory("MoonQueue");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("MoonQueue deployed to:", tokenAddress);

  console.log("\n2. Deploying Ilon crowdfunding...");
  const Ilon = await hre.ethers.getContractFactory("Ilon");
  const ilon = await Ilon.deploy(tokenAddress);
  await ilon.waitForDeployment();
  const ilonAddress = await ilon.getAddress();
  console.log("Ilon deployed to:", ilonAddress);

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Token (MoonQueue):", tokenAddress);
  console.log("Crowdfunding (Ilon):", ilonAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});