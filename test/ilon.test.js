const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ilon Contract", function () {
    let ilon;
    let token;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestToken");
        token = await Token.deploy();

        const Ilon = await ethers.getContractFactory("Ilon");
        ilon = await Ilon.deploy(token.target);
    });

    async function getBlockTime() {
        const block = await ethers.provider.getBlock('latest');
        return block.timestamp;
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await ilon.crowdFundingCount()).to.equal(0);
        });
    });

    describe("Create Campaign", function () {
        it("Should create a new crowdfunding campaign", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 3600;
            
            await ilon.createCrowdFunding("Test Campaign", "Test Description", 1000, startAt, endAt);
            
            const campaign = await ilon.crowdFundings(1);
            expect(campaign.title).to.equal("Test Campaign");
            expect(campaign.description).to.equal("Test Description");
            expect(campaign.goal).to.equal(1000);
            expect(campaign.startAt).to.equal(startAt);
            expect(campaign.endAt).to.equal(endAt);
            expect(campaign.claimed).to.equal(false);
        });

        it("Should reject if start time in past", async function () {
            const now = await getBlockTime();
            const past = now - 100;
            const endAt = past + 3600;

            await expect(
                ilon.createCrowdFunding("Test", "Desc", 1000, past, endAt)
            ).to.be.revertedWith("Start time should be in the future");
        });

        it("Should reject if end before start", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt - 50;

            await expect(
                ilon.createCrowdFunding("Test", "Desc", 1000, startAt, endAt)
            ).to.be.revertedWith("End time should be after start time");
        });
    });

    describe("Contribute", function () {
        beforeEach(async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 3600;
            await ilon.createCrowdFunding("Test Campaign", "Test Description", ethers.parseEther("10"), startAt, endAt);
        });

        it("Should allow users to contribute", async function () {
            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("5") });

            const campaign = await ilon.crowdFundings(1);
            expect(campaign.pledged).to.equal(ethers.parseEther("5"));

            const pledged = await ilon.pledgedAmount(1, addr1.address);
            expect(pledged).to.equal(ethers.parseEther("5"));
        });

        it("Should not allow contributions before campaign starts", async function () {
            await expect(
                ilon.connect(addr1).contribute(1, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Crowd funding hasn't started yet");
        });

        it("Should not allow contributions after campaign ends", async function () {
            await ethers.provider.send("evm_increaseTime", [4000]);
            await ethers.provider.send("evm_mine");

            await expect(
                ilon.connect(addr1).contribute(1, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Crowd funding has ended");
        });

        it("Should accept contributions from multiple users", async function () {
            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("3") });
            await ilon.connect(addr2).contribute(1, { value: ethers.parseEther("7") });

            const campaign = await ilon.crowdFundings(1);
            expect(campaign.pledged).to.equal(ethers.parseEther("10"));
        });

        it("Should reject zero contribution", async function () {
            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await expect(
                ilon.connect(addr1).contribute(1, { value: 0 })
            ).to.be.revertedWith("Contribution should be greater than 0");
        });
    });

    describe("Claim Funds", function () {
        beforeEach(async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;
            await ilon.createCrowdFunding("Test", "Desc", ethers.parseEther("5"), startAt, endAt);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("6") });
        });

        it("Should allow creator to claim funds if goal reached", async function () {
            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine");

            await ilon.claim(1);

            const campaign = await ilon.crowdFundings(1);
            expect(campaign.claimed).to.equal(true);
        });

        it("Should not allow claim before campaign ends", async function () {
            await expect(
                ilon.claim(1)
            ).to.be.revertedWith("Not ended yet");
        });

        it("Should not allow claim if goal not reached", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;
            await ilon.createCrowdFunding("High Goal", "Desc", ethers.parseEther("100"), startAt, endAt);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(2, { value: ethers.parseEther("50") });

            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine");

            await expect(
                ilon.claim(2)
            ).to.be.revertedWith("Goal not reached");
        });

        it("Should not allow non-creator to claim", async function () {
            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine");

            await expect(
                ilon.connect(addr2).claim(1)
            ).to.be.revertedWith("Not owner");
        });

        it("Should not allow claiming more than once", async function () {
            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine");

            await ilon.claim(1);

            await expect(
                ilon.claim(1)
            ).to.be.revertedWith("Already claimed");
        });
    });

    describe("Requirements 3.2", function () {
        it("3.2.1 Campaign creation with parameters", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;

            await ilon.createCrowdFunding("Mars Mission", "Description", ethers.parseEther("10"), startAt, endAt);

            const campaign = await ilon.crowdFundings(1);
            expect(campaign.title).to.equal("Mars Mission");
            expect(campaign.goal).to.equal(ethers.parseEther("10"));
        });

        it("3.2.2 Contribution of ETH to active campaigns", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;
            await ilon.createCrowdFunding("Test", "Desc", ethers.parseEther("10"), startAt, endAt);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("2") });

            const campaign = await ilon.crowdFundings(1);
            expect(campaign.pledged).to.equal(ethers.parseEther("2"));
        });

        it("3.2.3 Accurate tracking of contributions", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;
            await ilon.createCrowdFunding("Test", "Desc", ethers.parseEther("10"), startAt, endAt);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("3") });
            await ilon.connect(addr2).contribute(1, { value: ethers.parseEther("5") });

            expect(await ilon.pledgedAmount(1, addr1.address)).to.equal(ethers.parseEther("3"));
            expect(await ilon.pledgedAmount(1, addr2.address)).to.equal(ethers.parseEther("5"));
        });

        it("3.2.4 Finalization upon reaching deadline", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;
            await ilon.createCrowdFunding("Test", "Desc", ethers.parseEther("5"), startAt, endAt);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("6") });

            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine");

            await ilon.claim(1);

            const campaign = await ilon.crowdFundings(1);
            expect(campaign.claimed).to.equal(true);
        });

        it("3.2.5 Token issuance proportional to contribution", async function () {
            const now = await getBlockTime();
            const startAt = now + 100;
            const endAt = startAt + 200;
            await ilon.createCrowdFunding("Test", "Desc", ethers.parseEther("10"), startAt, endAt);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine");

            await ilon.connect(addr1).contribute(1, { value: ethers.parseEther("5") });

            const balance = await token.balanceOf(addr1.address);
            expect(balance).to.equal(ethers.parseEther("5"));
        });
    });
});