import { HACK_LIST, autoHack } from 'lib/discovery'
import { HACK_TARGETS_LIST } from 'lib/constants';
import { getServerHostnameRankings } from 'lib/rank';

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Updates 'hacklist.txt' and 'targetList.txt'.

Usage: run ${ns.getScriptName()} [--targetAmount n]

hacklist.txt will be updated with all servers we can run scripts on.

--targetAmount n
    If provided, the targetList.txt will be updated to contain the n most 
    desirable servers to hack.
    `.trimEnd());
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
    const flagData = ns.flags([
        ['help', false],
        ['targetAmount', 0]
    ])

    if (flagData.help) {
        help(ns);
        ns.exit();
    }

    const hackable = autoHack(ns);
    // Move home to end
    hackable.shift();
    hackable.push("home");

    ns.disableLog("ALL");
    ns.write(HACK_LIST, JSON.stringify(hackable), "w");
    ns.tprint(`Updating ${HACK_LIST} Complete.`);
    
    if (flagData.targetAmount) {
        const serverRankings = getServerHostnameRankings(ns);
        const targetServers = serverRankings.slice(0, flagData.targetAmount);
        ns.write(HACK_TARGETS_LIST, JSON.stringify(targetServers), "w");
        ns.tprint(`Updating ${HACK_TARGETS_LIST} Complete.`);
    }
}