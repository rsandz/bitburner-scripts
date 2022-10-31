import { HACK_LIST, autoHack } from 'lib/discovery'

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Updates 'hacklist.txt' with all the servers that are currently hackable.

Usage: run ${ns.getScriptName()}
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

    const hackable = autoHack(ns);
    // Move home to end
    hackable.shift();
    hackable.push("home");

    ns.disableLog("ALL");
    ns.write(HACK_LIST, JSON.stringify(hackable), "w");
    ns.tprint(`Updating ${HACK_LIST} Complete.`);
}