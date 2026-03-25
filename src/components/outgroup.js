import {minIndex} from "npm:d3-array"

export function outGroup(tree){
    const tips = [];
    for (const child of tree.root.children){
        tips.push([...tree.tips(child)])
    }

    const minOG =   minIndex(tips,d=>d.length)
    return(tips[minOG].map(n=>n.name).join(", "))
}