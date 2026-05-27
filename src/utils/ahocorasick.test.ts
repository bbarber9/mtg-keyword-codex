import { describe, expect, it } from "vitest";
import { AhoCorasickNodeSearcher, printAhoCorasick } from "./ahocorasick";

describe("ahocorasick", () => {
    it("testing printing function", () => {
        const ahocorasick = new AhoCorasickNodeSearcher();
        ahocorasick.addSearchTerm("testing");
        ahocorasick.addSearchTerm("tabular");
        ahocorasick.addSearchTerm("tubular");
        printAhoCorasick(ahocorasick);
        expect(true).toBe(true);
    });

    it("finds search strings in a given text", () => {
        const ahocorasick = new AhoCorasickNodeSearcher();
        ahocorasick.addSearchTerm("testing");
        ahocorasick.addSearchTerm("tabular");
        ahocorasick.addSearchTerm("tubular");
        ahocorasick.buildFailureLinks();
        const matches = ahocorasick.search("this is a testing string with tabular and tubular data");
        expect(matches).toEqual([
            { start: 10, end: 17, value: "testing" },
            { start: 30, end: 37, value: "tabular" },
            { start: 42, end: 49, value: "tubular" },
        ]);
    })
});
