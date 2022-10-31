const SERVER_PREFIX = "pserv"

/** @param {import("../.").NS} ns */
function help(ns) {
    ns.tprint(`
Utility to buy user servers.

Usage: run ${ns.getScriptName()} --ram number [--upgrade] [--help]
		
--ram
	The amount of RAM to buy for new/upgraded servers.

--upgrade
	If set, will upgrade existing servers. Otherwise, will only buy servers.
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
		["upgrade", false],
	]);

    if (flags.help) {
        help(ns);
        ns.exit();
    }
	
	if (!flags.ram) {
		help(ns);
		ns.exit();
	}

	ns.tprint(`Will ${flags.upgrade ? 'upgrade and buy' : 'buy'} servers to ${flags.ram} gb`);

	let servers = ns.getPurchasedServers();
	const ram = flags.ram;

	if (servers.length < ns.getPurchasedServerLimit()) {
		ns.tprint("Need to purchase servers.");

		for (let i = 0; i < ns.getPurchasedServerLimit(); i++) {
			const serverName = `${SERVER_PREFIX}-${i}`;
			if (ns.serverExists(serverName)) continue;
			while (getCurrentMoney(ns) < ns.getPurchasedServerCost(ram)) await ns.sleep(30000);

			ns.print(`Purchasing server ${serverName}`);
			ns.purchaseServer(serverName, ram);
		}
		servers = ns.getPurchasedServers();
	}

	if (flags.upgrade) {
		ns.tprint("Upgrading Servers.")

		for (const host of servers) {
			if (ns.getServerMaxRam(host) < ram) {
				ns.print(`Upgrading ${host}`);
				while (getCurrentMoney(ns) < ns.getPurchasedServerCost(ram)) await ns.sleep(30000);

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
			} else {
				ns.print(`Not upgrading ${host}`);
			}
		}
	}

	ns.print(`Done.`);
}