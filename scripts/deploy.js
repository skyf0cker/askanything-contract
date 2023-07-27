const { ethers, upgrades } = require("hardhat");

async function main() {
    const factory = await ethers.getContractFactory("askanything");
    const contract = await upgrades.deployProxy(factory);
    console.log(await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
