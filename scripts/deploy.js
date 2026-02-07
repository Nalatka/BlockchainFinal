const hardhat = require("hardhat");

async function main() {
  console.log("Deploying contracts with the Sepolia network...");
    const [deployer] = await hardhat.ethers.getSigners();

    const provider = hre.ethers.provider;
    const block = await provider.getBlockNumber();
    console.log("Connected to block:", block);

    console.log("Deploying contracts with the account:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    console.log(" Deploying MoonQueue token...");
    const Token = await hre.ethers.getContractFactory("TestToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("MoonQueue deployed to:", tokenAddress);

    console.log(" Deploying Ilon..."); 
    const Ilon = await hre.ethers.getContractFactory("Ilon");
    const ilon = await Ilon.deploy(tokenAddress);
    await ilon.waitForDeployment();
    const ilonAddress = await ilon.getAddress();
    console.log("Ilon deployed to:", ilonAddress);

    console.log("Token (MoonQueue):", tokenAddress);
    console.log("Crowdfunding (Ilon):", ilonAddress);
    console.log("\nUpdate app.js CONFIG:");
    console.log(`crowdfundingAddress: "${ilonAddress}",`);
    console.log(`tokenAddress: "${tokenAddress}",`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });