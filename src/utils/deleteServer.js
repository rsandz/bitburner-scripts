/** @param {NS} ns */
export async function main(ns) {
	if (ns.args.length < 0) {
		ns.tprint("Provide a server");
		ns.exit();
	}
	for (const server of ns.args) {
		if (!ns.serverExists(server)) {
			ns.tprint(`PServer '${server}' does not exist.`);
			continue;
		}
		ns.killall(server);
		ns.deleteServer(server);
		ns.tprint(`Deleted PServer'${server}'`)
	}
}

export function autocomplete(data, args) {
	return [...data.servers];
}