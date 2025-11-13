import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "EncryptedSurvey";

const rel = "../backend";

const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/packages/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");
const artifactsContractJson = path.join(
  dir,
  "artifacts",
  "contracts",
  `${CONTRACT_NAME}.sol`,
  `${CONTRACT_NAME}.json`
);

// Network name to chainId mapping (from hardhat.config.ts)
const networkChainIdMap = {
  "hardhat": 31337,
  "localhost": 31337,
  "anvil": 31337,
  "sepolia": 11155111,
  // Add more networks as needed
};

function readDeployment(chainName, contractName) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);

  if (!fs.existsSync(chainDeploymentDir)) {
    return undefined;
  }

  const contractJsonPath = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(contractJsonPath)) {
    return undefined;
  }

  try {
    const jsonString = fs.readFileSync(contractJsonPath, "utf-8");
    const obj = JSON.parse(jsonString);
    
    // Determine chainId: prefer from deployment file, then from network map, then use network name
    let chainId = obj.chainId;
    if (!chainId) {
      chainId = networkChainIdMap[chainName];
    }
    if (!chainId) {
      // Try to extract from network field if it exists
      if (obj.network && typeof obj.network === 'number') {
        chainId = obj.network;
      } else if (obj.network && typeof obj.network === 'string' && networkChainIdMap[obj.network]) {
        chainId = networkChainIdMap[obj.network];
      }
    }
    
    obj.chainId = chainId || chainName; // Use network name as fallback
    obj.chainName = chainName;
    return obj;
  } catch (e) {
    console.warn(`Failed to read deployment for ${chainName}: ${e.message}`);
    return undefined;
  }
}

// Auto-scan all available deployments
const allDeployments = [];
if (fs.existsSync(deploymentsDir)) {
  const networkDirs = fs.readdirSync(deploymentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const networkName of networkDirs) {
    const deployment = readDeployment(networkName, CONTRACT_NAME);
    if (deployment && deployment.address) {
      allDeployments.push(deployment);
      console.log(`Found deployment: ${networkName} (chainId: ${deployment.chainId || 'unknown'}) - ${deployment.address}`);
    }
  }
} else {
  console.warn(`Deployments directory not found: ${deploymentsDir}`);
}

if (allDeployments.length === 0) {
  console.warn(`No deployments found. Run 'npx hardhat deploy --network <network>' to create deployments.`);
}

// Determine ABI source: prefer compiled artifacts (most up-to-date), fallback to first available deployment ABI
let abiSource;
if (fs.existsSync(artifactsContractJson)) {
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactsContractJson, "utf-8"));
    abiSource = artifact.abi;
    console.log(`Using ABI from compiled artifacts.`);
  } catch (e) {
    console.warn(`Failed to read ABI from artifacts: ${e.message}`);
    abiSource = null;
  }
} else {
  console.warn(`Artifacts not found: ${artifactsContractJson}`);
  abiSource = null;
}

// Fallback to ABI from first available deployment
if (!abiSource && allDeployments.length > 0) {
  abiSource = allDeployments[0].abi;
  console.log(`Using ABI from deployment: ${allDeployments[0].chainName}`);
}

if (!abiSource) {
  console.error(`${line}Unable to find ABI. Please compile the contract first: 'npx hardhat compile'${line}`);
  process.exit(1);
}

// Generate ABI file
const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: abiSource }, null, 2)} as const;
\n`;

// Generate addresses file with all available deployments
let addressesEntries = [];
for (const deployment of allDeployments) {
  const chainId = deployment.chainId;
  // Ensure chainId is a number or string representation
  const chainIdStr = typeof chainId === 'number' ? chainId.toString() : (chainId || 'unknown');
  const chainIdValue = typeof chainId === 'number' ? chainId : (chainId || 'unknown');
  addressesEntries.push(`  "${chainIdStr}": { address: "${deployment.address}", chainId: ${chainIdValue}, chainName: "${deployment.chainName}" }`);
}

// Generate addresses file (empty object if no deployments found)
const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = { 
${addressesEntries.length > 0 ? addressesEntries.join(",\n") : '  // No deployments found'}
};
`;

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);

