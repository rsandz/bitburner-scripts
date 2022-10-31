

/** @param {NS} ns */
export async function main(ns) {
    if (!ns.args[0]) throw Error("Provide a server to weaken.");
    await ns.weaken(ns.args[0]);
}