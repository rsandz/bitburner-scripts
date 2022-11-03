/** @typedef {import('../.').NS} NS */

/** @param {NS} ns */
export async function main(ns) {
    if (!ns.args[0]) throw Error("Provide a server to weaken.");
    if (ns.args[1]) {
        await ns.sleep(ns.args[1]);
    }
    await ns.weaken(ns.args[0]);
}