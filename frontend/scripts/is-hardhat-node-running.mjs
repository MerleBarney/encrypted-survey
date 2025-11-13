import { JsonRpcProvider } from "ethers";

async function checkHardhatNode() {
  try {
    const provider = new JsonRpcProvider("http://localhost:8545");
    await provider.getBlockNumber();
    console.log("Hardhat node is running");
    process.exit(0);
  } catch (error) {
    console.error("Hardhat node is not running. Please start it with: npx hardhat node");
    process.exit(1);
  }
}

checkHardhatNode();

