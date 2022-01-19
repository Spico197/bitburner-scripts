/** @param {NS} ns **/

const SCRIPT_NAME = "hack.js"
const PROGRAMS = ["FTPCrack.exe", "BruteSSH.exe", "HTTPWorm.exe", "relaySMTP.exe", "SQLInject.exe"]

export async function main(ns) {
	//printMap(ns, home, nodeMap, "--")
	let mode = ns.args[0]
	ns.connect()
	if (mode === "hackNeighbours") {
		if (ns.args.length > 1) {
			let startNodeName = ns.args[1]
			let [home, nodeMap] = getAll(ns, startNodeName, false)
			for (const node of nodeMap.values()) {
				if (node.hackable && !node.hacked) {
					await hackOne(ns, node.name)
				}
			}
		} else {
			ns.tprintf("NO STARTNODENAME FOUND! Args: %s", ns.args)
		}
	} else if (mode === "hackAll") {
		if (ns.args.length > 1) {
			let startNodeName = ns.args[1]
			let [home, nodeMap] = getAll(ns, startNodeName, true)
			for (const node of nodeMap.values()) {
				if (node.hackable && !node.hacked) {
					await hackOne(ns, node.name)
				}
			}
		} else {
			ns.tprintf("NO STARTNODENAME FOUND! Args: %s", ns.args)
		}
	} else if (mode === "hackOne") {
		if (ns.args.length > 1) {
			let startNodeName = ns.args[1]
			if (isHackable(ns, startNodeName)) {
				await hackOne(ns, node.name)
			} else {
				let node = getHostNode(ns, startNodeName)
				ns.tprintf(
					"NOT HACKABLE! Node: %s, HackSkill: %d, HackPort: %d, Hackable: %s, Hacked: %s",
					node.name, node.requiredHacking, node.requiredPort, node.hackable, node.hacked
				)
				
			}
		} else {
			ns.tprintf("NO STARTNODENAME FOUND! Args: %s", ns.args)
		}
	} else {
		ns.tprint("Help Message")
		ns.tprint("run ProgramName.js [OPTIONS]")
		ns.tprint("run ProgramName.js hackOne hostName")
		ns.tprint("run ProgramName.js hackNeighbours hostName")
		ns.tprint("run ProgramName.js hackAll startHostName")
	}
}

function getHostNode(ns, hostName, parentNode = null) {
	let node = new Object()
	node.name = hostName
	node.parent = parentNode
	node.neighbours = ns.scan(hostName)

	node.requiredHacking = ns.getServerRequiredHackingLevel(hostName)
	node.requiredPort = ns.getServerNumPortsRequired(hostName)
	node.hackable = isHackable(ns, hostName)
	node.hacked = isHacked(ns, hostName)

	return node
}

function getAll(ns, homeName, recursive = false) {
	let nodeMap = new Map()
	let home = getHostNode(ns, homeName)

	nodeMap.set(home.name, home)
	crawl(ns, home, nodeMap, recursive)

	return [home, nodeMap]
}

function crawl(ns, node, nodeMap, recursive = false) {
	//ns.tprintf("%s", node.name)
	node.neighbours.forEach(nodeName => {
		if (nodeMap.has(nodeName) || nodeName === ".") {
			return
		}
		let newNode = getHostNode(ns, nodeName, node)
		nodeMap.set(newNode.name, newNode)

		if (recursive) {
			crawl(ns, newNode, nodeMap, recursive)
		}
	})
}

function isHackable(ns, hostName) {
	let requiredHacking = ns.getServerRequiredHackingLevel(hostName)
	let requiredPort = ns.getServerNumPortsRequired(hostName)
	return ns.getHackingLevel(hostName) >= requiredHacking && getHackablePortNum(ns) >= requiredPort
}

function isHacked(ns, hostName) {
	return ns.hasRootAccess(hostName) && ns.ps(hostName).length > 0
}

function getHackablePortNum(ns, hostName = "home") {
	// how many ports can you hack?
	let hackablePorts = 0

	PROGRAMS.forEach(fileName => {
		if (ns.fileExists(fileName, hostName)) {
			hackablePorts += 1
		}
	})

	return hackablePorts
}

function getRootAccess(ns, nodeName) {
	if (ns.hasRootAccess(nodeName)) {
		return true
	}

	// get root access
	ns.tprintf("Hacking: %s ...", nodeName)
	if (ns.fileExists("FTPCrack.exe", "home")) {
		ns.ftpcrack(nodeName);
	}
	if (ns.fileExists("BruteSSH.exe", "home")) {
		ns.brutessh(nodeName)
	}
	if (ns.fileExists("HTTPWorm.exe", "home")) {
		ns.httpworm(nodeName)
	}
	if (ns.fileExists("relaySMTP.exe", "home")) {
		ns.relaysmtp(nodeName);
	}
	if (ns.fileExists("SQLInject.exe", "home")) {
		ns.sqlinject(nodeName);
	}
	ns.nuke(nodeName)

	return ns.hasRootAccess(nodeName)
}

async function hackOne(ns, nodeName) {
	let availableRam = ns.getServerMaxRam(nodeName) - ns.getServerUsedRam(nodeName)
	let scriptRequiredRam = ns.getScriptRam(SCRIPT_NAME)
	let maxThread = Math.floor(availableRam / scriptRequiredRam)

	let node = getHostNode(ns, nodeName)
	ns.tprintf(
		"Node: %s, HackSkill: %d, HackPort: %d, Hackable: %s, Hacked: %s",
		node.name, node.requiredHacking, node.requiredPort, node.hackable, node.hacked
	)
	if (getRootAccess(ns, node.name)) {
		// transport script
		ns.tprintf("Scp script to: %s ...", node.name)
		await ns.scp(SCRIPT_NAME, node.name)

		// exec
		ns.tprintf("Exec script on: %s ...", node.name)
		if (maxThread > 0) {
			await ns.exec(SCRIPT_NAME, node.name, maxThread, node.name)
		} else {
			ns.tprintf("Cannot exec script on: %s , ram not available", node.name)
		}
	} else {
		ns.tprintf(
			"Hacking Failed! Node: %s, HackSkill: %d, HackPort: %d, Hackable: %s",
			node.name, node.requiredHacking, node.requiredPort, node.hackable
		)
	}
}
