import {tipIterator,postOrderIterator,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels,Axis} from "@figtreejs/browser";
function tempSig(tree){
    const tips = [...tipIterator(tree)].sort((a,b)=>(tree.getNodeHeight(a)))
    for(const tip of tipIterator(tree)){

    }
}