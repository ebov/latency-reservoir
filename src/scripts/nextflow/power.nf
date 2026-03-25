
include {simuate_alignment; make_partition; reformat_paml;paml as paml_sr;paml as paml_dr;paml as paml_srdt;get_srdt_cltr;get_dr_cltr;get_sr_cltr;unroot;cat_trees;parse_paml} from './modules/processes'


workflow power{
    take:
        alignment
        tree  
        test_trees
        model
    main:    
    srdt_cltr = get_srdt_cltr()
    dr_cltr = get_dr_cltr()
    sr_cltr = get_sr_cltr()

    alignments = simuate_alignment(tree,alignment,model).flatten();

    dr_cltr.combine(alignments.combine(cat_trees(unroot(tree))))| paml_dr

    srdt_cltr.combine(alignments.combine(test_trees))| paml_srdt

    sr_cltr.combine(alignments.combine(test_trees))| paml_sr

    paml = paml_sr.out.concat(paml_srdt.out).concat(paml_dr.out).toList()
    parse_paml(paml)
}

workflow{
        alignment = Channel.fromPath(params.alignment)
        tree  = Channel.fromPath(params.tree)
        test_trees = Channel.fromPath(params.test_trees)
        model = Channel.fromPath(params.model)
        power(alignment,tree,test_trees,model)
}