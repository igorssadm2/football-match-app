// Script to test external API connectivity

const BACKEND_URL = "https://vamojogar-production.up.railway.app";

async function testSkillsEndpoint() {
  console.log("Testing skills endpoint...");
  console.log(`URL: ${BACKEND_URL}/api/v1/skills/football`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/skills/football`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response Body:`, text);
    
    try {
      const json = JSON.parse(text);
      console.log(`Parsed JSON:`, JSON.stringify(json, null, 2));
    } catch {
      console.log("Response is not valid JSON");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function testLoginEndpoint() {
  console.log("\n\nTesting login endpoint...");
  console.log(`URL: ${BACKEND_URL}/api/v1/auth/login`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "test123",
      }),
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const text = await response.text();
    console.log(`Response Body:`, text);
    
    try {
      const json = JSON.parse(text);
      console.log(`Parsed JSON:`, JSON.stringify(json, null, 2));
    } catch {
      console.log("Response is not valid JSON");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function testHealthEndpoint() {
  console.log("Testing health/root endpoint...");
  console.log(`URL: ${BACKEND_URL}`);
  
  try {
    const response = await fetch(BACKEND_URL, {
      method: "GET",
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const text = await response.text();
    console.log(`Response Body (first 500 chars):`, text.substring(0, 500));
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function main() {
  console.log("=== External API Connectivity Test ===\n");
  
  await testHealthEndpoint();
  await testSkillsEndpoint();
  await testLoginEndpoint();
  
  console.log("\n=== Tests completed ===");
}

main();
