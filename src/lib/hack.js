/** @param {NS} ns */
export async function main(ns) {
    if (!ns.args[0]) throw Error("Provide a server to hack.");
    await ns.hack(ns.args[0]);
}