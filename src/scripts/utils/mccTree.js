import { postOrderIterator } from "@figtreejs/browser";
import { getCladeMap } from "./BEASTUtils.js";
import {median} from 'd3-array'

// refactor to take async iterator
export function mcc(trees){
    const treeMap =new Map();
    let treeCount = trees.length;

    const nodes = new Map();
    // loop through trees and get nodes
    for (const tree of trees){
        // get the clade for each node
        const cladeMap = getCladeMap(tree);
        // add all clades to growing clades list

        cladeMap.forEach((bitset,node,map)=>{
            const bs = ""+bitset;
            if(nodes.has(bs)){
                nodes.set(bs,nodes.get(bs).concat({tree,node}))
            }else{
                nodes.set(bs,[{tree,node}])
            }
        })
        treeMap.set(tree,cladeMap);
    }

    // calculate clade cred and get mcc tree.
    let bestCC = 0;
    let mcc=null;
    for(const tree of trees){
        const nodeMap = treeMap.get(tree);
        let cc = 0;
        for(const node of postOrderIterator(tree)){
            const clade = ""+nodeMap.get(node);
            const allNodes = nodes.get(clade)
            cc+=allNodes.length/treeCount;
        }
        if(cc>bestCC){
            bestCC=cc;
            mcc=tree;
        }
    }
    // console.log(mcc.toNewick())
    const nodeMap = treeMap.get(mcc);
    const annotations = mcc.getAnnotationKeys();

    for(const node of postOrderIterator(mcc)){
        
        const clade =  ""+nodeMap.get(node);
        const allNodes = nodes.get(clade);

        mcc = mcc.annotateNode(node,{posterior:allNodes.length/treeCount})
        const heights = allNodes.map(({tree,node:n})=>tree.getHeight(n))
        const medianHeight = median(heights); 

        // console.log(`Height was ${mcc.getHeight(node) } median is ${medianHeight}`)
        mcc = mcc.annotateNode(node,{heights});
        mcc = mcc.setHeight(node,medianHeight)
        
        for(const annotation of annotations){
        if(!mcc.hasAnnotation(node,annotation)) continue // only add annotations for those that exist on the mcc node (root might not have some)
        if(annotation==='location'){ // location is an array of arrays an needs to be handled in a differently
            const locations = allNodes.map(({tree,node})=>tree.getAnnotation(node,annotation));
            const lat = locations.map(d=>d[0])
            const long = locations.map(d=>d[1])
            mcc = mcc.annotateNode(node,{'latitude_distribution':lat,'longitude_distribution':long})
        } else{
            const values = allNodes.map(({tree,node})=>tree.getAnnotation(node,annotation));
            const key= `${annotation}_distribution`
            mcc = mcc.annotateNode(node,{[key]:values})
        } 
       
        }
    }
        // console.log(mcc.toNewick(undefined,{includeAnnotations:true}))
        // console.log(mcc._data.annotations)

    return mcc;
}