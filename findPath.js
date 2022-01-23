/** @param {NS} ns **/

export async function main(ns) {
    if (ns.args.length !== 2) {
        ns.tprintf("You must provide source and destination nodes! Current args: %s", ns.args)
    }
	let srcHostName = ns.args[0]
    let destHostName = ns.args[1]

    let finalNodes = buildPath(ns, null, srcHostName, destHostName)
    let pathArrs = new Array()
    for (let finalNode of finalNodes) {
        let pathArr = new Array()
        while (finalNode !== null) {
            pathArr.push(finalNode.name)
            finalNode = finalNode.parent
        }
        pathArrs.push(pathArr.reverse())
        ns.tprintf("Path Candidate: %s", pathArr)
    }
    pathArrs.sort((x, y) => x.length - y.length)
    ns.tprintf("Final Path is: %s", pathArrs[0].join(' -> '))
    let commands = ""
    pathArrs[0].forEach(x => {
        commands += `connect ${x}; `
    })
    ns.tprintf("Command: %s", commands)
}

function buildPath(ns, lastNode, curr, dest, visited = new Set(), destNodes = new Array()) {
    let node = new Object()
    node.name = curr
    node.parent = lastNode
    visited.add(curr)
    let children = ns.scan(curr)
    for (const nodeName of children) {
        if (visited.has(nodeName)) {
            continue
        }
        visited.add(nodeName)
        if (nodeName === dest) {
            let fnode = {
                name: nodeName,
                parent: node,
                children: null
            }
            if (!destNodes.includes(fnode)) {
                destNodes.push(fnode)
            }
        } else {
            let returnedDestNodes = buildPath(ns, node, nodeName, dest, visited, destNodes)
            for (const node of returnedDestNodes) {
                if (!destNodes.includes(node)) {
                    destNodes.push(node)
                }
            }
        }
    }
    return destNodes
}
