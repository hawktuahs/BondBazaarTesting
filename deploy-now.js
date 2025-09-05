const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment to Polygon Amoy...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Deploy BondFactory
  console.log("\n1. Deploying BondFactory...");
  const BondFactory = await ethers.getContractFactory("BondFactory");
  const bondFactory = await BondFactory.deploy();
  await bondFactory.waitForDeployment();
  const factoryAddress = await bondFactory.getAddress();
  console.log("BondFactory deployed to:", factoryAddress);
  
  // Create ABC28 Bond Token
  console.log("\n2. Creating ABC28 Bond Token...");
  const abc28Tx = await bondFactory.createBondToken(
    "ABC28",
    "ABC Corp 2028 7.5% Bond",
    ethers.parseUnits("1000000", 18), // 1M tokens
    750, // 7.5% coupon
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 * 4, // 4 years maturity
    80000 // AA rating
  );
  const abc28Receipt = await abc28Tx.wait();
  const abc28Event = abc28Receipt.logs.find(log => {
    try {
      const parsed = bondFactory.interface.parseLog(log);
      return parsed && parsed.name === 'BondTokenCreated';
    } catch (e) {
      return false;
    }
  });
  const abc28Address = abc28Event ? abc28Event.args[0] : "Not found";
  console.log("ABC28 Token deployed to:", abc28Address);
  
  // Create MNO30 Bond Token
  console.log("\n3. Creating MNO30 Bond Token...");
  const mno30Tx = await bondFactory.createBondToken(
    "MNO30",
    "MNO Industries 2030 8.25% Bond",
    ethers.parseUnits("500000", 18), // 500k tokens
    825, // 8.25% coupon
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 * 6, // 6 years maturity
    75000 // A+ rating
  );
  const mno30Receipt = await mno30Tx.wait();
  const mno30Event = mno30Receipt.logs.find(log => {
    try {
      const parsed = bondFactory.interface.parseLog(log);
      return parsed && parsed.name === 'BondTokenCreated';
    } catch (e) {
      return false;
    }
  });
  const mno30Address = mno30Event ? mno30Event.args[0] : "Not found";
  console.log("MNO30 Token deployed to:", mno30Address);
  
  console.log("\n✅ DEPLOYMENT COMPLETE!");
  console.log("\n📋 Add these to your .env file:");
  console.log(`BOND_FACTORY_ADDRESS="${factoryAddress}"`);
  console.log(`ABC28_TOKEN_ADDRESS="${abc28Address}"`);
  console.log(`MNO30_TOKEN_ADDRESS="${mno30Address}"`);
  
  console.log("\n🔗 View on Polygon Amoy Explorer:");
  console.log(`Factory: https://amoy.polygonscan.com/address/${factoryAddress}`);
  console.log(`ABC28: https://amoy.polygonscan.com/address/${abc28Address}`);
  console.log(`MNO30: https://amoy.polygonscan.com/address/${mno30Address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
