
/** @param {NS} ns */
export async function main(ns) {
    if (!ns.args[0]) throw Error("Provide a server to grow.");
    await ns.grow(ns.args[0]);
}