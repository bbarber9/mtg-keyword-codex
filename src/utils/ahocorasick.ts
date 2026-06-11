class AhoCorasickNode {
	children: Map<string, AhoCorasickNode> = new Map();
	output: string[] = [];
	failureFallbackNode: AhoCorasickNode | null = null;
}

export interface Match {
	start: number;
	end: number;
	value: string;
}

export class AhoCorasickNodeSearcher {
	root = new AhoCorasickNode();

	addSearchTerm(str: string) {
		// build a trie of the search terms, where each node is a letter
		// and the output is the full term that ends at that node
		let node = this.root;
		for (const char of str) {
			const child = node.children.get(char);
			if (child !== undefined) {
				node = child;
			} else {
				const newNode = new AhoCorasickNode();
				node.children.set(char, newNode);
				node = newNode;
			}
		}
		node.output.push(str);
	}

	buildFailureLinks() {
		const queue: AhoCorasickNode[] = [];
		for (const child of this.root.children.values()) {
			child.failureFallbackNode = this.root;
			queue.push(child);
		}

		while (queue.length > 0) {
			const curNode = queue.shift();
			if (!curNode) {
				break;
			}
			for (const [key, child] of curNode.children.entries()) {
				// add to queue for BFS
				queue.push(child);
				// Start from this node's backup spot and keep stepping backward
				// until we find one that has this same next letter.
				let curFailure = curNode.failureFallbackNode;
				while (curFailure !== null && !curFailure.children.get(key)) {
					curFailure = curFailure.failureFallbackNode;
				}
				// If this path can't continue, jump to the best backup spot that can.
				// If no backup works, jump back to root (the start).
				// Then copy any matches from that backup spot so overlaps are not missed
				// (for example, matching "she" should also catch "he").
				child.failureFallbackNode = curFailure
					? (curFailure.children.get(key) ?? this.root)
					: this.root;
				child.output = child.output.concat(child.failureFallbackNode.output);
			}
		}
	}

	search(searchText: string): Match[] {
		let curNode: AhoCorasickNode | null = this.root;
		const results: Match[] = [];
		for (let i = 0; i < searchText.length; i++) {
			const char = searchText[i];
			// If this node does not have the next letter, keep backing up
			// until we find a node that does.
			while (curNode !== null && !curNode.children.get(char)) {
				curNode = curNode.failureFallbackNode;
			}
			// Move forward with this letter when possible; otherwise restart at root.
			curNode = curNode ? (curNode.children.get(char) ?? this.root) : this.root;
			// Record every term that ends at this character position.
			for (const output of curNode.output) {
				results.push({
					start: i - output.length + 1,
					end: i + 1,
					value: output,
				});
			}
		}
		return results;
	}
}

export function printAhoCorasick(tree: AhoCorasickNodeSearcher) {
	let output = "";
	let currentLevelNodes: AhoCorasickNode[] = [tree.root];

	while (currentLevelNodes.length > 0) {
		const levelCharacters: string[] = [];
		const nextLevelNodes: AhoCorasickNode[] = [];

		for (const currentNode of currentLevelNodes) {
			levelCharacters.push(...currentNode.children.keys());
			nextLevelNodes.push(...currentNode.children.values());
		}

		if (levelCharacters.length === 0) {
			break;
		}

		output += `${levelCharacters.join("")}\n`;
		currentLevelNodes = nextLevelNodes;
	}
	console.info(output);
}
