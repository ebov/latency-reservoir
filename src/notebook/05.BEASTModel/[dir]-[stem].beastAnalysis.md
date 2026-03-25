
```js
import {TypedFastBitSet} from "npm:typedfastbitset";
import {ImmutableTree,tipIterator,postOrderIterator,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels,NexusImporter} from "@figtreejs/browser"
import {mcc} from "../../components/mccTree.js"

```


## Results

```js
// todo put this in a provider so we don't have to hard code the number of chains
const run1 = FileAttachment(`/analyses/BEAST/${observable.params.dir}/1_${observable.params.stem}.log`)
                    .text()
                    .then(d => d.split('\n').filter(line => !line.startsWith('#')).join('\n'))
                    .then(d=>d3.tsvParse(d,d3.autoType))
                    .then(l => l.map(d => ({...d, replicate: 1})))
                    .then(l=>{
                        l.forEach(d=>{
                            for (const key in d) {
                                if ((/proportions\d+$/.test(key))) delete d[key];
                                if ((/latentStateIndicators\d+$/.test(key))) delete d[key];
                            }
                        })
                        return l;
                    });
const run2 = FileAttachment(`/analyses/BEAST/${observable.params.dir}/2_${observable.params.stem}.log`)
                    .text()
                    .then(d => d.split('\n').filter(line => !line.startsWith('#')).join('\n'))
                    .then(d=>d3.tsvParse(d,d3.autoType))
                    .then(l => l.map(d => ({...d, replicate: 2})))
                    .then(l=>{
                        l.forEach(d=>{
                            for (const key in d) {
                                if ((/proportions\d+$/.test(key))) delete d[key];
                                if ((/latentStateIndicators\d+$/.test(key))) delete d[key];
                            }
                        })
                        return l;
                    });

const run3 = FileAttachment(`/analyses/BEAST/${observable.params.dir}/3_${observable.params.stem}.log`)
                    .text()
                    .then(d => d.split('\n').filter(line => !line.startsWith('#')).join('\n'))
                    .then(d=>d3.tsvParse(d,d3.autoType))
                    .then(l => l.map(d => ({...d, replicate: 3})))
                    .then(l=>{
                        l.forEach(d=>{
                            for (const key in d) {
                                if ((/proportions\d+$/.test(key))) delete d[key];
                                if ((/latentStateIndicators\d+$/.test(key))) delete d[key];
                            }
                        })
                        return l;
                    });

const run4 = FileAttachment(`/analyses/BEAST/${observable.params.dir}/4_${observable.params.stem}.log`)
                    .text()
                    .then(d => d.split('\n').filter(line => !line.startsWith('#')).join('\n'))
                    .then(d=>d3.tsvParse(d,d3.autoType))
                    .then(l => l.map(d => ({...d, replicate: 4})))
                    .then(l=>{
                        l.forEach(d=>{
                            for (const key in d) {
                                if ((/proportions\d+$/.test(key))) delete d[key];
                                if ((/latentStateIndicators\d+$/.test(key))) delete d[key];
                            }
                        })
                        return l;
                    });
```

```js
const parameters = Object.keys(run1[0]);
```
```js
const burnin = view(Inputs.range([0, 100], {label: "Burnin (%)", step: 1, value: [10]}))
```

```js
const chainLength = d3.max(run1,d=>d.state)
const allLogs = run1.concat(run2).concat(run3).concat(run4).filter(d=>d.state>chainLength*burnin/100)
```
```js
const selectedTop = view(Inputs.select(parameters, {value: "joint", label: "View parameter"}));
```

 <div class="card">
    ${ Plot.plot({marginLeft:50,marks: [Plot.line(allLogs, {x: "state", y: selectedTop,strokeWidth:0.5,stroke:"replicate"})]})}
</div>

<div class="card">
    ${Plot.plot({marks: [Plot.rectY(allLogs, Plot.binX({y: "count"}, {x: selectedTop,fill:"replicate",fy:"replicate"}))]})}
</div>

# Combined chains

## Joint 

```js
const select1 = view(Inputs.select(fullParameters, {value: "joint", label: "View parameter"}));
const select2 = view(Inputs.select(fullParameters.concat("-"), {value: "-", label: "View parameter 2"}));
const select3 = view(Inputs.select(fullParameters.concat("-"), {value: "-", label: "Color by"}));
```
```js
function drawJoint(){
if (select2==='-'){
    return Plot.plot({marks: [Plot.rectY(combinedLogs, Plot.binX({y: "count"}, {x: select1}))]})
}else{
    return Plot.plot({color:{legend:true},marks:[Plot.dot(combinedLogs,{x:select1,y:select2,fill:select3!=='-'?select3:'black'})]})
}
}
```

<div class="card">
${drawJoint()}
</div>


```js
const combinedLogs = FileAttachment(`/data/providers/${observable.params.dir}-${observable.params.stem}.combinedLogs.tsv`).tsv({typed:true})
const treeFile = FileAttachment(`/data/providers/${observable.params.dir}-${observable.params.stem}.combinedTrees.nexus`).stream()
```

```js
display(combinedLogs);
```
```js
const treesImporter =  new NexusImporter(treeFile);
```

```js
function getRootPosition(tree){
    const rootNode = tree.getRoot();
    let rootPosition = new TypedFastBitSet();
    for(const node of tipIterator(tree,tree.getChild(rootNode,0))){
        if(tree.isExternal(node)){
            const taxon =  tree.getTaxon(node)
            rootPosition.add(taxon.number)
        }
    }
    return rootPosition
}
// we use this to key each node in the figure for continuity during 
// animations
function getCladeMap(tree,map=new Map()){
    const nodeMap = new Map();
    for(const node of postOrderIterator(tree)){
        let bitSet = new TypedFastBitSet();
        if(tree.isExternal(node)){
            bitSet.add(tree.getTaxon(node).number)
        }else{
            for(const child of tree.getChildren(node)){
                bitSet = bitSet.new_change(map.get(child))
            }
        }
        map.set(node,bitSet)
    }
    return map;
}
// maps clade to node.
function getCladeNodeMap(tree,map=new Map()){
    const nodeMap = new Map();
    for(const node of postOrderIterator(tree)){
        let bitSet = new TypedFastBitSet();
        if(tree.isExternal(node)){
            bitSet.add(tree.getTaxon(node).number)
        }else{
            for(const child of tree.getChildren(node)){
                bitSet = bitSet.new_change(nodeMap.get(child))
            }
        }
        nodeMap.set(node,bitSet)
        map.set(""+bitSet,node)
    }
    return map;
}


```

```js 
const rootPartitions = new Map();
let treeCount=0;
const wholeSet = new TypedFastBitSet()
wholeSet.addRange(0,18)
const roots = []
const cladeMap = new Map();
let i=0

	
const cladesOfInterest = [
    {name:"DRC-1970s",tips:["KC242791|Bonduni|DRC|1977-06","KR063671|Yambuku-Mayinga|DRC|1976-10-01"]},
    {name:"DRC-2007/8",tips:["HQ613402|034-KS|DRC|2008-12-31","HQ613403|M-M|DRC|2007-08-31"]},
    {name:"Gabon-1990s",tips:["KC242792|Gabon|Gabon|1994-12-27","KC242793|1Eko|Gabon|1996-02","KC242798|1Ikot|Gabon|1996-10-27"]},
    {name:"NordDRC",tips:["'MH613311|Muembe.1|DRC|2017-05'","MK007330|18FHV090-Beni|DRC|2018-07-28"]},
    {name:"eastDRC",tips:["KP271018|Lomela-Lokolia16|DRC|2014-08-20","MH733477|BIK009-Bikoro|DRC|2018-05-10","OR084846|MBK67|DRC|2020-06-12","OR084849|Mandaka|DRC|2020-05-31","|22MBK-004|DRC|2022-04-25"]},
    {name:"COG/Gabon-2000s",tips:["KC242800|Ilembe|Gabon|2002-02-23","KF113529|Kelle_2|COG|2003-10"]}
    ]


for await (const plainTree of treesImporter.getTrees()) {
    const tree= plainTree.orderNodesByDensity(true)
    const rootP = getRootPosition(tree);
    let newRoot = true;

    const parameters = combinedLogs[treeCount]

   // add time latent for each external branch

    for(const tip of tree.getExternalNodes()){
        parameters[tree.getTaxon(tip).name+"_LS"] = tree.getAnnotation(tip,'LS')
    }

    const bitSets = getCladeNodeMap(tree);
    for(const clade of cladesOfInterest){
        const bits = new  TypedFastBitSet();
        for(const tip of clade.tips){
            if(tree.getTaxon(tip)===undefined){
                console.warn(tip+ "not found in tree")
            }
                bits.add(tree.getTaxon(tip).number)      
        }
        const node =  bitSets.get(""+bits);
        if(node){
            parameters[clade.name+"_LS"] = tree.getAnnotation(node,'LS');
        }
    }
   //cylce over seen roots and add this observation if we've seen the root before
   for(const rootPosition of roots){
        const bitSet = rootPosition.bitSet
        
        if(bitSet.equals(rootP) || bitSet.new_change(rootP).equals(wholeSet)){ // either clade
            rootPosition.trees.push(tree)
            rootPosition.indices.push(treeCount)
            rootPosition.parameters.push(parameters)
            newRoot =false;
            break;
        }
   }
   if(newRoot){
    const rootPosition={
        bitSet:rootP,
        indices:[i],
        trees:[tree],
        parameters:[parameters]
    }
    roots.push(rootPosition)
   }
   // add node clades to cladeMap so we can keep animations linked below
   getCladeMap(tree,cladeMap)
    treeCount++;
}

```

```js
const sorted = roots.sort((a, b) => b.indices.length - a.indices.length).filter(d=>d.indices.length/treeCount>0.05).map(d=>({...d,mcc:mcc(d.trees)}));
const fullParameters = Object.keys(sorted[0].parameters[0]).filter(d=>!/proportions\d+/.test(d) && !/latentStateIndicators\d+/.test(d) && !/frequencies\d+/.test(d));
```


```js
const selected = view(Inputs.select(fullParameters, {value: "joint", label: "View parameter"}));
const padding= 50;

```
```html
<div class="grid grid-cols-2">
    ${sorted.reduce((acc,root,i)=>{

        return acc.concat(html`
        <div class="card">
            <h2> Root position ${i} : ${d3.format("0.1%")(root.indices.length/treeCount)}
            ${drawFigure(i,width)}

        </div>`).concat(html`
        <div class="card">
                ${Plot.plot({x:{domain:d3.extent(combinedLogs,d=>d[selected])},height:width/1.7,marks: [Plot.rectY(combinedLogs.concat(combinedLogs.filter((d,i)=>root.indices.includes(i)).map(d=>({...d,thisRoot:true}))),Plot.sort({channel: "y2", order: "descending"}, Plot.binX({y2: "proportion"}, {x: selected, fill: (d,i)=>d.thisRoot?d.thisRoot:false} )))]})}
        </div>
        `)
        },[]
    )}
   
</div>
```

```js 
const drawFigure = (i,width) => {
const svgString = `<svg width="${width}" height="${width/3}">
 ${figtree(figureOptions(sorted[i].mcc))}
</svg>`;
  const div = document.createElement("div"); 
  div.innerHTML = svgString.trim(); // Ensure no extra whitespace
  return div.firstChild; // Extracts the actual <svg> element
};

```

```js
const figureOptions=(tree,ops=2) => {
    return {
//   svg: document.getElementById(id),
  tree: tree,
//   animated: true,
  layout: rectangularLayout,
  width: width/(1*ops),
  height: width/(1.5*ops),
  margins: { top: 20, left: 12, right: 200, bottom: 10 },
  baubles: [
    Branches({
      attrs: { stroke: n=>d3.interpolateViridis(d3.format("0.2")(tree.getAnnotation(n,"LS_distribution").filter(d=>d>0).length/(tree.getAnnotation(n,"LS_distribution").length))), strokeWidth: 2 },
      keyBy:(n)=>""+cladeMap.get(n)
    }),
    CircleNodes({
      filter: (n) =>
        tree.isExternal(n),
    }),
    NodeLabels({
      filter: (n) => tree.isExternal(n),
      attrs: {
        fill: "black",
        fontSize: 8,
        fontWeight: 300,
        fontFamily: "HelveticaNeue-Light"
      },
      text: (n) => tree.getTaxonFromNode(n).name,
    keyBy:(n)=>""+cladeMap.get(n)
    }),
    BranchLabels({
         filter: (n) => tree.getAnnotation(n,"LS_distribution").filter(d=>d>0).length/(tree.getAnnotation(n,"LS_distribution").length)>0.5,
            attrs: {
            fill: "black",
            fontSize: 16,
            fontWeight: 300,
            fontFamily: "HelveticaNeue-Light"
      },
      text: (n) =>   `${d3.format("0.2")(tree.getAnnotation(n,"LS_distribution").filter(d=>d>0).length/(tree.getAnnotation(n,"LS_distribution").length))}:${d3.format("0.2")(d3.mean(tree.getAnnotation(n,"LS_distribution").filter(d=>d>0)))}`,
      keyBy:(n)=>""+cladeMap.get(n)
    })
  ],
  opts: {}
}
}
```

Run overview :

```js
const xml= FileAttachment(`/data/providers/${observable.params.dir}-${observable.params.stem}.xmlSummary.json`).json()
```
```js
display(xml)
```