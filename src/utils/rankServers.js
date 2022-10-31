import { getServerRankings } from "lib/rank"
import { printTable } from "lib/table";

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Ranks the all servers to hack that is 1/3 level of current hacking skill.

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
    
    const rankings = getServerRankings(ns);

    ns.clearLog();
    ns.tail();

    const formattedRankings = rankings.map(record => {
        const name = record.hostname.padStart(19, ' ');
        const score = record.score.toFixed(2);
        const maxMoney = ns.nFormat(record.maxMoney, '$0.00a')
        const minSec = record.minSecurity.toFixed(2);
        const cycleTime = (record.cycleTime/1000).toFixed(2);
        const growth = record.growth.toFixed(0);
        
        return {
            "Name": name,
            "Score": score,
            "Max Money": maxMoney,
            "Min Security": minSec,
            "Growth": growth,
            "Cycle Time": cycleTime
        }
    })
    
    printTable(ns, formattedRankings);
}