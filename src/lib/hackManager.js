
export class HackManager {
    
    /**
     * @param {import('../.').NS} ns
     * @param {import('./serverPool').ServerPool} serverPool
     * @param {String} target
     */
    constructor(ns, serverPool, target, hackAmount = 0.5) {
        this.serverPool = serverPool;
        this.ns = ns;
        this.target = target;
        this.hackAmount = hackAmount;
    }
    
    async logSleep(time) {
        this.ns.print(`Sleeping for ${(time / 1000).toFixed(2)}s`);
        await this.ns.sleep(time);
    }
    
    async run() {
        while (true) {
            const currentMoney = this.ns.getServerMoneyAvailable(this.target);
            const maxMoney = this.ns.getServerMaxMoney(this.target);

            const currentSec = this.ns.getServerSecurityLevel(this.target);
            const minSec = this.ns.getServerMinSecurityLevel(this.target);
            const weakenOneThreadEffect = this.ns.weakenAnalyze(1);

            if (currentSec > minSec) {
                this.ns.print(`📛 Current Sec ${currentSec} > Min Sec ${minSec}. Weakening...`);
                const optimalThreads = Math.ceil((currentSec - minSec) / weakenOneThreadEffect);
                const viableThreads = this.serverPool.getScriptMaxDeployableThreads('/lib/weaken.js');
                const weakenThreads = Math.min(optimalThreads, viableThreads);
                const weakTime = this.ns.getWeakenTime(this.target);
                this.ns.print(`Launching ${weakenThreads} threads of ${optimalThreads} required threads`);
                await this.serverPool.deploy('/lib/weaken.js', weakenThreads, this.target);
                await this.logSleep(weakTime + 1000);
            }
            else if (currentMoney < maxMoney) {
                this.ns.print(`⏫ Current \$${currentMoney} < Max \$${maxMoney}. Growing...`);
                const growthRatio = maxMoney * 1.025 / currentMoney;
                const optimalThreads = Math.ceil(this.ns.growthAnalyze(this.target, growthRatio));
                const viableThreads = this.serverPool.getScriptMaxDeployableThreads('/lib/grow.js');
                const growThreads = Math.min(optimalThreads, viableThreads);
                const growTime = this.ns.getGrowTime(this.target);
                this.ns.print(`Launching ${growThreads} threads of ${optimalThreads} required threads`);
                await this.serverPool.deploy('/lib/grow.js', growThreads, this.target);
                await this.logSleep(growTime + 1000);
            }
            else {
                this.ns.print(`💰 Hacking ${this.hackAmount * 100}%...`);
                const optimalThreads = Math.ceil(this.ns.hackAnalyzeThreads(this.target, currentMoney * this.hackAmount));
                const viableThreads = this.serverPool.getScriptMaxDeployableThreads('/lib/hack.js');
                const hackThreads = Math.min(optimalThreads, viableThreads);
                const hackTime = this.ns.getHackTime(this.target);
                this.ns.print(`Launching ${hackThreads} threads of ${optimalThreads} required threads`);
                await this.serverPool.deploy('/lib/hack.js', hackThreads, this.target);
                await this.logSleep(hackTime + 1000);
            }
        }
    }
}