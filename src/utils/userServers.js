const SERVER_PREFIX = "pserv"

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Utility to buy user servers.

Usage: run ${ns.getScriptName()} (--ram number | --factor) [--upgrade] [--help]
		
--ram
	The amount of RAM to buy for new/upgraded servers.
		
--factor
	Increase server ram by a factor.

--upgrade
	If set, will upgrade existing servers. Otherwise, will only buy servers.

--dryRun
	If set, will simulate actions to take and their total cost.
    `.trimEnd());
	
}

function getCurrentMoney(ns) {
	return ns.getServerMoneyAvailable("home");
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
	const flags = ns.flags([
		["help", false],
		["ram", 0],
		["factor", 0],
		["upgrade", false],
		["dryRun", false],
	]);

    if (flags.help) {
        help(ns);
        ns.exit();
    }
	
	if (!flags.ram && !flags.factor) {
		help(ns);
		ns.exit();
	}
	
	if (flags.ram && flags.factor) {
		help(ns);
		ns.exit();
	}

	let servers = ns.getPurchasedServers();
	let ram;
	if (flags.ram) {
		ram = flags.ram;
	} else {
		const maxRam = servers.reduce((prevMax, currHostname) => {
			return Math.max(ns.getServerMaxRam(currHostname), prevMax);
		}, 0);
		ram = maxRam * flags.factor;
	}
	const isDryRun = flags.dryRun;
	let totalCost = 0;

	ns.tprint(`Action: ${flags.upgrade ? 'upgrade and buy' : 'buy'} servers to ${ns.nFormat(ram*1e9, "0.00b")}`);

	if (servers.length < ns.getPurchasedServerLimit()) {
		ns.tprint("Need to purchase servers.");

		for (let i = 0; i < ns.getPurchasedServerLimit(); i++) {
			const serverName = `${SERVER_PREFIX}-${i}`;
			const serverCost = ns.getPurchasedServerCost(ram);
			if (ns.serverExists(serverName)) continue;
			
			if (isDryRun) {
				ns.tprint(`Would purchase server '${serverName}' for \$${ns.nFormat(serverCost, "$0.00a")}`);				
			} else {
				while (getCurrentMoney(ns) < serverCost) await ns.sleep(30000);

				ns.tprint(`Purchasing server ${serverName} for \$${serverCost}`);
				ns.purchaseServer(serverName, ram);
			}
			totalCost += serverCost;
		}
		servers = ns.getPurchasedServers();
	}

	if (flags.upgrade) {
		for (const host of servers) {
			
			const serverRam = ns.getServerMaxRam(host);

			if (serverRam >= ram) {
				ns.tprint(`Not upgrading ${host} at ${serverRam}Gb`);
				continue;
			}
			
			const serverCost = ns.getPurchasedServerCost(ram);

			if (isDryRun) {
				ns.tprint(`Would upgrade ${host} at ${serverRam}Gb for ${ns.nFormat(serverCost, "$0.00a")}`);
			} else {
				ns.tprint(`Upgrading ${host} at ${serverRam}Gb`);
				while (getCurrentMoney(ns) < serverCost) await ns.sleep(30000);

				const runningScripts = ns.ps(host);
				ns.killall(host);
				if (!ns.deleteServer(host)) {
					throw Error(`Could not delete ${host}`);
				}
				if (!ns.purchaseServer(host, ram)) {
					throw Error(`Could not upgrade ${host}`)
				}

				// restore scripts
				runningScripts.forEach((process) => {
					if (!ns.scp(process.filename, host)) {
						throw (`Failed to copy ${process.filename} to ${host}`);
					}
					const pid = ns.exec(process.filename, host, process.threads, ...process.args);
					if (pid < 1) {
						throw Error(`Failed to restore scripts on ${host}. ${process}`);
					}
				})
				ns.print(`Restored scripts on ${host}`);
			}
			
			totalCost += serverCost;
		}
	}

	ns.tprint(`Total Cost: ${ns.nFormat(totalCost, "$0.000a")}`);
	if (isDryRun) {
		ns.tprint(`Would require waiting: ${totalCost > ns.getServerMoneyAvailable('home') ? "YES" : "NO"}`);
	}
}