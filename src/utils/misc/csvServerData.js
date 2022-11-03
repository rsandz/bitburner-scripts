import { scanRecursive } from '/lib/discovery'

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Print out server data as a CSV.

Usage: run ${ns.getScriptName()} [--help]
    `.trimEnd());
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
    const flagData = ns.flags([
        ['help', false]
    ])

    if (flagData.help) {
        help(ns);
        ns.exit();
    }

    /**
     * @type {Record<String, Object>[]}
     */
    const serverData = []
    scanRecursive(ns, (host) => {
        /** @type {import('../.').Server} */
        const data = ns.getServer(host);
        const hackTime = ns.getHackTime(host);
        const growthTime = ns.getGrowTime(host);
        const weakenTime = ns.getWeakenTime(host);

        const cycleTime = hackTime + growthTime + weakenTime;
        serverData.push({
            name: data.hostname,
            maxMoney: data.moneyMax,
            minSec: data.minDifficulty,
            cycleTime: cycleTime,
            hackLevel: data.requiredHackingSkill
        })
    })
    
    ns.clearLog();
    ns.tail();

    ns.print(`name, maxMoney, minSec, cycleTime, hackLevel`)
    serverData.forEach(record => {
        const {
            name, maxMoney, minSec, cycleTime, hackLevel
        } = record;
        ns.print(`${name}, ${maxMoney}, ${minSec}, ${cycleTime}, ${hackLevel}`);
    })
}