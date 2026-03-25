import { postOrderIterator, tipIterator } from "@figtreejs/browser";
import { dateGuesser } from "./dateGuesser.js";



export function processTree(t, data, og = "PP_003RXHG|25fhv173|DRC|2025-09-01") { // outgroup for consistent cluster labeling
  let tree = t;
  if(og){
    tree = tree.reroot(tree.getNode(og));
  }

  for (const d of data) {

     try {
              const tip = t.getNode(d.taxa);
              tree = tree.annotateNode(tip, d); // some analyses exclude makona
          } catch (error) {
            // some tree files still have single quotes on this taxa
            try{
              const tip  = t.getNode(`$'{d.taxa}'`);
              tree = tree.annotateNode(tip, d);
              console.log(` Using '${d.taxa}' as for data taxa ${d.taxa}`)
            }catch(error){
                 console.log(`Taxa not found: ${d.taxa}`);
            }
          }
  }
  const clusters = tree.getAnnotationSummary("cluster").domain; 
  for (const cluster of clusters) {
    const nodes = tree.getNodes().filter(n => tree.hasAnnotation(n, "cluster") && tree.getAnnotation(n, 'cluster') === cluster);
    let mrca;
    if (nodes.length > 1) {
      mrca = tree.getMRCA(nodes);
    } else {
      mrca = nodes[0];
    }
    for(const node of postOrderIterator(tree,mrca)){
      tree = tree.annotateNode(node,"cluster",cluster)
    }
   
  }
  for (const node of tipIterator(tree)) {
    const date = dateGuesser(tree.getTaxon(node).name);
    tree = tree.annotateNode(node, { date });
  }


  return tree;

}
