const fetch = require('node-fetch');

async function testMintAPI() {
  console.log("🧪 Testing Mint API...");

  try {
    // First login to get auth cookie
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@demo.com',
        password: 'password123'
      })
    });

    console.log("Login status:", loginResponse.status);
    const loginData = await loginResponse.json();
    console.log("Login response:", loginData);

    if (!loginResponse.ok) {
      console.log("❌ Login failed");
      return;
    }

    // Extract cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log("Cookies:", cookies);

    // Test mint API
    const mintResponse = await fetch('http://localhost:3000/api/bonds/mint', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        symbol: 'TEST01',
        name: 'Test Corporation 2028 8.5% Bond',
        totalSupply: '100000',
        // Send coupon rate in basis points (8.5% -> 850)
        couponRate: '850',
        maturityYears: '4',
        rating: '80000',
        issuerName: 'Test Corporation',
        description: 'Test bond for debugging'
      })
    });

    console.log("Mint status:", mintResponse.status);
    const mintData = await mintResponse.json();
    console.log("Mint response:", mintData);

  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testMintAPI();
