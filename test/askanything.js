const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { DateTime } = require("luxon");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("askanything contract", function () {
    it("should store the question person asked and record reward", async function () {
        const [_, personAsking] = await ethers.getSigners();
        const askanything = await ethers.getContractFactory("askanything");
        const contract = await upgrades.deployProxy(askanything);
        expect(await contract.questionNum()).to.equal(0);

        const expiration = DateTime.now().plus({ seconds: 10 });
        await contract
            .connect(personAsking)
            .askQuestion(
                "hi, what's your name",
                "pubkey",
                expiration.toUnixInteger(),
                {
                    value: ethers.parseEther("0.0001"),
                }
            );
        expect(await contract.questionNum()).to.equal(1);

        const q = await contract.qs(0);
        expect(q[0]).not.empty;
        expect(q[1]).to.equal(await personAsking.getAddress());
        expect(q[2]).to.equal("hi, what's your name");
        expect(q[3]).to.equal(ethers.parseEther("0.0001"));
        expect(q[4]).to.equal(expiration.toUnixInteger());

        const myQuestions = await contract
            .connect(personAsking)
            .getMyQuestions();

        expect(myQuestions.length).to.equal(1);
        expect(myQuestions[0][0]).to.equal(q[0]);
    });

    it("should log event when ask question", async function () {
        const [owner, personAsking] = await ethers.getSigners();
        const askanything = await ethers.getContractFactory("askanything");
        const contract = await upgrades.deployProxy(askanything);
        expect(await contract.questionNum()).to.equal(0);

        const expiration = DateTime.now().plus({ seconds: 10 });
        await contract
            .connect(personAsking)
            .askQuestion(
                "hi, what's your name",
                "pubkey",
                expiration.toUnixInteger(),
                {
                    value: ethers.parseEther("0.0001"),
                }
            );
        expect(await contract.questionNum()).to.equal(1);
        const q = await contract.qs(0);

        const events = await contract.queryFilter("askQuestionEvent");
        expect(events.length).to.equal(1);
        expect(events[0].args[0]).to.equal(q[0]);
        expect(events[0].args[1]).to.equal(q[1]);
        expect(events[0].args[2]).to.equal(q[4]);
    });

    it("should support cancel the question expired and get money back", async function () {
        const [_, personAsking] = await ethers.getSigners();
        const askanything = await ethers.getContractFactory("askanything");
        const contract = await upgrades.deployProxy(askanything);
        expect(await contract.questionNum()).to.equal(0);

        const expiration = DateTime.now().plus({ minutes: 5 });
        await contract
            .connect(personAsking)
            .askQuestion(
                "hi, what's your name",
                "pubkey",
                expiration.toUnixInteger(),
                {
                    value: ethers.parseEther("0.0001"),
                }
            );
        expect(await contract.questionNum()).to.equal(1);
        expect(
            await ethers.provider.getBalance(await contract.getAddress())
        ).to.equal(ethers.parseEther("0.0001"));

        const q = await contract.qs(0);
        const before = await ethers.provider.getBalance(personAsking);

        // expire
        await time.increaseTo(expiration.plus({ seconds: 10 }).toUnixInteger());

        const tx = await contract.connect(personAsking).cancelQuestion(q[0]);
        const gas = (await tx.wait()).gasUsed * tx.gasPrice;
        const after = await ethers.provider.getBalance(personAsking);
        expect(before + ethers.parseEther("0.0001") - gas).to.equal(after);
    });

    it("should not support to cancel the question not expired", async function () {
        const [_, personAsking] = await ethers.getSigners();
        const askanything = await ethers.getContractFactory("askanything");
        const contract = await upgrades.deployProxy(askanything);
        expect(await contract.questionNum()).to.equal(0);

        const expiration = DateTime.now().plus({ seconds: 500 });
        await contract
            .connect(personAsking)
            .askQuestion(
                "hi, what's your name",
                "pubkey",
                expiration.toUnixInteger(),
                {
                    value: ethers.parseEther("0.0001"),
                }
            );

        const q = await contract.qs(0);
        await expectRevert(
            contract.connect(personAsking).cancelQuestion(q[0]),
            "cannot cancel question not expired"
        );
    });

    it("should not support to cancel the question had been answered", async function () {
        const [owner, personAsking] = await ethers.getSigners();
        const askanything = await ethers.getContractFactory("askanything");
        const contract = await upgrades.deployProxy(askanything);
        expect(await contract.questionNum()).to.equal(0);

        const expiration = DateTime.now().plus({ minutes: 10 });
        await contract
            .connect(personAsking)
            .askQuestion(
                "hi, what's your name",
                "pubkey",
                expiration.toUnixInteger(),
                {
                    value: ethers.parseEther("0.0001"),
                }
            );

        const q = await contract.qs(0);
        await contract
            .connect(owner)
            .answerQuestion(q[0], "My name is satoshi");

        // expire
        await time.increaseTo(expiration.plus({ seconds: 10 }).toUnixInteger());

        await expectRevert(
            contract.connect(personAsking).cancelQuestion(q[0]),
            "cannot cancel question had been answered"
        );
    });

    it("should support upgrade", async function () {
        const askanything = await ethers.getContractFactory("askanything");
        const anotherVersion = await ethers.getContractFactory(
            "askanything_test_upgrade"
        );
        const contract = await upgrades.deployProxy(askanything);

        let hasErr = false;
        try {
            await contract.testValue();
        } catch (err) {
            hasErr = true;
            expect(err.code).to.equal("INVALID_ARGUMENT");
        }
        expect(hasErr).to.true;

        const upgraded = await upgrades.upgradeProxy(
            await contract.getAddress(),
            anotherVersion
        );
        await upgraded.setTestValue("hi");
        const val = await upgraded.testValue();
        expect(val).to.equal("hi");
    });
});
