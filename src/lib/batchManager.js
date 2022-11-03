import { ServerPool } from 'lib/serverPool';
import { GROW_SCRIPT, HACK_SCRIPT, WEAKEN_SCRIPT } from 'lib/constants';

/** @typedef {import('../.').NS} NS*/
    
/**
 * @typedef ScriptInfo
 * @prop {number} numThreads 
 * @prop {float} delay
 * 
 * @typedef HWGWInfo 
 * @prop {ScriptInfo} hack
 * @prop {ScriptInfo} firstWeaken
 * @prop {ScriptInfo} grow
 * @prop {ScriptInfo} secondWeaken
 */
    
/**
 * Hacking Manager using the batch algorithm.
 * 
 * Specifically: Hack, Weaken, Grow, Weaken (HWGW) algorithm is used.
 */
export class BatchManager {
    
    /**
     * @param {NS} ns
     * @param {ServerPool} serverPool The server pool to use. Should use atomic deploy strategy.
     * @param {string} target The server to hack
     */
    constructor(ns, serverPool, target, executionBuffer = 150, hackAmountRatio = 0.5) {
        /** @type {ServerPool} */
        this.serverPool = serverPool;
        this.serverPool.setSharding(false);
        /** @type {NS} */
        this.ns = ns;
        /** @type {string} */
        this.target = target;
        /** @type {float} */
        this.hackAmountRatio = hackAmountRatio;
        /** @type {number} */
        this.executionBuffer = executionBuffer;
    }

    async logSleep(time) {
        this.ns.print(`Sleeping for ${(time / 1000).toFixed(2)}s`);
        await this.ns.sleep(time);
    }
    
    /**
     * Get the timings and number of threads for HWGW.
     * Pre Condition: Server @ min security and max money.
     * @return {HWGWInfo}
     */
    getBatchInfo() {
        const hackAmount = this.ns.getServerMaxMoney(this.target) * this.hackAmountRatio;
        const singleThreadWeakenEffect = this.ns.weakenAnalyze(1);

        this.ns.print(this.target);
        // Calculate thread requirements
        let hackThreads = Math.ceil(
          this.ns.hackAnalyzeThreads(this.target, hackAmount)
        );
        

        const hackSecurityIncrease = this.ns.hackAnalyzeSecurity(hackThreads);
        const hackWeakenThreads = Math.ceil(hackSecurityIncrease / singleThreadWeakenEffect);
        
        const growThreads = Math.ceil(
          this.ns.growthAnalyze(this.target, 1 / (1 - this.hackAmountRatio))
        );
        const growSecurityIncrease = this.ns.growthAnalyzeSecurity(growThreads);
        const growWeakenThreads = Math.ceil(growSecurityIncrease / singleThreadWeakenEffect);
        
        // Calculate delays
        // Weaken Time > Grow Time > Hack Time
        // Expected launch is 2 weaken, then grow, then hack.
        const weakenTime = this.ns.getWeakenTime(this.target);
        const growTime = this.ns.getGrowTime(this.target);
        const hackTime = this.ns.getHackTime(this.target);
        
        const hackDelay = weakenTime - this.executionBuffer - hackTime;
        const firstWeakenDelay = 0;
        const growDelay = weakenTime + this.executionBuffer - growTime;
        const secondWeakenDelay = 2 * this.executionBuffer;
        
        return {
            hack: { numThreads: hackThreads, delay: hackDelay },
            firstWeaken: { numThreads: hackWeakenThreads, delay: firstWeakenDelay },
            grow: { numThreads: growThreads, delay: growDelay },
            secondWeaken: { numThreads: growWeakenThreads, delay: secondWeakenDelay }
        }
    }
    
    /**
     * @param {number} threads
     * @param {number} delay
     */
    async launchHack(threads, delay) {
        const uuid = crypto.randomUUID();
        return await this.serverPool.deploy(HACK_SCRIPT, threads, this.target, delay, uuid);
    }
    
    /**
     * @param {number} threads
     * @param {number} delay
     */
    async launchWeaken(threads, delay) {
        const uuid = crypto.randomUUID();
        return await this.serverPool.deploy(WEAKEN_SCRIPT, threads, this.target, delay, uuid);
    }
    
    /**
     * @param {number} threads
     * @param {number} delay
     */
    async launchGrow(threads, delay) {
        const uuid = crypto.randomUUID();
        return await this.serverPool.deploy(GROW_SCRIPT, threads, this.target, delay, uuid);
    }
    
    /**
     * Gets the server to max money and min security.
     */
    async prepareServer() {
        this.ns.print("⚙ Preparing server.")

        while (
          this.ns.getServerSecurityLevel(this.target) >
          this.ns.getServerMinSecurityLevel(this.target)
        ) {
            const singleThreadWeakenEffect = this.ns.weakenAnalyze(1);
            const weakenTime = this.ns.getWeakenTime(this.target);
            const currentSec = this.ns.getServerSecurityLevel(this.target);
            const minSec = this.ns.getServerMinSecurityLevel(this.target);
            const weakenThreads = Math.ceil((currentSec - minSec) / singleThreadWeakenEffect);

            this.ns.print(`📛 Current Sec ${currentSec} > Min Sec ${minSec}.`);
            this.ns.print(`Weakening with ${weakenThreads} threads.`);

            await this.launchWeaken(weakenThreads, 0);
            await this.logSleep(this.executionBuffer + weakenTime);
        }
        
        while (
            this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target)
        ) {
            const growTime = this.ns.getGrowTime(this.target);
            const currentMoney = this.ns.getServerMoneyAvailable(this.target);
            const maxMoney = this.ns.getServerMaxMoney(this.target);
            const growthRatio = maxMoney / currentMoney;
            const growThreads = Math.ceil(this.ns.growthAnalyze(this.target, growthRatio));

            this.ns.print(`⏫ Current \$${currentMoney} < Max \$${maxMoney}.`);
            this.ns.print(`Growing with ${growThreads} threads.`);
            
            await this.launchGrow(growThreads, 0);
            await this.logSleep(this.executionBuffer + growTime);
        }
        
        // Weaken effects of grow
        while (
          this.ns.getServerSecurityLevel(this.target) >
          this.ns.getServerMinSecurityLevel(this.target)
        ) {
            const singleThreadWeakenEffect = this.ns.weakenAnalyze(1);
            const weakenTime = this.ns.getWeakenTime(this.target);
            const currentSec = this.ns.getServerSecurityLevel(this.target);
            const minSec = this.ns.getServerMinSecurityLevel(this.target);
            const weakenThreads = Math.ceil((currentSec - minSec) / singleThreadWeakenEffect);

            this.ns.print(`📛 Current Sec ${currentSec} > Min Sec ${minSec}.`);
            this.ns.print(`Weakening with ${weakenThreads} threads.`);

            await this.launchWeaken(weakenThreads, 0);
            await this.logSleep(this.executionBuffer + weakenTime);
        }
        this.ns.print("⚙ Done Preparing server.");
    }

    async run() {
        await this.prepareServer();

        const batchInfo = this.getBatchInfo();            
        for (let i = 0;;i++) {
            this.ns.print(`
Batch #${i}
-----------
Hack: ${batchInfo.hack.numThreads} threads in ${batchInfo.hack.delay}ms
Weaken: ${batchInfo.firstWeaken.numThreads} threads in ${batchInfo.firstWeaken.delay}ms
Grow: ${batchInfo.grow.numThreads} threads in ${batchInfo.grow.delay}ms
Weaken: ${batchInfo.secondWeaken.numThreads} threads in ${batchInfo.secondWeaken.delay}ms
            `.trim())
            
            await this.launchHack(batchInfo.hack.numThreads, batchInfo.hack.delay);
            await this.launchWeaken(batchInfo.firstWeaken.numThreads, batchInfo.firstWeaken.delay);
            await this.launchGrow(batchInfo.grow.numThreads, batchInfo.grow.delay);
            await this.launchWeaken(batchInfo.secondWeaken.numThreads, batchInfo.secondWeaken.delay);
            
            await this.logSleep(this.executionBuffer);
            
            // Fix any drift issues
            if (
                (this.ns.getServerSecurityLevel(this.target) > this.ns.getServerMinSecurityLevel(this.target) * 1.5)
                || (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target) * 0.25)
            ) {
                await this.prepareServer();
            }
        }
    }
}