<style>p { max-width: none;
font-family: 'Helvetica', 'Arial', sans-serif;}

body{
    font-family: 'Helvetica', 'Arial', sans-serif;
}
</style>
```js
import {require} from "npm:d3-require";
const ML = await require("https://www.lactame.com/lib/ml/6.0.0/ml.min.js")

import {dateGuesser} from "../../scripts/utils/dateGuesser.js"
import {processTree} from "../../scripts/utils/processTree.js"
import {clusterScale} from "../../scripts/utils/colors.js"
import {ImmutableTree as Tree,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels} from "@figtreejs/browser"
```
```js
//functions
function getClade(tree, node) {
  if (tree.isExternal(node)) {
    return [tree.getTaxon(node)];
  }
  //little hacky but mrca only takes two nodes for now.
  let leftMost = node;
  while (!tree.isExternal(leftMost)) {
    leftMost = tree.getChild(leftMost, 0);
  }
  // get right most desendent
  let rightMost = node;
  while (!tree.isExternal(rightMost)) {
    const count = tree.getChildCount(rightMost);
    rightMost = tree.getChild(rightMost, count - 1);
  }

  return [leftMost, rightMost].map((d) => tree.getTaxon(d));
}

function rootTree(tree, outgroup) {
  if (outgroup.length === 0) {
    return tree;
  }
  if (outgroup.length === 1) {
    return tree
      .reroot(tree.getNodeByTaxon(outgroup[0]), 0.5)
      .orderNodesByDensity(true);
  }
  const mrca = tree.getMRCA(...outgroup.map((d) => tree.getNode(d)));

  tree = tree.reroot(mrca, 0.5).orderNodesByDensity(true);

  const selectedTips = tree
    .getExternalNodes()
    .filter((n) => selected.includes(tree.getTaxon(n).name));
  for (const tip of selectedTips) {
    tree = tree.annotateNode(tip, { select: "yes" });
    for (const parent of tree.getPathToRoot(tip)) {
      tree = tree.annotateNode(parent, { selected: "yes" });
    }
  }
  return tree;
}

function getRttData(tree) {
  return tree.getExternalNodes().map((n) => ({
    div: tree.getDivergence(n),
    date: dateGuesser(tree.getTaxon(n).name),
    taxon: tree.getTaxon(n).name,
    cluster: tree.getAnnotation(n, "cluster",null)
  }));
}

```

```js
function makeRTTPlot(tree, title, addRate = false) {
  const data = getRttData(tree);

  const slopes = d3
    .rollups(
      data,
        (d) => ({
        slope: new ML.SimpleLinearRegression(
          d.map((d) => d.date),
          d.map((d) => d.div)
        ).slope,
        x: d3.mean(d, (d) => d.date),
        y: d3.mean(d, (d) => d.div),
        tips:d
      }),
      (g) => g.cluster
    )
    .filter((d) => d[1].tips.length > 1)
    .map((d) => d[1]);

  const selectedData = data.filter((d) => selected.includes(d.taxon));
  const fullModel = new ML.SimpleLinearRegression(
    selectedData.map((d) => d.date),
    selectedData.map((d) => d.div)
  );

  const fullModel_cor = fullModel.score(
    selectedData.map((d) => d.date),
    selectedData.map((d) => d.div)
  );

  if (addRate)
    title = `${title} : rate: ${d3.format("0.2e")(
      fullModel.slope
    )}, 𝘙 ² :${fullModel_cor.r2.toFixed(2)}`;
  return Plot.plot({
    title: title,
    width: width,
    marks: [
      Plot.linearRegressionY(data, {
        filter: (d) => selected.includes(d.taxon),
        x: "date",
        y: "div",
        stroke: "lightgrey"
      }),
      Plot.linearRegressionY(
        data.filter((n) => n.cluster),
        {
          x: "date",
          y: "div",
          stroke: (d) => clusterScale(d.cluster)
        }
      ),
      Plot.dot(data, {
        filter: (d) => selected.includes(d.taxon),
        x: "date",
        y: "div",
        fill: "lightgrey",
        r: 6,
        tip: true
      }),
      Plot.dot(data, {
        x: "date",
        y: "div",
        fill: (d) => clusterScale(d.cluster),
        r: 4,
        tip: true
      }),
      Plot.text(slopes, {
        x: "x",
        y: "y",
        text: (d) => d3.format("0.2e")(d.slope),
        dy: -10
      })
    ]
  });
}
```


## Clades first

Ebola has caused sporadic, geographically and temporally clustered outbreaks since it was first described in the 1970s. 
The main 'signal' in assigning the 1970s outbreaks as an outgroup comes from the long between outbreak branches which must span years no matter the rooting or rate. 
We have seen in previous analyses that the dataset often used to support this model (outbreaks from 1970-2014) does not.

However, there may still be temporal signal in another subset of the tree, and if ebola has been evolving clock-like
 over 50 years then we should see evidence for that evolution within each outbreak clade, many of which span at least a few years.

Below we have a tree built from 18 genomes, colored by geographic/temporal cluster.
Each clade does have a positive correlation between divergence and date of sample. 
They also have similar slopes - provided the tree is not rooted in the middle of one of the clades. 
(The 2017/18  clade is an outlier here with a rapid slope).

Perhaps this is the cause of the greater discrepancy between the _srdt_ and _sr_ models when 
these dynamics are included.

<div class="warning" label="⚠️ Warning ⚠️">
Some of these clades are only two tips large so take their correlations with the grain of salt. 

</div>

```js
Inputs.button(
  [
    [
      "Select 8",
      () => {
        setSelected( [
          "KC242791|Bonduni|DRC|1977-06",
          "KR063671|Yambuku-Mayinga|DRC|1976-10-01",
          "KC242800|Ilembe|Gabon|2002-02-23",
          "KC242798|1Ikot|Gabon|1996-10-27",
          "KC242792|Gabon|Gabon|1994-12-27",
          "KC242793|1Eko|Gabon|1996-02",
          "KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
          "KF113529|Kelle_2|COG|2003-10"
        ]);
      }
    ],
    [
      "Select 11",
      () => {
         setSelected( [
          "KC242791|Bonduni|DRC|1977-06",
          "KR063671|Yambuku-Mayinga|DRC|1976-10-01",
          "KC242800|Ilembe|Gabon|2002-02-23",
          "KC242798|1Ikot|Gabon|1996-10-27",
          "KC242792|Gabon|Gabon|1994-12-27",
          "KC242793|1Eko|Gabon|1996-02",
          "KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
          "KF113529|Kelle_2|COG|2003-10",
          "HQ613402|034-KS|DRC|2008-12-31",
          "HQ613403|M-M|DRC|2007-08-31",
          "KU182905|Kikwit-9510621|DRC|1995-05-04"
        ]);
      }
    ],
    [
      "Root 8",
      () => {
        setOutgroup( [
          "KF113529|Kelle_2|COG|2003-10",
          "HQ613402|034-KS|DRC|2008-12-31"
        ]);
      }
    ],
    [
      "Root 1970s",
      () => {
       setOutgroup( [
          "KR063671|Yambuku-Mayinga|DRC|1976-10-01",
          "KC242791|Bonduni|DRC|1977-06"
        ]);
      }
    ]
  ],
  { value: null }
)
```
```html
<svg id='rooted-fig' width=${width} height=${width / 2}>
```
*you can click on tips in the figure above to add them to a between clade regression. Clicking on a branch will reroot the tree. You can click the buttons to reset.*
<div class="warning">
Clicking is broken for now.
</div>


```js
const partition = view(Inputs.radio(["Full", "cds1", "cds2", "cds3+ig"], {
  label: "Select partition",
  value: "Full"
}))
```

```js
makeRTTPlot(...fullPlotData, true)
```

```html
    <div class="container" style="display: flex" >
      <div >
            ${makeRTTPlot(rootedFull,"Full genome")}
        </div>
       
        <div >
            ${makeRTTPlot(rooted1," 1st pos")}
        </div>
          <div >
            ${makeRTTPlot(rooted2," 2nd pos")}
        </div>
       <div >
            ${makeRTTPlot(rooted3_ig," 3rd pos and ig")}
        </div>
    </div>
```

These analysis suggest the evolutionary rate within ebola clusters is much lower than that estimated by the between clade regression when the root is placed near the 1970s.

*It appears like the second coding position is evolving faster than other positions. This is mostly due to the scale changing between plots.*
## Another observation

Interestingly there is a rooting which gives a similar slope to the within-clade rate for a subset of the clades. 
In this rooting the 1995 and the 2007/8 outbreaks are less diverged than expected, but the within clade rate for the 2007/8 cluster is similar to the global rate.

This is also the rooting discovered discovered by the residual mean squared rooting on the set of 11 genomes.
Perhaps this rooting failed to be supported because of the inclusion of these outliers - perhaps latency was
already in the dataset before the mid 2010s.

But is this hypothesis supported by the data? Next we will look at a root-to-tip permutations on this subset of the data.





<!-- state management -->
```js
const selected = Mutable([])
const updateSelected = (taxon) =>{
  if (selected.includes(taxon)) {
             selected.value = selected.value.filter((name) => name !== taxon);
          } else {
            selected.value = [...selected.value, taxon];
          }
        } 
const setSelected = (a) => selected.value=a;
```


```js
const outgroup = Mutable([]);
const setOutgroup = (a)=>outgroup.value=a;
```

```js
const fullPlotData = partition === "Full"
  ? [rootedFull, "Full genome"]
  : partition === "cds1"
  ? [rooted1, "1st position"]
  : partition === "cds2"
  ? [rooted2, "2nd position"]
  : partition === "cds3+ig"
  ? [rooted3_ig, "3rd position + ig"]
  : null
```


 <!-- tree figure--> 

```js
const rootedFigOptions = {
  svg: document.getElementById("rooted-fig"),
  tree: rootedFull,
  animated: true,
  layout: rectangularLayout,
  width: width,
  height: width / 2,
  margins: { top: 10, left: 12, right: 200, bottom: 10 },
  baubles: [
    Branches({
      filter: (n) => rootedFull.getAnnotation(n, "selected","no") === "yes",
      attrs: { stroke: "lightgrey", strokeWidth: 8 },
      interactions: {
        onClick: (n) => {
          setOutgroup(getClade(rootedFull, n));
        }
      }
    }),
    Branches({
      attrs: { stroke: "black", strokeWidth: 2, cursor: "pointer" },
      interactions: {
        onClick: (n) => {
           setOutgroup(getClade(rootedFull, n));
        }
      }
    }),
    CircleNodes({
      filter: (n) =>
        rootedFull.isExternal(n) && selected.includes(rootedFull.getTaxon(n).name),
      attrs: {
        r: 9,
        fill: "lightgrey"
      }
    }),
    CircleNodes({
      filter: (n) => rootedFull.isExternal(n),
      attrs: {
        r: 6,
        cursor: "pointer",
        fill: (n) => clusterScale(rootedFull.getAnnotation(n, "cluster",null))
      },
      interactions: {
        onClick: (n) => {
          const taxon = rootedFull.getTaxon(n).name;
          updateSelected(taxon)
      }}
    }),
    NodeLabels({
      filter: (n) => rootedFull.isExternal(n),
      attrs: {
        fill: "black",
        fontSize: 16,
        fontWeight: 300,
        fontFamily: "HelveticaNeue-Light"
      },
      text: (n) => rootedFull.getTaxon(n).name
    })
  ],
  opts: {}
}
```

```js
figtree(rootedFigOptions);
```


<!-- DATA  -->

```js
const tipData = FileAttachment("/data/processed/latLong.tsv").tsv({ typed: true });
```



```js 
const set19Cds_ig = processTree(
  Tree.fromNewick(await FileAttachment("/results/iqtree/set19_best.treefile")
                                .text()
                                .then(text => text.replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06") // re-rename taxa. uncertainty in date fixed for paml
                                .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                                .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                                .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")
                        )) ,
                        tipData)


const set19Cds3_ig1 = processTree(
  Tree.fromNewick(await FileAttachment("/results/iqtree/set19_cds3_ig.treefile")
                                .text()
                                .then(text => text.replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06") // re-rename taxa. uncertainty in date fixed for paml
                                .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                                .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                                .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")
                        )) ,
                        tipData)


const set19Cds1 = processTree(
  Tree.fromNewick(await FileAttachment("/results/iqtree/set19_cds1.treefile")
                                  .text()
                                .then(text => text.replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06") // re-rename taxa. uncertainty in date fixed for paml
                                .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                                .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                                .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")
                        )) ,
                        tipData)

const set19Cds2 = processTree(
  Tree.fromNewick(await FileAttachment("/results/iqtree/set19_cds2.treefile")
                                    .text()
                                .then(text => text.replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06") // re-rename taxa. uncertainty in date fixed for paml
                                .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                                .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                                .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")
                        )) ,
                        tipData)
```


```js
const rootedFull = rootTree(set19Cds_ig, outgroup)
const rooted3_ig = rootTree(set19Cds3_ig1, outgroup)
const rooted1 = rootTree(set19Cds1, outgroup)
const rooted2 = rootTree(set19Cds2, outgroup)
```





