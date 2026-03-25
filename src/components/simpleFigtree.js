import {figtree,radialLayout,rectangularLayout,circle,branches,nodeLabel} from "./figtree.esm.js"
import {easeCubic} from 'npm:d3-ease'
const rttMargin = 100;

export function radialFigure(tree, { width, height, entry }) {
  figtree({
    parent: entry,
    tree,
    layout: radialLayout(tree.getExternalNode("KC242791|Bonduni|DRC|1977-06"), true),
    margins: { top: rttMargin, bottom: rttMargin, left: rttMargin, right: rttMargin },
    width: width,
    height: height,
    baubles: [
      circle(tree.externalNodes, {
        attrs: {
          r: 4,
        }
      }),
      circle([tree.root], {
        attrs: {
          r: 7,
        }
      }),
      nodeLabel(tree.externalNodes, {
        //TODO move to node Shape
        text: (d) => d.name.split('\|').splice(2, 3).join("|"),
      }),
      branches(tree.nodes, {
        curvature: 1,
        attrs: {
          stroke: 'black',
          strokeWidth: 3
        },
        interactions: {
          click: (d) => {
            tree.reroot(d, 0.5);
            tree.orderByNodeDensity(true);
          },
        },
      }),
    ],
    transitions: {
      ease: easeCubic,
      duration: 500
    }
  }
  )
}


export function rectangularFigure(tree, { width, height, entry }) {
  figtree({
    parent: entry,
    tree,
    layout:rectangularLayout,
    margins:{top:10,bottom:10,left:10,right:100},
    width: width,
    height: height,
    baubles: [
      circle(tree.externalNodes, {
    attrs: {
      r: 7,
    }
      }),
      circle([tree.root],{
        attrs:{
          r:7,
        }
      }),
      nodeLabel(tree.externalNodes, {
        //TODO move to node Shape
        text: (d) => d.name.split('\|').splice(2,3).join("|"),
      }),
      branches(tree.nodes, {
        curvature: 0,
        attrs:{
            stroke:'black',
            strokeWidth:3
        },
        interactions: {
          click: (d) => {
            tree.reroot(d,0.5);
            tree.orderByNodeDensity(true)
          },
        },
      }),
    ],
    transitions: {
      ease: easeCubic,
      duration: 500
    }
  }
  )
}
/**
 * const rootedOptions = {...rttOptions,
parent: document.getElementById("figure1B"),
layout:rectangularLayout,
        margins:{top:10,bottom:10,left:10,right:100},

baubles: [
          circle(tree.externalNodes, {
        attrs: {
          r: "7",
        }
          }),
          circle([tree.root],{
            attrs:{
              r:7,
            }
          }),
          nodeLabel(tree.externalNodes, {
            //TODO move to node Shape
            text: (d) => d.name.split('\|').splice(2,3).join("|"),
          }),
          branches(tree.nodes, {
            curvature: 0,
            attrs:{
                stroke:'black',
                strokeWidth:3
            },
            interactions: {
              click: (d) => {
                tree.reroot(d,0.5);
                tree.orderByNodeDensity(true)
              },
            },
          }),
        ],}
 */