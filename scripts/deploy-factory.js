const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying BondFactory to Polygon Amoy...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying from account:", deployer.address);
  
  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC");
  
  // Deploy BondFactory
  console.log("🏭 Deploying BondFactory...");
  const BondFactory = await hre.ethers.getContractFactory("BondFactory");
  const bondFactory = await BondFactory.deploy();
  
  await bondFactory.waitForDeployment();
  const factoryAddress = await bondFactory.getAddress();
  
  console.log("✅ BondFactory deployed to:", factoryAddress);
  console.log("🔗 Verify on PolygonScan:", `https://amoy.polygonscan.com/address/${factoryAddress}`);
  
  // Persist deployed address to files
  try {
    fs.writeFileSync("factory-address.txt", factoryAddress + "\n");
    console.log("📝 Saved factory address to factory-address.txt");
  } catch (e) {
    console.log("ℹ️  Could not write factory-address.txt:", e.message);
  }
  try {
    const out = {
      network: (await hre.ethers.provider.getNetwork()).chainId,
      factoryAddress,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync("deployment-factory.json", JSON.stringify(out, null, 2));
    console.log("📝 Saved deployment details to deployment-factory.json");
  } catch (e) {
    console.log("ℹ️  Could not write deployment-factory.json:", e.message);
  }
  // Attempt to update local .env
  try {
    const envPath = ".env";
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (/^BOND_FACTORY_ADDRESS=.*/m.test(envContent)) {
        envContent = envContent.replace(/^BOND_FACTORY_ADDRESS=.*/m, `BOND_FACTORY_ADDRESS="${factoryAddress}"`);
      } else {
        envContent += `\nBOND_FACTORY_ADDRESS="${factoryAddress}"\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Updated .env with BOND_FACTORY_ADDRESS");
    } else {
      console.log("ℹ️  .env not found; please set BOND_FACTORY_ADDRESS manually in your environment.");
    }
  } catch (e) {
    console.log("ℹ️  Skipped updating .env:", e.message);
  }
  
  // Authorize deployer as issuer (you'll be authorized by default as owner)
  console.log("🔐 Authorizing deployer as issuer...");
  const authTx = await bondFactory.authorizeIssuer(deployer.address);
  await authTx.wait();
  console.log("✅ Deployer authorized as bond issuer");
  
  // Update environment variables recommendation
  console.log("\n📋 Update your .env file with:");
  console.log(`BOND_FACTORY_ADDRESS="${factoryAddress}"`);
  console.log(`POLYGON_AMOY_RPC_URL="YOUR_RPC_URL"`);
  console.log(`PRIVATE_KEY="${deployer.address === process.env.EXPECTED_WALLET ? 'ALREADY_SET' : 'UPDATE_THIS'}"`);
  
  // Verification info
  console.log("\n🔍 To verify contract on PolygonScan:");
  console.log(`npx hardhat verify --network polygonAmoy ${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
