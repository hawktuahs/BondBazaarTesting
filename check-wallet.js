const { ethers } = require("ethers");
require("dotenv").config();

async function checkWallet() {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
  const pk = process.env.PRIVATE_KEY?.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(pk, provider);
  
  console.log("Wallet Address:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("MATIC Balance:", ethers.formatEther(balance), "MATIC");
  
  if (balance === 0n) {
    console.log("\n🚨 NO MATIC BALANCE!");
    console.log("Get test MATIC from: https://faucet.polygon.technology/");
    console.log("Or use: https://www.alchemy.com/faucets/polygon-amoy");
    console.log("\nWallet to fund:", wallet.address);
  } else {
    console.log("✅ Wallet has MATIC for gas fees");
  }
}

checkWallet().catch(console.error);
