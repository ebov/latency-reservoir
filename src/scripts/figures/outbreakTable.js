import { csv } from "d3-fetch";
import fs from "fs"
throw("Edit the tables by hand!!!!")
const outbreaks = await csv("https://raw.githubusercontent.com/artic-network/ebolavirus/refs/heads/details-and-fragments/ebov/EBOV_Outbreaks.csv").then(d=>d.map(k=>({...k,outbreak:k.outbreak.replace("_"," ")})))
const genomes = await csv("https://raw.githubusercontent.com/artic-network/ebolavirus/refs/heads/details-and-fragments/ebov/EBOV_Outbreak_Genomes.csv")
                            .then(d=>d.filter(k=>k['exclude?']!=='y'))
                            .then(d=>d.map(k=>({...k,outbreak:k.outbreak.replace("_"," ")})))


function outbreakTable(outbreaks){
    let latex = `
    \\begin{tabular}{lllll}
outbreak & country  & adm1 & location & dates \\\\
\\toprule\n`

for(const outbreak of outbreaks){
    latex+=`${outbreak.outbreak} & ${outbreak.adm0} & ${outbreak.adm1} & ${outbreak.location} & ${outbreak.dates} \\\\\n`
}

latex += `\\bottomrule
\\end{tabular}`
return latex;
}


function genomeTable(genomes){
    let latex = `
    \\begin{tabular}{lllr}
accession & country  & outbreak & date \\\\
\\toprule\n`

for(const genome of genomes){
    latex+=`${genome.accession} & ${genome.country} & ${genome.outbreak} & ${genome.date} \\\\\n`
}

latex += `\\bottomrule
\\end{tabular}`
return latex;
}
const gt = genomeTable(genomes)
const ot = outbreakTable(outbreaks)

// fs.writeFileSync(`../../../doc/tables/genomes.tex`, gt,'utf8');
// fs.writeFileSync(`../../../doc/tables/outbreaks.tex`, ot,'utf8');


