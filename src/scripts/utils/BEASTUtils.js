import { tsvParse,autoType } from "d3-dsv";
import tfbs from "typedfastbitset";
import {format} from "d3-format";
import {interpolateViridis} from "d3-scale-chromatic"
import {scaleSequentialLog} from "d3-scale"
import {max} from "d3-array";
import {tipIterator,postOrderIterator,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels} from "@figtreejs/browser";

import { dateGuesser } from "./dateGuesser.js"

const TypedFastBitSet = tfbs.TypedFastBitSet

export async function  processLog(promise,replicate){
   return  promise.then(d => d.split('\n').filter(line => !line.startsWith('#')).join('\n'))
    .then(d=>tsvParse(d,autoType))
    .then(l => l.map(d => ({...d, replicate})))
    .then(l=>{
        l.forEach(d=>{
            for (const key in d) {
                if ((/proportions\d+$/.test(key))) delete d[key];
                if ((/latentStateIndicators\d+$/.test(key))) delete d[key];
            }
        })
        return l;
    });
}

export function getRootPosition(tree){
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
export function getCladeMap(tree,map=new Map()){ // node => bitset
   
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
export function getCladeNodeMap(tree,map=new Map()){
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

export const cladesOfInterest = [
    {name:"DRC-1970s",tips:["KC242791|Bonduni|DRC|1977-06","KR063671|Yambuku-Mayinga|DRC|1976-10-01"]},
    {name:"DRC-2007/8",tips:["HQ613402|034-KS|DRC|2008-12-31","HQ613403|M-M|DRC|2007-08-31"]},
    {name:"Gabon-1990s",tips:["KC242792|Gabon|Gabon|1994-12-27","KC242793|1Eko|Gabon|1996-02","KC242798|1Ikot|Gabon|1996-10-27"]},
    {name:"NordDRC",tips:["'MH613311|Muembe.1|DRC|2017-05'","MK007330|18FHV090-Beni|DRC|2018-07-28"]},
    {name:"eastDRC",tips:["KP271018|Lomela-Lokolia16|DRC|2014-08-20","MH733477|BIK009-Bikoro|DRC|2018-05-10","OR084846|MBK67|DRC|2020-06-12","OR084849|Mandaka|DRC|2020-05-31","|22MBK-004|DRC|2022-04-25"]},
    {name:"COG/Gabon-2000s",tips:["KC242800|Ilembe|Gabon|2002-02-23","KF113529|Kelle_2|COG|2003-10"]}
    ]

function getLS(tree,node){
    return tree.getAnnotation(node,"latent_indicator",0)*tree.getAnnotation(node,"latent_proportion",0)
}

export async function processTrees(treesImporter,combinedLogs,cladeMap){
    let treeCount=0;
    const roots = []
    for await (const plainTree of treesImporter.getTrees()) {
        const wholeSet = new TypedFastBitSet();
        wholeSet.addRange(plainTree.getExternalNodeCount())
        const tree= plainTree.orderNodesByDensity(true)
        const rootP = getRootPosition(tree);
        let newRoot = true;
    
        const parameters = combinedLogs[treeCount]
       // add time latent for each external branch
    
        for(const tip of tree.getExternalNodes()){
            parameters[tree.getTaxon(tip).name+"_LS"] = getLS(tree,tip)
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
                parameters[clade.name+"_LS"] = getLS(tree,node);
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
            indices:[treeCount],
            trees:[tree],
            parameters:[parameters]
        }
        roots.push(rootPosition)
       }
       // add node clades to cladeMap so we can keep animations linked below
       getCladeMap(tree,cladeMap)
       
        treeCount++;
    }
    return roots;
}

export const figureOptions=({tree,id,cladeMap,width,height=null}) => {

    const branchScale = scaleSequentialLog(interpolateViridis).domain([1e-4,1e-3]);
    const figureHeight = height===null? width*(1/4): height;
    return {
  svg: document.getElementById(id),
  tree: tree,
  animated: true,
  layout: rectangularLayout,
  width: width,
  height: figureHeight,
  margins: { top: 20, left: 12, right: 100, bottom: 20 },
  axis:{
        gap:10,
        offsetBy:max(tree.getExternalNodes().map(n=>dateGuesser(tree.getTaxon(n).name))),
        // scaleBy:1/365,
        reverse:true,
        // bars:{},
        ticks:{format:format("0.0f"),number:3}
      },
  baubles: [

    Branches({
      attrs: { stroke: n=>interpolateViridis(getLS(tree,n)), strokeWidth: 2 },
    //   attrs: { stroke: n=>branchScale(tree.getAnnotation(n,"rate")), strokeWidth: 2 },
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
      text: (n) => tree.getTaxonFromNode(n).name.split("|").filter((d,i)=>i>1).join("|"),
    keyBy:(n)=>""+cladeMap.get(n)
    }),
    BranchLabels({
         filter: (n) => getLS(tree,n)>0,
            attrs: {
            fill: "black",
            fontSize: 16,
            fontWeight: 300,
            fontFamily: "HelveticaNeue-Light"
      },
      text: (n) => format("0.2")(getLS(tree,n)),
      keyBy:(n)=>""+cladeMap.get(n)
    })
  ],
  opts: {}
}
}
