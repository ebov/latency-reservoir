import sharp from "sharp";
import fs from "fs";
import {JSDOM} from "jsdom";


// const layout = [
//   { svg: svgA, row: 0, col: 0, rowspan: 1, colspan: 1 },
//   { svg: svgB, row: 0, col: 1, rowspan: 2, colspan: 1 },
//   { svg: svgC, row: 1, col: 0, rowspan: 1, colspan: 1 },
//   { svg: svgD, row: 2, col: 0, rowspan: 1, colspan: 2 }
// ];

// const options = {
//   totalWidth: 600,
//   totalHeight: 900
// };

// screen assume 96 dpi
// png target 300 dpi

// sizes are in cm
export const svgSizes = {
  small: {
    width: Math.round(5.7 * (1 / 2.54) * 96),
    height: Math.round(3 * (1 / 2.54) * 96)
  },
  medium: {
    width: Math.round(12.1 * (1 / 2.54) * 96),
    height: Math.round(12.1 * (1 / 2.54) * 96)
  },
  large: {
    width: Math.round(18.4 * (1 / 2.54) * 96),
    height: Math.round(18.4 * (1 / 2.54) * 96)
  }
};

//at 300 dpi
// Small: approximately 9 cm (1063) x 6 cm (708)
// Medium: approximately 11  cm (1299) x 11 cm (1299)
// Large: approximately 18 cm (2125) x 22 cm (2598)


// help from copilot
export function plotGrid(layout, options = {}) {
  const {
    totalWidth = 415,
    totalHeight = 415,
    labelFontSize = 18,
    labelOffsetX = 10,
    labelOffsetY = 30,
  } = options;

  const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
  const document = dom.window.document;

  const combinedSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  combinedSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  combinedSVG.setAttribute("width", totalWidth);
  combinedSVG.setAttribute("height", totalHeight);

  // Determine grid dimensions
  const maxRow = Math.max(...layout.map(p => p.row + (p.rowspan || 1)));
  const maxCol = Math.max(...layout.map(p => p.col + (p.colspan || 1)));

  const cellWidth = totalWidth / maxCol;
  const cellHeight = totalHeight / maxRow;

  layout.forEach((panel, index) => {
    const { svg, row, col, rowspan = 1, colspan = 1 } = panel;
    const panelDOM = new JSDOM(svg);
    const panelSVG = panelDOM.window.document.querySelector("svg");

    const x = col * cellWidth;
    const y = row * cellHeight;
    const width = colspan * cellWidth;
    const height = rowspan * cellHeight;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x}, ${y})`);

    // Scale panel to fit its grid cell
    const panelW = parseFloat(panelSVG.getAttribute("width") || width);
    const panelH = parseFloat(panelSVG.getAttribute("height") || height);
    const scaleX = width / panelW;
    const scaleY = height / panelH;
    const scale = Math.min(scaleX, scaleY);

    const innerG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    innerG.setAttribute("transform", `scale(${scale})`);

    Array.from(panelSVG.childNodes).forEach(node => {
      innerG.appendChild(document.importNode(node, true));
    });

    g.appendChild(innerG);

    // Add label
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.textContent = String.fromCharCode(65 + index); // A, B, C...
    label.setAttribute("x", labelOffsetX);
    label.setAttribute("y", labelOffsetY);
    label.setAttribute("font-size", labelFontSize);
    label.setAttribute("font-family", "HelveticaNeue-Light");
    // label.setAttribute("font-weight", "bold");

    if(layout.length>1){
       g.appendChild(label);
    }
   
    combinedSVG.appendChild(g);
  });

  return combinedSVG.outerHTML;
}




export function inset(base,inset,ops){
    const {scale,pos} = {scale:1,pos:[0,0],...ops}

    const insetDOM = new JSDOM(inset);
    const insetSVG = insetDOM.window.document.querySelector("svg");

    const mainDOM = new JSDOM(base);
    const mainSVG = mainDOM.window.document.querySelector("svg");
    const height = parseFloat(mainSVG.getAttribute("height"));
    const width = parseFloat(mainSVG.getAttribute("width"));



    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    const document = dom.window.document;

    const combinedSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    combinedSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    combinedSVG.setAttribute("width", width);
    combinedSVG.setAttribute("height", height);

    const mainG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainG.setAttribute("transform", `translate(${0}, ${0})`);

    // add main svg nodes
    Array.from(mainSVG.childNodes).forEach(node => {
      mainG.appendChild(document.importNode(node, true));
    });

    const insetG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    insetG.setAttribute("transform", `translate(${pos[0]}, ${pos[1]})`);

    const innerInsetG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    innerInsetG.setAttribute("transform", `scale(${scale})`);

    Array.from(insetSVG.childNodes).forEach(node => {
      innerInsetG.appendChild(document.importNode(node, true));
    });

    insetG.appendChild(innerInsetG)
    mainG.appendChild(insetG)

    combinedSVG.appendChild(mainG)

    return combinedSVG.outerHTML;

}







export function saveFigure({content,path}) {
  const { width, height } = getSVGDimensions(content);
  
  fs.writeFileSync(`${path}.svg`, content);

  sharp(Buffer.from(content))
    .resize({ width, height }) // use pixel dimensions directly
    .png({ compressionLevel: 9 })
    .withMetadata({ density: 300 }) // embed 300 DPI metadata
    .toFile(`${path}.png`, (err, info) => {
      if (err) throw err;
      console.log("PNG created with 300 DPI:", info);
    });
}


function getSVGDimensions(svgString) {
  const dom = new JSDOM(svgString);
  const svg = dom.window.document.querySelector("svg");

  const width = Math.round(parseFloat(svg.getAttribute("width")) *300/96); // scale svg px to account for 300 dpi
  const height = Math.round(parseFloat(svg.getAttribute("height"))* 300/96);  // scale svg px to account for 300 dpi


  if (isNaN(width) || isNaN(height)) {
    throw new Error("SVG must have explicit width and height in pixels.");
  }

  return { width, height };
}




