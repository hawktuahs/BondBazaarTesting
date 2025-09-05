const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Contract ABIs and Bytecodes
const BondFactory = require("./artifacts/contracts/BondFactory.sol/BondFactory.json");
const BondToken = require("./artifacts/contracts/BondToken.sol/BondToken.json");

async function main() {
  try {
    console.log("🚀 Starting Polygon Amoy Deployment...\n");
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider("https://polygon-amoy.g.alchemy.com/v2/kPw4hhzjeGVy8dgBPoc_a");
    const wallet = new ethers.Wallet("0fd5688aac46ac080804b72882adaaf90f064cb081e5f167f433e4533fe93771", provider);
    
    console.log("📍 Deployer Address:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "MATIC\n");
    
    // Deploy BondFactory
    console.log("📝 Deploying BondFactory...");
    const factoryFactory = new ethers.ContractFactory(BondFactory.abi, BondFactory.bytecode, wallet);
    const bondFactory = await factoryFactory.deploy();
    await bondFactory.waitForDeployment();
    const factoryAddress = await bondFactory.getAddress();
    console.log("✅ BondFactory deployed at:", factoryAddress);
    
    // Wait for confirmation
    console.log("⏳ Waiting for confirmations...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create ABC28 Bond
    console.log("\n📝 Creating ABC28 Bond Token...");
    const abc28Tx = await bondFactory.createBondToken(
      "ABC28",
      "ABC Corp 2028 7.5% Bond",
      ethers.parseUnits("1000000", 18),
      750,
      Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 * 4,
      80000
    );
    const abc28Receipt = await abc28Tx.wait();
    
    // Get ABC28 address from events
    let abc28Address = "";
    for (const log of abc28Receipt.logs) {
      try {
        const parsed = bondFactory.interface.parseLog(log);
        if (parsed && parsed.name === 'BondTokenCreated') {
          abc28Address = parsed.args[0];
          break;
        }
      } catch (e) {}
    }
    console.log("✅ ABC28 Token deployed at:", abc28Address);
    
    // Create MNO30 Bond
    console.log("\n📝 Creating MNO30 Bond Token...");
    const mno30Tx = await bondFactory.createBondToken(
      "MNO30",
      "MNO Industries 2030 8.25% Bond",
      ethers.parseUnits("500000", 18),
      825,
      Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 * 6,
      75000
    );
    const mno30Receipt = await mno30Tx.wait();
    
    // Get MNO30 address from events
    let mno30Address = "";
    for (const log of mno30Receipt.logs) {
      try {
        const parsed = bondFactory.interface.parseLog(log);
        if (parsed && parsed.name === 'BondTokenCreated') {
          mno30Address = parsed.args[0];
          break;
        }
      } catch (e) {}
    }
    console.log("✅ MNO30 Token deployed at:", mno30Address);
    
    // Update .env file
    console.log("\n📝 Updating .env file...");
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add contract addresses
    envContent = envContent.replace(/BOND_FACTORY_ADDRESS=.*/, `BOND_FACTORY_ADDRESS="${factoryAddress}"`);
    envContent = envContent.replace(/ABC28_TOKEN_ADDRESS=.*/, `ABC28_TOKEN_ADDRESS="${abc28Address}"`);
    envContent = envContent.replace(/MNO30_TOKEN_ADDRESS=.*/, `MNO30_TOKEN_ADDRESS="${mno30Address}"`);
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env file updated!");
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log(`  Factory: ${factoryAddress}`);
    console.log(`  ABC28:   ${abc28Address}`);
    console.log(`  MNO30:   ${mno30Address}`);
    
    console.log("\n🔗 View on Polygon Amoy Explorer:");
    console.log(`  https://amoy.polygonscan.com/address/${factoryAddress}`);
    console.log(`  https://amoy.polygonscan.com/address/${abc28Address}`);
    console.log(`  https://amoy.polygonscan.com/address/${mno30Address}`);
    
    console.log("\n✨ Your platform is now LIVE on Polygon Amoy blockchain!");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("💡 You need MATIC tokens for gas. Get test MATIC from:");
      console.error("   https://faucet.polygon.technology/");
    }
    process.exit(1);
  }
}

main();
