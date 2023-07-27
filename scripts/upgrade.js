const { ethers, upgrades } = require("hardhat");

const _address = "";

async function main() {
    const factory = await ethers.getContractFactory("askanything_test_upgrade");
    const contract = await upgrades.upgradeProxy(_address, factory);
    console.log(await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
