import { mean, median } from "d3-array";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import fs from "fs";
import { decimalToDate } from "./dateGuesser.js";
import { rateFormat } from "./tableUtils.js";
import { getRootPosition } from "./BEASTUtils.js";
import { mcc } from "./mccTree.js";
import { TypedFastBitSet } from "./TypedFastBitSet.js";

export function writeSummary(summary, path) {
  const lines = [];
  for (const key in summary) {
    const value = summary[key];
    if (typeof value === "object" && value !== null) {
      for (const subKey in value) {
        if (Array.isArray(value[subKey]) && value[subKey].length === 2) {
          lines.push(`${key}_${subKey}_min,${value[subKey][0]}`);
          lines.push(`${key}_${subKey}_max,${value[subKey][1]}`);
        } else {
          lines.push(`${key}_${subKey},${value[subKey]}`);
        }
      }
    } else {
      lines.push(`${key},${value}`);
    }
  }
  fs.writeFileSync(path, lines.join("\n"), "utf8");
}export function getSummary(log, rootObject = null) {
    let nordKAge = null;
    if (rootObject !== null) {
        log = log.filter((d, i) => rootObject.indices.includes(i));
        // const tree = Tree.fromNewick(rootObject.mcc)
        // let nkp = tree.getParent(tree.getNode("MK007330|18FHV090-Beni|DRC|2018-07-28"));
        // // if we've inserted nodes here for latency vis then keep going until we hit the og parent
        // while (tree.hasAnnotation(nkp, 'inserted')) {
        //     nkp = tree.getParent(nkp);
        // }
        // const origin = max(tree.getExternalNodes().map(n => dateGuesser(tree.getTaxon(n).name)))
        // const nordKivuDates = tree.getAnnotation(nkp, "heights").map(h => origin - h);
        //     nordKAge = {
        //         hpd: hpd(nordKivuDates).map(d=>timeFormat("%Y")(decimalToDate(d))),
        //         mean: timeFormat("%Y")(decimalToDate(mean(nordKivuDates))),
        //         median: timeFormat("%Y")(decimalToDate(median(nordKivuDates)))
        //     }
    }


    const summary = {
        rootAge: {
            hpd: hpd(log.map(d => d[`age(root)`])).map(d => timeFormat("%Y")(decimalToDate(d))),
            mean: timeFormat("%Y")(decimalToDate(mean(log.map(d => d[`age(root)`])))),
            median: timeFormat("%Y")(decimalToDate(median(log.map(d => d[`age(root)`]))))
        },
        clockRate: {
            hpd: hpd(log.map(d => d[`clock.rate`])).map(d => rateFormat(d)),
            mean: rateFormat(mean(log.map(d => d[`clock.rate`]))),
            median: rateFormat(median(log.map(d => d[`clock.rate`])))
        },
        latentBranches: {
            hpd: hpd(log.map(d => d[`nonZeroIndicators`])),
            mean: format("0.2")(mean(log.map(d => d[`nonZeroIndicators`]))),
            median: median(log.map(d => d[`nonZeroIndicators`]))
        },
        latentStateRate: {
            hpd: hpd(log.map(d => d[`latentStateRate`])).map(d => format("0.2f")(d)),
            mean: format("0.2f")(mean(log.map(d => d[`latentStateRate`]))),
            median: format("0.2f")(median(log.map(d => d[`latentStateRate`])))
        },
        latentStateBias: {
            hpd: hpd(log.map(d => d[`latentStateBias`])).map(d => format("0.3f")(d)),
            mean: format("0.2f")(mean(log.map(d => d[`latentStateBias`]))),
            median: format("0.2f")(median(log.map(d => d[`latentStateBias`])))
        }
    };

    if (nordKAge) {
        summary.nordKAge = nordKAge;
    }
    return summary;

}
export function normalizeDensity(density) {
    if(density.length==1){return density} // in testing we may only get one value in the log
    const dx = density[1][0] - density[0][0];
    const area = density.reduce((sum, [x, y]) => sum + y * dx, 0);
    return density.map(([x, y]) => [x, y / area]);
}
//https://observablehq.com/@d3/kernel-density-estimation
export function kde(kernel, thresholds, data) {
    return thresholds.map(t => [t, mean(data, d => kernel(t - d))]);
}
export function epanechnikov(bandwidth) {
    return x => Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
}


export function hpd(data, alpha = 0.05) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data must be a non-empty array.");
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const intervalSize = Math.floor((1 - alpha) * n);
    let minWidth = Infinity;
    let hpdMin = null;
    let hpdMax = null;

    for (let i = 0; i <= n - intervalSize; i++) {
        const width = sorted[i + intervalSize - 1] - sorted[i];
        if (width < minWidth) {
            minWidth = width;
            hpdMin = sorted[i];
            hpdMax = sorted[i + intervalSize - 1];
        }
    }

    return [hpdMin, hpdMax];
}
export async function rootAnalysis(treesImporter) {
    let treeCount = 0;

    const roots = [];
    // let i = 0
    for await (const plainTree of treesImporter.getTrees()) {
        if (treeCount % 1000 === 0) {
            process.stdout.write(`${treeCount} trees processed\r`);
            // gets counted below
        }

        const wholeSet = new TypedFastBitSet();
        // get the whole set so can cluster roots regardless of which clade is first
        for(const tip of plainTree.getExternalNodes()){
            const taxon =  plainTree.getTaxon(tip)
            wholeSet.add(taxon.number) 
        }
        
    // console.log(wholeSet.toString())

        const tree = plainTree.orderNodesByDensity(true);
        const rootP = getRootPosition(tree);
        let newRoot = true;

        // const parameters = combinedLogs[treeCount]
        // add time latent for each external branch
        // for(const tip of tree.getExternalNodes()){
        //     parameters[tree.getTaxon(tip).name+"_LS"] = tree.getAnnotation(tip,'LS')
        // }
        //cylce over seen roots and add this observation if we've seen the root before
        for (const rootPosition of roots) {
            const bitSet = rootPosition.bitSet;
            if (bitSet.equals(rootP) || bitSet.new_change(rootP).equals(wholeSet)) { // either clade
                rootPosition.trees.push(tree);
                rootPosition.indices.push(treeCount);
                // rootPosition.parameters.push(parameters)
                newRoot = false;
                break;
            }
        }
        if (newRoot) {
            const rootPosition = {
                bitSet: rootP,
                indices: [treeCount],
                trees: [tree],
                // parameters:[parameters]
            };
            roots.push(rootPosition);
        }
        // add node clades to cladeMap so we can keep animations linked below
        treeCount++;
        // i++;
    }

    const sorted = roots.sort((a, b) => b.indices.length - a.indices.length)
        .map(d => {
            const mccTree = mcc(d.trees).orderNodesByDensity(false);
            return { bitSet:d.bitSet,indices:d.indices, mcc: mccTree.toNewick(mccTree.getRoot(), { blFormat: format("0.5"), includeAnnotations: true }), posterior: d.indices.length / treeCount }; // don't keep the trees in the json
        });
    return sorted;
}

