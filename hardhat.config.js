require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-web3");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();
const { env } = require("process");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.19",
    networks: {
        goerli: {
            url: env["URL"],
            accounts: [env["ACCOUNT2_PRIVKEY"]],
        },
    },
};
