 const { ethers } = require("ethers");
 require("dotenv").config();

async function testConnection() {
  console.log("🔍 Testing Polygon Amoy Connection...\n");

  try {
    // Test RPC connection
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Test wallet
    const pk = process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`;
    const wallet = new ethers.Wallet(pk, provider);
    console.log(`✅ Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC`);

    if (balance === 0n) {
      console.log("\n⚠️  Need test MATIC! Get from: https://faucet.polygon.technology/");
      return false;
    }

    // Test contract interaction
    const factoryAddress = process.env.BOND_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000";
    console.log(`🏭 Testing factory at: ${factoryAddress}`);

    // Simple contract call to test
    const code = await provider.getCode(factoryAddress);
    if (code === "0x") {
      console.log("❌ Factory contract not deployed at this address");
      return false;
    } else {
      console.log("✅ Factory contract found");
    }

    console.log("\n🎉 Blockchain connection successful!");
    return true;

  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);
    return false;
  }
}

testConnection();
