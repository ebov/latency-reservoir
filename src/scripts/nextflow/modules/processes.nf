

process make_partition {
    input:
        path alignment
    output:
        path "partition.nex"
    script:
    """
    make_partition_file.py $alignment > partition.nex
    """
}

process get_srdt_cltr {
    output:
    path "srdt.cltr"
    script:
    """
    get_ctl.py --Mgene ${params.Mgene} --Malpha ${params.Malpha} --tipDate "${params.tipDate}" --clock 1 --outfile srdt.mlb --pamlModel "${params.pamlModel}" >srdt.cltr
    """
}

process get_sr_cltr {
    output:
    path "sr.cltr"
    script:
    """
    get_ctl.py --Mgene ${params.Mgene} --Malpha ${params.Malpha} --tipDate 0 --clock 1 --outfile sr.mlb --pamlModel "${params.pamlModel}" >sr.cltr
    """
}

process get_dr_cltr {
    output:
    path "dr.cltr"
    script:
    """
    get_ctl.py --Mgene ${params.Mgene} --Malpha ${params.Malpha} --tipDate 0 --clock 0 --outfile dr.mlb  --pamlModel "${params.pamlModel}" > dr.cltr
    """
}




process rename_alignment {
    input:
    path alignment
    path nameMap
    output:
    path "${alignment}.renamed.fa"
    script:
    """
    goalign rename -m ${nameMap} -i ${alignment} >${alignment}.renamed.fa     
    """
}
process resolve_tree {
    input:
    path tree 
    output:
    path "resolved.tree"
    script:
    """
    gotree reroot midpoint -i $tree > resolved.tree
    """
}

process make_tree_constrained {
    input:
    path alignment 
    path partitions
    path topology
    output:
    path "${alignment}.treefile", emit: tree
    path "${alignment}.best_model.nex", emit: model
    path "${alignment}.iqtree", emit: iqtree
    script:
    """
    iqtree3 -s $alignment -m ${params.model} -t $topology --tree-fix -p $partitions --prefix ${alignment.getName()}
    """
}

process make_tree {
    input:
    path alignment 
    path partitions
    output:
    path "${alignment}.treefile", emit: tree
    path "${alignment}.best_model.nex", emit: model
    path "${alignment}.iqtree", emit: iqtree
    script:
    """
    iqtree3 -s $alignment -m ${params.model} --tree-fix -p $partitions --prefix ${alignment.getName()}
    """
}

process reformat_paml {
    input:
    tuple path(alignment), path(partitions)
    output:
    path "*.paml"
    script:
    """
    partition.py  $alignment $partitions > ${alignment.getName()}.paml
    """
}

process get_splits {
    input:
    path treefile
    output:
    path "${treefile}.splits"
    script:
    """
    gotree stats splits -i $treefile > ${treefile}.splits
    """
}

process get_outgroups {
    input:
    path splits
    output:
    path "split.*.txt"
    script:
    """
    get_outgroups.py $splits
    """
}

process reroot {
    input:
    tuple path(treefile), path(outgroup)
    output:
    path "*.tree"
    script:
    """
    gotree reroot outgroup  -l $outgroup -i ${treefile} > ${outgroup.getName().replaceFirst(~/\.[^\.]+$/, '')}.tree
    """
}

process cat_trees {
    input:
    path treefiles
    output:
    path "all.trees"
    script:
    """
    TREES=\$(echo $treefiles  | tr -cd ' \t' | wc -c );
    nT=\$(echo \${TREES}+1 | bc )
    FT=\$(echo $treefiles |cut -f1);
    TIPS=\$(gotree stats -i $treefiles | cut -f3 | tail -n1);
    echo \$TIPS \$nT > all.trees; 
    cat $treefiles >> all.trees
    """
}


process label_nodes{
    input:
    path treefiles
    output:
    path "labeled.trees"
    script:
    """
    gotree annotate -m 
    """
}


process paml{
    errorStrategy 'retry'
    maxRetries 3
    input:
    tuple path(ctl), path(alignment), path(trees)

    output:
    path "*.mlb"
    script:
    """
    cp ${trees} tmp.trees
    cp tmp.trees ./all.trees
    cp ${alignment} ./seqs.paml
    baseml $ctl;
    for F in *.mlb; do mv \${F} ${alignment.name.indexOf('.').with {it != -1 ? alignment.name[0..<it] : alignment.name}}.\${F}; done;
    """
}

process parse_paml{
    input:
    path mlbs

    output:
       path  "*.json"
    script:
    """
    processPAML.js ${mlbs} > ${params.pamlOut}.json
    """
}
//xargs to remove white space
process simuate_alignment{
    input:
        path tree
        path alignment
        path model
    output:
    path "*fa"
    script:
    """
    M=\$(cat ${model} | grep -A1 'charpartition' | tail -n1 | cut -d":" -f1| xargs)
    iqtree2 --alisim ${tree.name.indexOf('.').with {it != -1 ? tree.name[0..<it] : tree.name}} -t $tree  -m "\${M}" --length ${params.length}  --num-alignments ${params.n}  --seqtype DNA --out-format fasta
    """
}

process unroot {
    input:
    path tree
    output:
    path "unrooted.tree"
    script:
    """
    gotree unroot -i $tree> unrooted.tree
    """
}

process date_permutations {
    input:
        path clusters
        path tree
    output:
        path 'cor.tsv'
        path 'rms.tsv'
        path 'nonclustered_permutation_cor.tsv'
        path 'nonclustered_permutation_rms.tsv'
        path 'clustered_sampled_cor.tsv'
        path 'clustered_sampled_rms.tsv'
        path 'clustered_mean_cor.tsv'
        path 'clustered_mean_rms.tsv'
        path 'clustered_pruned_rms.tsv'
        path 'clustered_pruned_cor.tsv'
    script:
    """
    ln -s ${workflow.projectDir}/resources/rFunctions.R ./
    permutations.R ${clusters} ${tree} ${params.n}
    """
}
