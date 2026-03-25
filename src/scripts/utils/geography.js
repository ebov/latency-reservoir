import {ImmutableTree as Tree,tipIterator,postOrderIterator,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels,NexusImporter,TaxonSet}  from "@figtreejs/browser";
import {mean,minIndex, quantile} from 'd3-array'
import  kde2d  from "@stdlib/stats-kde2d";
export function unifyTaxaSet(taxonData){
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

export function processLS(tree){
  for(const node of postOrderIterator(tree)){
    if(tree.hasAnnotation(node,"latent_indicator_distribution")){
      const ls = tree.getAnnotation(node,"latent_indicator_distribution")
      const probLS = ls.filter(d=>d>0).length/ls.length;
      const proportionLatent = tree.getAnnotation(node,"latent_prop_distribution").map((d,i)=>d*ls[i])
      const meanLSCond = probLS>0?mean(proportionLatent.filter(d=>d>0)):0
      // console.log({probLS,meanLSCond})
      tree = tree.annotateNode(node,{probLS,meanLSCond})
    }
  }
  return tree;
}
export function colorByCluster(tree,node){
  return tree.hasAnnotation(node,'cluster') & (tree.isExternal(node) || (!tree.isRoot(node) && tree.hasAnnotation(tree.getParent(node),"cluster")))
}

export function  getGeoPoint(node,tree){
 return {cluster:tree.hasAnnotation(node,"cluster")?tree.getAnnotation(node,"cluster"):9,
        latitude:mean(tree.getAnnotation(node,'latitude_distribution')),
        longitude:mean(tree.getAnnotation(node,'longitude_distribution')),
        probLS:tree.hasAnnotation(node,"probLS")?tree.getAnnotation(node,"probLS"):0}
}


  const dist = (p1,p2)=>Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2))
  const nearPointInterpolate = (point,grid) =>{
    const npIndex = minIndex(grid,d=>dist(d,point))
    return grid[npIndex].density
  }

    // order by angle from center
  function orderByAngle(points) {
  
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return points
      .map(p => ({ p, a: Math.atan2(p.y - cy, p.x - cx) }))
      .sort((u, v) => u.a - v.a)
      .map(o => o.p);
  }

export function getContour(nodes,tree,{alpha}){
  let x= [];
  let y=[];
  for(const node of nodes){
    y = y.concat(tree.getAnnotation(node,"latitude_distribution"))
    x = x.concat(tree.getAnnotation(node,"longitude_distribution"))
  }
  
  
  const loc = kde2d( x, y, {n:50});
  const pointDensities = [];
  for(let i=0;i<loc.x.length;i+=1){
    const xpos = loc.x[i]
    for(let j=0; j<loc.y.length;j+=1){
      const ypos=loc.y[j]
      pointDensities.push({x:xpos,y:ypos,density:loc.z.get(i,j)})
    }
  }
  

  
  const sampledPoints = x.map((d,i)=>{
      const point  = {x:d,y:y[i]}
      point.density = nearPointInterpolate(point,pointDensities)
      return point
  });
  
  const f_alpha=quantile(sampledPoints.map(d=>d.density),alpha)
  
  // get outside points
  const edgePoints =[];
  for(let i=0;i<loc.x.length;i+=1){
    const xpos = loc.x[i]
    for(let j=0; j<loc.y.length;j+=1){
      const ypos=loc.y[j]
      const density = loc.z.get(i,j)
      // unsafe at edges of grid
      if(density>f_alpha){
        // check four neighbors
        const leftN = loc.z.get(i-1,j)>f_alpha
        const rightN = loc.z.get(i+1,j)>f_alpha
        const topN = loc.z.get(i,j-1)>f_alpha
        const bottomN = loc.z.get(i,j+1)>f_alpha
        const surrounded = [leftN,rightN,topN,bottomN].reduce((acc,d)=>acc&&d,true)
        if(!surrounded){
           edgePoints.push({x:xpos,y:ypos,density:loc.z.get(i,j)})
        }
      }
    }
  }
  const perimeter = orderByAngle(edgePoints)
  return {perimeter,grid:pointDensities}
}