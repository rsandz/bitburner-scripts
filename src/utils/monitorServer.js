/** @param {import("../.").NS} ns */
export async function main(ns) {
	const argData = ns.flags([
    ['refreshrate', 5000],
    ['cores', 1],
    ['help', false]
  ]);

	const server = argData._[0];
  const refreshRate = argData["refreshrate"];
  const cpuCores = argData["cores"];

	if (!server || argData["help"]) {
    ns.tprint("Monitors useful server information in real time.");
    ns.tprint(`Usage: ${ns.getScriptName()} [--help] [--refreshrate ms] [--cores n] server`);
    ns.exit();
	}
	
	ns.tail();
	ns.disableLog("ALL");
    
	while (true) {
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ns.getServerMinSecurityLevel(server);
    let money = ns.getServerMoneyAvailable(server);
    if (money === 0) money = 1;
    const sec = ns.getServerSecurityLevel(server);

    // Ratio Analysis
    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(server, money / 2));
    const growThreads = Math.ceil(ns.growthAnalyze(server, 2, cpuCores) / ns.getHackTime(server) * ns.getGrowTime(server));

    const hackSecGain = ns.hackAnalyzeSecurity(hackThreads, server);
    const growSecGain = ns.growthAnalyzeSecurity(growThreads, server, cpuCores);
    const securityToRemove = hackSecGain + growSecGain;

    // Plus 1 for good measure
    const weakenThreads = Math.ceil(securityToRemove / ns.weakenAnalyze(1, cpuCores) / ns.getHackTime(server) * ns.getWeakenTime(server)) + 1;

    ns.clearLog(server);
    ns.print(`${server}:`);
    ns.print(` root____: ${ns.hasRootAccess(server)}`);
    ns.print(` $_______: ${ns.nFormat(money, "$0.000a")} / ${ns.nFormat(maxMoney, "$0.000a")} (${(money / maxMoney * 100).toFixed(2)}%)`);
    ns.print(` security: ${sec.toFixed(2)} (+${(sec - minSec).toFixed(2)})`);
    ns.print(` hack____: ${(ns.hackAnalyzeChance(server) * 100).toFixed(2)}% ${ns.tFormat(ns.getHackTime(server))} (t=${Math.ceil(ns.hackAnalyzeThreads(server, money))})`);
    ns.print(` grow____: ${ns.tFormat(ns.getGrowTime(server))} (t=${Math.ceil(ns.growthAnalyze(server, maxMoney / money))})`);
    ns.print(` weaken__: ${ns.tFormat(ns.getWeakenTime(server))} (t=${Math.ceil((sec - minSec) / ns.weakenAnalyze(1, cpuCores))})`);
    ns.print('===========')
    ns.print(`Hack 50% / Grow 50% / Weaken: ${hackThreads} / ${growThreads} / ${weakenThreads}` );
    ns.print(`Refresh Rate: ${refreshRate} ms | Cores: ${cpuCores}`)
    await ns.sleep(refreshRate);
  }
}

export function autocomplete(data, args) {
  return [...data.servers];
}
