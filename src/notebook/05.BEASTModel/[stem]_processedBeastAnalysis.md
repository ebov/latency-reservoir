
```js
import {TypedFastBitSet} from "npm:typedfastbitset";
import {ImmutableTree as Tree,tipIterator,postOrderIterator,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels,NexusImporter,figtreeStatic} from "@figtreejs/browser"
import {mean,max} from "d3-array"

// import {mcc} from "../../scripts/utils/mccTree.js"
```
```js
import { clusterScale } from "/scripts/utils/colors.js";
import { dateGuesser, decimalToDate } from "/scripts/utils/dateGuesser.js";
```
```js
const tipData = FileAttachment("/data/processed/latLong.tsv").tsv({typed:true});

```

# Combined chains

## Joint 

```js
const select1 = view(Inputs.select(fullParameters.concat("kivu root"), {value: "joint", label: "View parameter"}));
const select2 = view(Inputs.select(fullParameters.concat("-"), {value: "-", label: "View parameter 2"}));
const select3 = view(Inputs.select(fullParameters.concat("-"), {value: "-", label: "Color by"}));
```
```js
function drawJoint(){
if (select2==='-'){
    return Plot.plot({marks: [Plot.rectY(combinedLogs, Plot.binX({y: "count"}, {x: select1}))]})
}else{
    return Plot.plot({color:{legend:true},marks:[Plot.dot(combinedLogs,{x:select1,y:select2,fill:select3!=='-'?select3:'black',r:1})]})
}
}
```

```js
function drawTrace(){
    if (select2==='-'){
        return Plot.plot({ x:{tickFormat:d3.format(".0e")},marks: [Plot.lineY(combinedLogs, {y: select1,x:"state",strokeWidth:0.5})]})
    }else{
        return "Select a single parameter to view a trace"
    }
}
```

```js
function drawLineages(){
    return Plot.plot({
        marks:[
            Plot.areaY(lineages,{x:"time",y1:d=>d.lineages.hpd[0],y2:d=>d.lineages.hpd[1],fill:"grey",opacity:0.3}),
             Plot.areaY(lineages,{x:"time",y1:d=>d.latent.hpd[0],y2:d=>d.latent.hpd[1],fill:"#071455",opacity:0.3}),
            Plot.lineY(lineages,{x:"time",y:d=>d.lineages.median}),
            Plot.lineY(lineages,{x:"time",y:d=>d.latent.median,stroke:"#071455"})
        ]
    })
}
```

<div class="card">
${drawJoint()}
</div>

<div class="card">
${drawTrace()}
</div>




```js 
const combinedLogs =  FileAttachment(`/data/providers/${observable.params.stem}.combinedLog.tsv`)
                    .tsv({typed:true})
                
```
```js
// display(combinedLogs)
```
```js 
const processedData = FileAttachment(`/data/providers/${observable.params.stem}.processedRun.json`).json()
```

```js
const lineages = FileAttachment(`/data/providers/${observable.params.stem}.ltt.json`).json()
```


```js
const treeCount = processedData.reduce((acc,d)=>acc+d.indices.length,0);
const sorted = processedData.filter(d=>d.indices.length/treeCount>0.05).map(d=>({...d, mcc:Tree.fromNewick(d.mcc,{parseAnnotations:true,dateFormat:"%Y-%m-%d",datePrefix:"|"}).orderNodesByDensity(true)}));
const fullParameters = Object.keys(combinedLogs[0]).filter(d=>!/proportions\d+/.test(d) && !/latentStateIndicators\d+/.test(d) && !/frequencies\d+/.test(d));
```
```js
display(sorted)
```

```js
// const selected = view(Inputs.select(fullParameters, {value: "joint", label: "View parameter"}));
const padding= 50;

```

```js
function drawRootFigure(i,root){
    if (select2==='-'){


    if(select1==='kivu root'){
        const tre = root.mcc
        const node = tre.getParent(tre.getNode("MH613311|Muembe.1|DRC|2017-05"))
        const h = tre.getAnnotation(node,"heights")
        return Plot.plot(
            {x:{domain:d3.extent(h)},
                marks: [Plot.rectY(h,Plot.sort({channel: "y2", order: "descending"}, Plot.binX({y2: "proportion"} )))]})

    }


        return Plot.plot(
            {x:{domain:d3.extent(combinedLogs,d=>d[select1])},
                marks: [Plot.rectY(combinedLogs.concat(combinedLogs.filter((d,i)=>root.indices.includes(i)).map(d=>({...d,thisRoot:true}))),Plot.sort({channel: "y2", order: "descending"}, Plot.binX({y2: "proportion"}, {x: select1, fill: (d,i)=>d.thisRoot?d.thisRoot:false} )))]})
    }else{



    function filler(d){
        if(select3==='-'){
            return d.thisRoot
        }else{
            return d[select3] ;
        }
    }

       
        return Plot.plot(
            {color:{legend:true},
            marks:[Plot.dot(combinedLogs
                                .filter((d,i)=>!root.indices.includes(i))
                                .map(d=>({...d,thisRoot:false}))
                                .concat(combinedLogs.filter((d,i)=>root.indices.includes(i)).map(d=>({...d,thisRoot:true}))),
                    {x:select1,
                    y:select2,
                    fill:filler,
                    r:2,stroke:d=>d.thisRoot?'black':null,
                    strokeWidth:0.1})]})
        
    }
}
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
                ${drawRootFigure(i,root)}
        </div>
        `)
        },[]
    )}
   
</div>
```


<div class="card">
<h2>Lineages through time</h2>
${drawLineages()}
</div>

 
```js 
const drawFigure = (i,width) => {

    let svgString =`<svg width="${width}" height="${width/4}">
    ${figtreeStatic(figureOptions(processTree(sorted[i].mcc)))}
    </svg>`
   
    const div = document.createElement("div"); 
    div.innerHTML = svgString.trim(); // Ensure no extra whitespace
    return div.firstChild; // Extracts the actual <svg> element
    

};

```


```js
function processTree(tree){
    let mccTree = tree;
    for (const d of tipData) {
          try {
              const tip = mccTree.getNode(d.taxa);
              mccTree = mccTree.annotateNode(tip, d); // some analyses exclude makona
          } catch (error) {
              console.log(`Taxa not found: ${d.taxa}`);
          }
      }
  
  
      // annotate cluster mrca - assumes rooting does not break a cluster!
      // for each cluster get the mrca then annotate all nodes above mrca as cluster.
      for (const cluster of mccTree.getAnnotationSummary("cluster").domain) {
          const tips = mccTree.getNodes().filter(n => mccTree.hasAnnotation(n,"cluster") && mccTree.getAnnotation(n, "cluster") === cluster)
          if (tips.length > 1) {
              const mrca = mccTree.getMRCA(tips);
              mccTree = mccTree.annotateNode(mrca, { cluster })
              for (const node of postOrderIterator(mccTree, mrca)) {
                  mccTree = mccTree.annotateNode(node, { cluster })
              }
          }
      }

      const getLatentSupport = node =>  mccTree.getAnnotation(node, "latent_indicator_distribution").filter(d => d > 0).length / mccTree.getAnnotation(node, "latent_indicator_distribution").length;

      const getConditionalLatentProp = node => {
        const indicators = mccTree.getAnnotation(node, "latent_indicator_distribution");
        const proportions = mccTree.getAnnotation(node, "latent_prop_distribution");
        if(proportions.length!==indicators.length){
            throw Error("Proportions length does not equal length of indicator")
        }
        return proportions.map((d,i)=>d*indicators[i]).filter(d=>d>0)
      }
        const cutOff = 0.5
        // cut latent branches
        for (const node of mccTree.getNodes()) {
            if (mccTree.isRoot(node)) {
                continue;
            }
            const ls = getLatentSupport(node);
            if (ls > cutOff) {
                //second cut needs to account for the changes length
                // const first = ls/2;
                //second target is ls+ls/2
                // const second = 3/2
                const lp = mean(getConditionalLatentProp(node)); 
                // this includes cases where is no latency!!!!
    
                const cuts = [(1 - lp) / 2, (1 + lp) / 2];
                for (const cut of cuts) {
                    mccTree = mccTree.insertNode(node, cut);
                }
                // annotate new nodes
                const insert1 = mccTree.getParent(node);
                const hasCluster = mccTree.hasAnnotation(node, "cluster")
                mccTree = mccTree.annotateNode(insert1,
                    {
                        inserted: true,
                        latent: true,
                        rate: mccTree.getAnnotation(node, "rate"),
                        conditionalMean: lp, //mccTree.getAnnotation(node, "LS_distribution"),
                        latent_support:ls
                    });
    
                const insert2 = mccTree.getParent(insert1);
                mccTree = mccTree.annotateNode(insert2, { inserted: true, latent: false });
    
                if (hasCluster ) {
                    const cluster = mccTree.getAnnotation(node, "cluster")
                    mccTree = mccTree.annotateNode(insert1, { cluster })
                    mccTree = mccTree.annotateNode(insert2, { cluster })
                }
            }
        }
    return mccTree
}
```

```js
const figureOptions=(tree,ops=2) => {
    return {
//   svg: document.getElementById(id),
  tree: tree,
//   animated: true,
  layout: rectangularLayout,
  width: width/(1*ops),
  height: width/(2*ops),
  margins: { top: 20, left: 12, right: 50, bottom: 20 },
  axis:{
    offsetBy:max(tree.getExternalNodes().map(d=>dateGuesser(tree.getTaxon(d).name))),
    reverse:true,
    bars:{}
  },
  baubles: [
    Branches({

      attrs: { stroke: n=>{
                      if(tree.getAnnotation(n, "latent",false)){
                        return "grey"
                      }
                      if ((!tree.isRoot(n) && tree.getChildCount(n)>0 && tree.hasAnnotation(tree.getParent(n), "cluster")) && !tree.getAnnotation(tree.getParent(n),"inserted",false) && tree.hasAnnotation(n, "cluster")) {
                          return clusterScale(tree.getAnnotation(n, "cluster"))
                      }else if(tree.getChildCount(n)==0){
                            return clusterScale(tree.getAnnotation(n, "cluster"))
                      }
                      return "black"
                  },
       strokeWidth: 2,
       strokeDasharray:n=>{
         if(tree.getAnnotation(n, "latent",false)){
                        return "1,6"
        }else{
            return "10,0"
        }
       }
      },
    //   keyBy:(n)=>""+cladeMap.get(n)
    }),
    CircleNodes({
      filter: (n) =>
        tree.isExternal(n),
        attrs:{
            r:4,
            fill:n=>clusterScale(tree.getAnnotation(n, "cluster")),
            stroke:"black"
        }
    }),
    // NodeLabels({
    //   filter: (n) => tree.isExternal(n),
    //   attrs: {
    //     fill: "black",
    //     fontSize: 8,
    //     fontWeight: 300,
    //     fontFamily: "HelveticaNeue-Light"
    //   },
    //   text: (n) => tree.getTaxonFromNode(n).name,
    // // keyBy:(n)=>""+cladeMap.get(n)
    // }),
    BranchLabels({
         filter: n=>tree.getAnnotation(n,"latent",false),
            attrs: {
            fill: "black",
            fontSize: 16,
            fontWeight: 300,
            fontFamily: "HelveticaNeue-Light"
      },
      text: (n) =>   tree.hasAnnotation(n,"latent_support")?`${d3.format("0.2")(tree.getAnnotation(n,"latent_support"))}`:'bug',
    //   keyBy:(n)=>""+cladeMap.get(n)
    })
  ],
  // opts: {}
}
}
```
```js

```

## Appendix
Run overview :

```js
// const xml= FileAttachment(`/data/providers/${observable.params.dir}-${observable.params.stem}.xmlSummary.json`).json()
```
```js
// display(xml)
```
