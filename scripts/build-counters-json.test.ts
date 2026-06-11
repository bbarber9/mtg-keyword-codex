import { describe, expect, it } from "vitest";
import { extractCounterDetails } from "./build-counters-json";

describe("extractCounterDetails", () => {
	it("maps the wiki Typical use infobox field to use", () => {
		const counterDetails = extractCounterDetails(
			`
				<html>
					<body>
						<div id="mw-content-text">
							<p>A lore counter is a marker used on Saga cards.</p>
							<table class="infobox">
								<tr>
									<th>Typical use</th>
									<td>Tracks chapter abilities on Saga enchantments.</td>
								</tr>
								<tr>
									<th>Placed on</th>
									<td>Permanents</td>
								</tr>
							</table>
							<h2><span id="Description">Description</span></h2>
							<p>Lore counters are added as Sagas progress.</p>
						</div>
					</body>
				</html>
			`,
			"https://mtg.wiki/page/Lore_counter",
		);

		expect(counterDetails).toEqual({
			intro: "A lore counter is a marker used on Saga cards.",
			description: "Lore counters are added as Sagas progress.",
			use: "Tracks chapter abilities on Saga enchantments.",
			placedOn: "Permanents",
			sourceUrl: "https://mtg.wiki/page/Lore_counter",
		});
	});

	it("falls back to reminder text when wiki pages omit use fields", () => {
		const counterDetails = extractCounterDetails(
			`
				<html>
					<body>
						<div id="mw-content-text">
							<p>A shield counter protects a permanent.</p>
							<table class="infobox">
								<tr>
									<th>Reminder Text</th>
									<td>(If it would be dealt damage or destroyed, remove a shield counter instead.)</td>
								</tr>
								<tr>
									<th>Placed on</th>
									<td>Permanents</td>
								</tr>
							</table>
							<h2><span id="Description">Description</span></h2>
							<p>Shield counters create prevention and replacement effects.</p>
						</div>
					</body>
				</html>
			`,
			"https://mtg.wiki/page/Shield_counter",
		);

		expect(counterDetails.use).toBe(
			"(If it would be dealt damage or destroyed, remove a shield counter instead.)",
		);
	});
});
