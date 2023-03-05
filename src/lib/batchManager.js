import { ServerPool } from 'lib/serverPool';
import { GROW_SCRIPT, HACK_SCRIPT, MONEY_DRIFT_THRESHOLD, SECURITY_DRIFT_THRESHOLD, WEAKEN_SCRIPT } from 'lib/constants';
import { printTable } from 'lib/table';
import { Color, withColor } from 'lib/print';

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
 
 /** @enum {string} */
const ManagerStatus = {
    Preparing: "Preparing",
    Batching: "Batching",
    Recovering: "Recovering"
}

class BatchManagerDashboard {
    /**
     * @param {NS} ns
     * @param {string} target
     */
    constructor(ns, target) {
        this.ns = ns;
        this.target = target;
        
        /** @type {number} */
        this.batchNumber = 0;
        /** @type {ManagerStatus} */
        this.status = ManagerStatus.Preparing;
        /** @type {number} */
        this.numRecovery = 0;
        /** @type {HWGWInfo} */
        this.batchInfo;
        /** @type {number} */
        this.wakeUp = 0;
        
        this.insufficientRamSkips = 0;
    }
    
    setSleep(duration) {
        this.wakeUp = Date.now() + duration;
    }   
    
    getColoredStatus() {
        switch (this.status) {
            case ManagerStatus.Batching:
                return {
                    value: "Batching",
                    color: Color.Green
                }
            case ManagerStatus.Preparing:
                return {
                    value: "Preparing",
                    color: Color.Yellow
                }
            case ManagerStatus.Recovering:
                return {
                    value: "Recovering",
                    color: Color.Red
                }
        }
    }
    
    /**
     * Update the dashboard in log tail window.
     */
    update() {
        this.ns.clearLog();
        
        const ns = this.ns;
        const target = this.target;

        const currentMoney = ns.getServerMoneyAvailable(target);
        const formattedCurrentMoney = ns.nFormat(currentMoney, "$0.00a");
        const maxMoney = ns.getServerMaxMoney(target);
        const formattedMaxMoney = ns.nFormat(maxMoney, "$0.00a");
        const moneyPercent = ns.nFormat(currentMoney / maxMoney, "0.00%")
        
        const currentSecurity = ns.getServerSecurityLevel(target);
        const formattedCurrentSecurity = ns.nFormat(currentSecurity, "0.00");
        const minSecurity = ns.getServerMinSecurityLevel(target);
        const formattedMinSecurity = ns.nFormat(minSecurity, "0.00");
        const deltaSecurity = ns.nFormat(currentSecurity - minSecurity, "0.00")
        
        const data = [];

        data.push({
            label: "Batch #",
            value: this.batchNumber
        })

        data.push({
            label: "Money",
            value: `${formattedCurrentMoney} / ${formattedMaxMoney} (${moneyPercent})`
        })
        
        data.push({
            label: "Security",
            value: `${formattedCurrentSecurity} / ${formattedMinSecurity} (+${deltaSecurity})`,
        })
        
        data.push({
            label: "Status",
            value: this.getColoredStatus()
        })
        
        data.push({
            label: "# of Recoveries",
            value: this.numRecovery
        })

        data.push({
            label: "RAM Skips",
            value: this.insufficientRamSkips
        })
        
        if (this.batchInfo) {
            const hackDelay = ns.tFormat(this.batchInfo.hack.delay, true);
            const firstWeakenDelay = ns.tFormat(this.batchInfo.firstWeaken.delay, true);
            const growDelay = ns.tFormat(this.batchInfo.grow.delay, true);
            const secondWeakenDelay = ns.tFormat(this.batchInfo.secondWeaken.delay, true);

            data.push({
                label: "Hack",
                value: `${this.batchInfo.hack.numThreads} threads @ ${hackDelay} delay`
            })
            
            data.push({
                label: "First Weaken",
                value: `${this.batchInfo.firstWeaken.numThreads} threads @ ${firstWeakenDelay} delay`
            })
            
            data.push({
                label: "Grow",
                value: `${this.batchInfo.grow.numThreads} threads @ ${growDelay} delay`
            })

            data.push({
                label: "Second Weaken",
                value: `${this.batchInfo.secondWeaken.numThreads} threads @ ${secondWeakenDelay} delay`
            })
        }

        data.push({
            label: "Wake up at:",
            value: `${new Date(this.wakeUp).toLocaleTimeString()}`
        })
        
        ns.print(`Batch Hack Manager | Target: ${this.target}`);
        printTable(this.ns, data, {showHeader: false});
    }
}
    
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
        
        this.dashboard = new BatchManagerDashboard(ns, target);
    }

    async logSleep(time) {
        this.dashboard.setSleep(time);
        this.dashboard.update();
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
        this.serverPool.setSharding(true); // Thread requirements high and we don't care about timings
        this.serverPool.setPartialDeploy(true);
        while (
          this.ns.getServerSecurityLevel(this.target) >
          this.ns.getServerMinSecurityLevel(this.target)
        ) {
            const singleThreadWeakenEffect = this.ns.weakenAnalyze(1);
            const weakenTime = this.ns.getWeakenTime(this.target);
            const currentSec = this.ns.getServerSecurityLevel(this.target);
            const minSec = this.ns.getServerMinSecurityLevel(this.target);
            const weakenThreads = Math.ceil((currentSec - minSec) / singleThreadWeakenEffect);

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

            await this.launchWeaken(weakenThreads, 0);
            await this.logSleep(this.executionBuffer + weakenTime);
        }
        this.serverPool.setSharding(false);
        this.serverPool.setPartialDeploy(false);
    }
    
    /**
     * @param {HWGWInfo} batchInfo
     */
    calculateRamRequirements(batchInfo) {
        const singleWeakenRam = this.ns.getScriptRam(WEAKEN_SCRIPT);
        const singleGrowRam = this.ns.getScriptRam(GROW_SCRIPT);
        const singleHackRam = this.ns.getScriptRam(HACK_SCRIPT);

        return (
            batchInfo.hack.numThreads * singleHackRam
            + batchInfo.firstWeaken.numThreads * singleWeakenRam 
            + batchInfo.grow.numThreads * singleGrowRam
            + batchInfo.secondWeaken.numThreads * singleWeakenRam
        )
    }

    async run() {
        this.dashboard.status = ManagerStatus.Preparing;
        await this.prepareServer();

        const batchInfo = this.getBatchInfo();            
        this.dashboard.batchInfo = batchInfo;

        for (let i = 0;;i++) {
            const batchRamRequirements = this.calculateRamRequirements(batchInfo);
            if (this.serverPool.getRemainingMemory() < batchRamRequirements) {
                this.dashboard.insufficientRamSkips++;
                this.dashboard.update();
                await this.ns.sleep(this.executionBuffer * 10);
                continue;
            }

            try {
                await this.launchHack(batchInfo.hack.numThreads, batchInfo.hack.delay);
                await this.launchWeaken(batchInfo.firstWeaken.numThreads, batchInfo.firstWeaken.delay);
                await this.launchGrow(batchInfo.grow.numThreads, batchInfo.grow.delay);
                await this.launchWeaken(batchInfo.secondWeaken.numThreads, batchInfo.secondWeaken.delay);
            } catch (e) {
                this.dashboard.insufficientRamSkips++;
                this.dashboard.update();
            }
            
            if (i % 10 === 0) {
                this.dashboard.status = ManagerStatus.Batching;
                this.dashboard.batchNumber = i;
                await this.logSleep(this.executionBuffer);
            } else {
                await this.ns.sleep(this.executionBuffer);
            }
            
            // Fix any drift issues
            if (
                (this.ns.getServerSecurityLevel(this.target) > this.ns.getServerMinSecurityLevel(this.target) * SECURITY_DRIFT_THRESHOLD)
                || (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target) * MONEY_DRIFT_THRESHOLD)
            ) {
                this.dashboard.status = ManagerStatus.Recovering;
                this.dashboard.batchNumber = i;
                this.dashboard.numRecovery++;
                await this.prepareServer();
            }
        }
    }
}