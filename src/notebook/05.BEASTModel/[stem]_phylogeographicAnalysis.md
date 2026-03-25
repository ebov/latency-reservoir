```js
import {TypedFastBitSet} from "npm:typedfastbitset";
import {ImmutableTree as Tree,tipIterator,postOrderIterator,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels,NexusImporter,TaxonSet} from "npm:@figtreejs/browser@beta";
import {mean,max,min,range} from "d3-array";
import {getCladeMap} from "../../scripts/utils/BEASTUtils.js"

```

```js
import {clusterScale} from "/scripts/utils/colors.js"
import {processTree} from "/scripts/utils/processTree.js"
```

```js
function processLS(tree){
  for(const node of postOrderIterator(tree)){
    if(tree.hasAnnotation(node,"LS_distribution")){
      const ls = tree.getAnnotation(node,"LS_distribution")
      const probLS = ls.filter(d=>d>0).length/ls.length;
      const meanLSCond = probLS>0?mean(ls.filter(d=>d>0)):0
      // console.log({probLS,meanLSCond})
      tree = tree.annotateNode(node,{probLS,meanLSCond})
    }
  }
  return tree;
}
```

```js 
const processedData = FileAttachment(`/data/providers/${observable.params.stem}.processedRun.json`).json()
              .then(roots=>roots.map(d=>({posterior:d.posterior,tree:Tree.fromNewick(d.mcc,{parseAnnotations:true,taxonSet }).orderNodesByDensity(true)}))) // need taxa set
              .then(roots => roots.map(d=>({...d,tree:processTree(d.tree,tipData,null)}))) // adds cluster annotations to nodes
              .then(roots=>roots.map(d=>({...d,tree:processLS(d.tree)}))) // convert ls distrution to useful metrics
```

```js
const migrationData = FileAttachment(`/data/providers/${observable.params.stem}.treeMovements.json`).json()
```
```js
const migrations= migrationData.movements;
const taxonData = unifyTaxaSet(migrationData.taxonSet._data); // need to remove single quotes for
const taxonSet = new TaxonSet(taxonData);
```
```js
function unifyTaxaSet(taxonData){
  // need to remove single quotes for "'MH613311|Muembe.1|DRC|2017-05'" . The number of this taxon is all we need below
  const cleanedData = {finalized:true,byName:{}} // we don't want to add new taxa
  const nameInTrees = "'MH613311|Muembe.1|DRC|2017-05'"
  const nameInJSON = "MH613311|Muembe.1|DRC|2017-05"
  const index = taxonData.allNames.findIndex(d=>d===nameInTrees)
  cleanedData.allNames = taxonData.allNames;
  cleanedData.allNames[index]=nameInJSON

  
  for(const [name,taxon] of Object.entries(taxonData.byName)){
    if(name===nameInTrees){
      const newTaxon = taxon;
      newTaxon.name=nameInJSON
      cleanedData.byName[nameInJSON]=newTaxon;
    }
    else{
      cleanedData.byName[name]=taxon
    }
  }
  return cleanedData
}
```

# Exploring the geographic spread of EBOV

We plot mcc tree for the observed rooting positions in the analysis below. 
You can select which tree to explore with the slider. 
```js
const rootIndex = view(Inputs.range([0,processedData.length-1],{label:"root Index",step:1,value:0}))
```
```js
const {tree,posterior} =processedData[rootIndex]
```
```js
const locations = processLocations(tree)
```

<div class="grid grid-cols-2">
  <div class="card">
      <h2>Posterior support: ${d3.format("0.2")(posterior)}</h2>
      <svg id="rooted-fig"  height=300 width=${width} ></svg>
          ${resize((width) => drawTree({width,height:300}))}
  </div>
  <div class="card">
    ${resize((width) => makeMap({width,marks:globe}))}
    <h3>${minTime}-${minTime+duration}</h3>
  </div>
</div>

Selecting the option below will plot the density of nodes from all samples that fall within the selected time window. 
Otherwise the density for a given node can be shown by clicking on the node or branch above.

<div class="grid grid-cols-3">
<div>

```js
const density = view(Inputs.checkbox(["Show Density"]))
```
```js
const points = view(Inputs.checkbox(["Show Points"]))
```

</div>
<div>

```js
Inputs.button([["Clear node selection", reset]])
```

</div>
<div>

```js
const minTime= view(Inputs.range([1900,max(locations,d=>d.time)-5],{label:"min time",step:5,value:1995}))
```
```js
const duration = view(Inputs.range([5,150],{label:"duration",step:5,value:25}))
```

</div>
</div>


## Vectors of spread
Here we plot the samples branches as vectors moving between locations.

<div class="card">
    ${resize((width) => makeMap({width,marks:vectors}))}
</div>

```js
const treeOptions = {
    svg:document.getElementById("rooted-fig"),
    tree,
}
```
```js
const strokeScale = d3.scaleSequential(d3.interpolateTurbo).domain([0.5,1])
```

```js
function colorByCluster(tree,node){
  return tree.hasAnnotation(node,'cluster') & (tree.isExternal(node) || (!tree.isRoot(node) && tree.hasAnnotation(tree.getParent(node),"cluster")))
}
```

```js
const selectedNode =  Mutable(null);
const selectNode = (n) => selectedNode.value=n;
const reset = () => selectedNode.value=null;
```

```js
const drawTree = ({width,height})=>{
 figtree({
    ...treeOptions,
    animated:true,
    width,
    height,
    margins:{right:10,top:20,left:20,bottom:40},
    axis:{
      offsetBy:origin,
      reverse:true,
      bars:{}
    },
    baubles:[
       Branches({
        filter:d=>d.number===selectedNode,
        attrs:{
          strokeWidth:7,
          stroke:d=> '#ADD8E6',
        }}),
        Branches({
        attrs:{
          strokeWidth:3,
          stroke:d=> colorByCluster(tree,d)?clusterScale(tree.getAnnotation(d,"cluster")):'grey',
          strokeDasharray:d=>tree.getAnnotation(d,"probLS",0)>0.5? "8 4":"10 0",
          cursor:"pointer"
        },
        interactions:{
          onClick:n=>selectNode(n.number)
        }
      }),
      BranchLabels({
        filter:d=>tree.getAnnotation(d,"probLS",0 )>0.5,
        text:d=>d3.format("0.2%")(tree.getAnnotation(d,"probLS",0))
      }),
      CircleNodes({
        filter:d=>tree.isRoot(d),
        attrs:{
          r:10,
          fill:"grey",
          cursor:"pointer"
        },
        interactions:{
          onClick:n=>selectNode(n.number)
        }
      })
    ]
 })
}
```


<!-- Map stuff -->

```js
const tipData = FileAttachment("/data/processed/latLong.tsv").tsv({ typed: true });
const world = FileAttachment("/data/raw/world-110m.json").json();
const coordinates = [
        [30, -1],
        [21, -7],
        [5, -1], //11,-1
        [10, 5] //long, lat 10 10
      ]
```
```js
const land = topojson.feature(world, world.objects.land)
const countries = topojson.mesh(world, world.objects.countries, (a, b) => a !== b)
```
```js
function getGeoPoint(node){
 return {cluster:tree.hasAnnotation(node,"cluster")?tree.getAnnotation(node,"cluster"):9,
        latitude:mean(tree.getAnnotation(node,'latitude_distribution')),
        longitude:mean(tree.getAnnotation(node,'longitude_distribution')),
        probLS:tree.hasAnnotation(node,"probLS")?tree.getAnnotation(node,"probLS"):0}
}
```

```js
const tipsData = tree.getExternalNodes().map(getGeoPoint)
const rootPoint = getGeoPoint(tree.getRoot())
```

```js 
const branches = tree.getNodes().filter(d=>!tree.isRoot(d))
                  .map(d=>{
                    return {
                    parent:getGeoPoint(tree.getParent(d)),
                    child:getGeoPoint(d),
                    stroke:colorByCluster(tree,d)?clusterScale(tree.getAnnotation(d,"cluster")):'#2F4F4F',
                    strokeDasharray:tree.getAnnotation(d,"probLS",0)>0.5? "8 4":"10 0"
                    }
                  })
```
```js
const temporalDensity =[Plot.density(locations.filter((d) => d.time>minTime && d.time < (minTime+duration)),
                           {
                            x: "long",
                            y: "lat",
                            strokeOpacity: 0.1,
                            stroke:'lightgrey',
                            clip: true
                          })]
if(points.length===1){
  temporalDensity.push(
      Plot.dot(locations.filter((d) => d.time>minTime && d.time < (minTime+duration)),
                            {
                              x: "long",
                              y: "lat",
                              r:1,
                              opacity: 0.5,
                              clip: true,
                              fill:"time"
                            }) 
  )
}
```

```js
const globe = Plot.marks([ 
                          Plot.graticule(),
                          Plot.geo(land, {fill: "#e0e0e0",stroke:"black"}),
                          Plot.geo(countries, { strokeOpacity: 0.5 }),
                          Plot.sphere(), 
                        density.length==1?temporalDensity:null,
                         getNodeDensity(selectedNode),
                          Plot.link(branches,
                          {
                            filter:d=>d.strokeDasharray==="8 4",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:2,
                            stroke:d=>d.stroke,
                            strokeDasharray:"8 4",
                            markerEnd: "arrow"
                          }),
                          Plot.link(branches,
                          {
                            filter:d=>d.strokeDasharray==="10 0",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:2,
                            stroke:d=>d.stroke,
                            strokeDasharray:"10 0",
                            markerEnd: "arrow"
                          }),
                           Plot.dot(tipsData,{r:7, y:"latitude",x:"longitude",fill:"black"}),
                           Plot.dot(tipsData,{r:6 , y:"latitude",x:"longitude",fill:d=>clusterScale(d.cluster),cursor: "pointer"}),
                           Plot.dot([rootPoint],{r:6 , y:"latitude",x:"longitude",fill:'#2F4F4F',cursor: "pointer"}),

                          //  Plot.dot(coordinates)
                           ])
```

```js
const vectorFilter=d=>{
  if(selectedNode){
    return d.destination.node===selectedNode
  }
  return  d.source.time>minTime && d.source.time < (minTime+duration)
}
```
```js

const vectors =  Plot.marks([ 
                          Plot.graticule(),
                          Plot.geo(land, {fill: "#e0e0e0",stroke:"black"}),
                          Plot.geo(countries),
                          Plot.sphere(),
                          // Plot.link(clusterMovements.filter(d=>d.cluster!=="9"),{
                          //   x1:d=>d.source.location[1],
                          //   x2:d=>d.dest.location[1],
                          //   y1:d=>d.source.location[0],
                          //   y2:d=>d.dest.location[0],
                          //   markerEnd:"arrow",
                          //   stroke:d=>clusterScale(d.cluster),
                          //   strokeOpacity:0.5
                          // }),
                            Plot.link(clusterMovements.filter(d=>d.root ),{
                            x1:d=>d.source.location[1],
                            x2:d=>d.dest.location[1],
                            y1:d=>d.source.location[0],
                            y2:d=>d.dest.location[0],
                            markerEnd:"arrow",
                            stroke:d=>clusterScale(d.cluster),
                            strokeOpacity:0.5,
                            strokeWidth:0.5
                          }),
                           Plot.link(branches,
                          {
                            filter:d=>d.strokeDasharray==="8 4",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:3,
                            stroke:d=>d.stroke,
                            strokeDasharray:"8 4",
                            markerEnd: "arrow"
                          }),
                          Plot.link(branches,
                          {
                            filter:d=>d.strokeDasharray==="10 0",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:3,
                            stroke:d=>d.stroke,
                            strokeDasharray:"10 0",
                            markerEnd: "arrow"
                          }),
                           Plot.dot(tipsData,{r:7, y:"latitude",x:"longitude",fill:"black"}),
                           Plot.dot(tipsData,{r:6 , y:"latitude",x:"longitude",fill:d=>clusterScale(d.cluster),cursor: "pointer"}),
                           Plot.dot([rootPoint],{r:6 , y:"latitude",x:"longitude",fill:'#2F4F4F',cursor: "pointer"}),
                          //  Plot.dot(filteredMovements,
                          //   {
                          //     x:d=>d.source.longitude,
                          //     y:d=>d.source.latitude,
                          //     r:2,
                          //     opacity: 0.5,
                          //     clip: true,
                          //     fill:d=>d.source.time
                          // })

])
```


```js
function getNodeDensity(n){
  if(n===null || density.length===1){ // don't plot anything if we are showing a time slice
    return null
  }
  const node = tree.getNode(n)
  const locations = []
  const heights = tree.getAnnotation(node,"heights")
  const lat = tree.getAnnotation(node,"latitude_distribution")
  const long = tree.getAnnotation(node,"longitude_distribution")
  if(heights.length!==lat.length || long.length!==lat.length) throw Error("index counts don't match")
  for(let i=0; i<lat.length; i++){
    locations.push({time:origin-heights[i],long:long[i],lat:lat[i]})
  }

   const marks = [Plot.density(locations,
                            {
                              x: "long",
                              y: "lat",
                              strokeOpacity: 0.5,
                              clip: true
                            }) ]
    if(points.length===1){
      marks.push(
                  Plot.dot(locations,
                            {
                              x: "long",
                              y: "lat",
                              r:1,
                              opacity: 0.5,
                              clip: true,
                              fill:"time"
                            }) 
      )
    }
    return marks
}
```



```js
function makeMap({width,marks}){
 return marks.plot({
  width: width,
  height: width*9/16,
  //  color: {legend: true,domain:[1900,2025]},
  projection:
  {
    type: "equirectangular",
    domain: {
      type: "MultiPoint",
      coordinates
    },
  }  
})
}

```





```js
const origin = max(tree.getExternalNodes(),d=>tree.getAnnotation(d,"date"))
```

```js
function processLocations(tree){
  const locations = []
  for(const node of postOrderIterator(tree)){
    const heights = tree.getAnnotation(node,"heights")
    const lat = tree.getAnnotation(node,"latitude_distribution")
    const long = tree.getAnnotation(node,"longitude_distribution")
    if(heights.length!==lat.length || long.length!==lat.length) throw Error("index counts don't match")
    for(let i=0; i<lat.length; i++){
      locations.push({time:origin-heights[i],long:long[i],lat:lat[i]})
    }
  }
  locations.sort((a,b)=>a.time-b.time)
  return locations
  // for each tree construct a list of all the nodes
  // slice the list by time
  // construct a density by time
}
```


```js
const cladeMap = getCladeMap(tree)
```
```js
const clusterOrder=["A","G","D","B","I","E","C","H","F"]
```

```js
const clusters = tree.getAnnotationSummary("cluster").domain
let clusterMovements = []
for(const cluster of clusters){
  console.group(cluster)
  const nodes = tree.getNodes().filter(d=>tree.getAnnotation(d,"cluster","NOT FOUND")===cluster)
  let clusterRoot = tree.getMRCA(nodes) //
  let og;
  if(cluster==="A"){ // go back one parent for 1970s
  og = clusterRoot;
    clusterRoot = tree.getParent(og)
  }
  for(const node of postOrderIterator(tree,clusterRoot)){
    const cladeString = cladeMap.get(node).toString()
    const parentCladeString = cladeMap.get(tree.getParent(node)).toString();
    console.log(parentCladeString + '->' +cladeString)
    
    const moves = migrations.filter(d=>d.dest.clade===cladeString && d.source.clade===parentCladeString )
                            .map(d=>({...d,cluster,root:node===clusterRoot||node==og,}))
    console.log(moves)
    
    clusterMovements = clusterMovements.concat(moves)
  }

  clusterMovements.sort((a,b)=> clusterOrder.findIndex(d=>d==b.cluster)-clusterOrder.findIndex(d=>d==a.cluster))
  console.groupEnd()
  
}

```
