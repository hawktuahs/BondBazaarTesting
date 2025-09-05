const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BondBazaar contracts to Polygon Amoy...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  // Deploy BondFactory
  const BondFactory = await ethers.getContractFactory("BondFactory");
  const bondFactory = await BondFactory.deploy();
  await bondFactory.deployed();

  console.log("BondFactory deployed to:", bondFactory.address);

  // Deploy sample bond tokens
  const bonds = [
    {
      bondId: "ABC28",
      name: "ABC Corp 2028 Bond Token",
      symbol: "ABC28",
      issuer: "ABC Corporation",
      faceValue: ethers.parseEther("1000"), // ₹1000 face value
      couponRate: 750, // 7.5%
      maturityDate: Math.floor(new Date("2028-12-31").getTime() / 1000),
      rating: "AA",
      totalSupply: ethers.parseEther("10000000") // 10M tokens
    },
    {
      bondId: "MNO30",
      name: "MNO Industries 2030 Bond Token",
      symbol: "MNO30",
      issuer: "MNO Industries",
      faceValue: ethers.parseEther("1000"),
      couponRate: 825, // 8.25%
      maturityDate: Math.floor(new Date("2030-06-15").getTime() / 1000),
      rating: "A+",
      totalSupply: ethers.parseEther("5000000") // 5M tokens
    }
  ];

  // Authorize deployer as issuer
  await bondFactory.authorizeIssuer(deployer.address);
  console.log("Deployer authorized as issuer");

  // Deploy bond tokens
  for (const bond of bonds) {
    console.log(`Deploying ${bond.name}...`);
    
    const tx = await bondFactory.deployBond(
      bond.bondId,
      bond.name,
      bond.symbol,
      bond.issuer,
      bond.faceValue,
      bond.couponRate,
      bond.maturityDate,
      bond.rating,
      bond.totalSupply
    );
    
    await tx.wait();
    
    const tokenAddress = await bondFactory.getBondToken(bond.bondId);
    console.log(`${bond.name} deployed to:`, tokenAddress);
  }

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    bondFactory: bondFactory.address,
    bonds: {}
  };

  for (const bond of bonds) {
    const tokenAddress = await bondFactory.getBondToken(bond.bondId);
    deploymentInfo.bonds[bond.bondId] = {
      tokenAddress,
      ...bond
    };
  }

  console.log("\nDeployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
