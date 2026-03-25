
```js
import {ImmutableTree as Tree,figtree,rectangularLayout,Axis,Branches,CircleNodes,NodeLabels,postOrderIterator} from "@figtreejs/browser"
import {getCladeMap,processLog,processTrees,figureOptions} from "/components/BEASTUtils.js"
```

```js
function scaleBl(t,scale){
 let tree = t;
    for(const node of postOrderIterator(tree)){
        if(tree.getLength(node)!==undefined){
            const l = tree.getLength(node)*scale
            tree = tree.setLength(node,l)
            console.log(`new length ${l}`)
        }
    }
    return tree;
}
function getLs(tree){
     const tips = [...tipIterator(tree)].sort((a,b)=>tree.getHeight(b)-tree.getHeight(a))
    const visited = new Set();
    let i=0;
    for( const tip of tips){
        tree = tree.annotateNode(tip,{label:`S${i}`})
        for (const node of tree.getPathToRoot(tip)){
           if(visited.has(node.number) || tree.isRoot(node)){
                tree = tree.annotateNode(node,{label:`C${i}`,addedFor:tip.number})
                // travel up other path. Get all the 
                const marker = [...tipIterator(tree,node,n=>visited.has(n.number) && tree.getAnnotation(n,"pathOf")<i)].sort((a,b)=>tree.getHeight(b)-tree.getHeight(a))[0]

                const nonInformative = tree.getHeight(node) - tree.getHeight(marker);
                const informative  = tree.getHeight(marker) - tree.getHeight(tip);
                tree = tree.annotateNode(tip,{joinsAt:node.number,nonInformative,informative})
                visited.add(node.number) // just for the root
                break;
           }else{
            visited.add(node.number)
            tree = tree.annotateNode(node,{pathOf:i})
           }
        }
        i+=1;
    }
    return tree;
}
```
```js
const pamlBest8 = FileAttachment("/analyses/tipDater/set11_best.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: getLs(scaleBl(Tree.fromNewick(t.tree),1/365)) })),
    })).find(d=>d.analysis==="srdt");
  });
```


```js echo
// const  ns = '((((((virus1:0.1,virus2:0.12)0.95:0.08,(virus3:0.011,virus4:0.0087)1.0:0.15)0.65:0.03,virus5:0.21)1.0:0.2,(virus6:0.45,virus7:0.4)0.51:0.02)1.0:0.1,virus8:0.4)1.0:0.1,(virus9:0.04,virus10:0.03)1.0:0.6);';

// const tree = await new Promise(resolve => resolve(Tree.fromNewick(ns)))
// .then(getLs)

const tree =  pamlBest8.trees[1].tree
const cladeMap = getCladeMap(tree)
```


```js
const informative = [...tipIterator(tree)].reduce((acc,n)=>acc+tree.getAnnotation(n,"informative"),0)
const nonInformative = [...tipIterator(tree)].reduce((acc,n)=>acc+tree.getAnnotation(n,"nonInformative"),0)
```
```js
 [...tipIterator(tree)].map((n)=>tree.getAnnotation(n,"informative"))
```
```js
display(informative)
display(nonInformative)
```
```js
display(informative/(informative+nonInformative))
```
```js
const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(tree.getAnnotationDomain("pathOf"))
```


<div class="card">
    <svg id="rooted-fig"  height="270px" width=${width} ></svg>
    ${resize((width) => rootedRender({width,height:270}))}
</div>


```js echo
const rootedRender = figtreeRender({tree:tree,id:"rooted-fig",layout:rectangularLayout,margins: { top: 15, left: 35, right: 70, bottom: 35 }})
```
```js echo
const figtreeRender=({tree,id,layout,margins,branchKey,axis=false}) => ({height,width}) =>{
  figtree({
    svg: document.getElementById(id),
    tree: tree,
    animated: true,
    layout,
    margins,
    height,
    width,
    baubles: [
      Axis({
      gap:10,
      reverse:true,
      scaleBy:-1,
      ticks:{format:d3.format("0.1e")},
      title:{text:"divergence"},
      bars:{}
    }),
      Branches({
        attrs: { stroke: n=> colorScale(tree.getAnnotation(n,"pathOf")), strokeWidth: 2.5},
         keyBy:n=> ""+cladeMap.get(n)
      }),
      CircleNodes({
        filter: (n) => tree.isExternal(n),
        attrs:{
          r:7,
          fill: n=> colorScale(tree.getAnnotation(n,"pathOf"))
        },
         keyBy:n=> ""+cladeMap.get(n)
      }),

      NodeLabels({
        // filter: (n) => tree.isExternal(n),
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:5
        },
        text: (n) => `${tree.getAnnotation(n,"label")}: ${d3.format(".2")(tree.getHeight(n))}`//.name.split("|").filter((d,i)=>i>1).join("|"),
      })
    ],
    opts: {}
  })
}
```

```js
function* tipIterator(tree, node,fn=n=>true) {
  if (node === undefined) {
    node = tree.getRoot()
  }
  const traverse = function* (node) {
    const childCount = tree.getChildCount(node)
    if (childCount > 0) {
      for (let i = 0; i < childCount; i++) {
        const child = tree.getChild(node, i)
        if(fn(child)){
            yield* traverse(child)
        }
        
      }
    } else {
      yield node
    }
  }
  yield* traverse(node)
}
```