const hre = require("hardhat");

async function main() {
  console.log("Deploying InvoiceFi contracts to network...");

  // Deploy MockStablecoin first
  const MockUSDC = await hre.ethers.getContractFactory("MockStablecoin");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.target;
  console.log("MockUSDC deployed to:", usdcAddress);

  // Deploy Invoice contract
  const Invoice = await hre.ethers.getContractFactory("Invoice");
  const invoice = await Invoice.deploy();
  await invoice.waitForDeployment();
  const invoiceAddress = await invoice.target;
  console.log("Invoice deployed to:", invoiceAddress);

  // Deploy LendingPool
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(invoiceAddress, usdcAddress);
  await lendingPool.waitForDeployment();
  const poolAddress = await lendingPool.target;
  console.log("LendingPool deployed to:", poolAddress);

  // Mint test tokens for team members
  const signers = await hre.ethers.getSigners();
  const tokenDecimals = await mockUSDC.decimals();
  console.log("\n=== Minting Test Tokens ===");

  // Mint 10,000 USDC to each signer for testing
  for (let i = 0; i < Math.min(5, signers.length); i++) {
    await mockUSDC.mint(signers[i].address, hre.ethers.parseUnits("10000", Number(tokenDecimals)));
    console.log(`Minted 10,000 mUSDC to ${signers[i].address}`);
  }

  // Save deployment data
  const deployments = {
    network: hre.network.name,
    deployTime: new Date().toISOString(),
    contracts: {
      mockUSDC: usdcAddress,
      invoice: invoiceAddress,
      lendingPool: poolAddress
    }
  };

  const fs = require("fs");
  const deploymentsDir = "./deployments";

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}.json`,
    JSON.stringify(deployments, null, 2)
  );

  console.log("\n✅ Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Update frontend .env with contract addresses");
  console.log("2. Start frontend: npm run dev");
  console.log("3. Connect MetaMask to", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });