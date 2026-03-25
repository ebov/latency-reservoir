// See https://observablehq.com/framework/config for documentation.
export default {
  // The project’s title; used in the sidebar and webpage titles.
  title: "Ebola latency",

  // The pages and sections in the sidebar. If you don’t specify this option,
  // all pages will be listed in alphabetical order. Listing pages explicitly
  // lets you organize them into sections and have unlisted pages.
  pages: [
    {
      name: "Current view",
      path:"/notebook/01.temporalSignalCheck/index",
      pages: [

        {name:"PAML", path:"/notebook/01.temporalSignalCheck/paml"},
        {name:"PAML- between cluster", path:"/notebook/01.temporalSignalCheck/paml-cluster"},
        
      ]
    },
    {
      name:"A new root position",
      path:"/notebook/02.newRoot/index",
      pager:"newRoot",
      pages:[
        // {name:"Root to tip permutations", path:"/notebook/02.newRoot/permutations"},
        {name:"PAML", path:"/notebook/02.newRoot/paml"},
        {name:"PAML- between cluster", path:"/notebook/02.newRoot/paml-cluster"},
      ]
    },{
      name:"Characterizing the rate heterogeneity",
      path:"/notebook/03.LocalClockModels/index",
      pages:[
        {name:"PAML", path:"/notebook/03.LocalClockModels/paml"},
        {name:"Rate exploration",path:"/notebook/01.temporalSignalCheck/sensitivity"}

      ]
    },
    {
      name:"A mechanistic Rate model",
      path:"/notebook/04.LatencyModel/index",
      pages:
        [
          {name:"Sericola Discrete Model", path:"/notebook/04.LatencyModel/sericola-2000"},
          {name:"Sericola Continuous Model", path:"/notebook/04.LatencyModel/sericola-2000.cont"},
          {name:"Revisiting the local model", path:"/notebook/04.LatencyModel/sericola-local.clock"},
          {name:"Model Exploration", path:"/notebook/04.LatencyModel/expectations"},
          {name:"BEAST implementations", path:"/notebook/04.LatencyModel/beast-implementation"},
        ]
      
    },
        {
      name:"BEAST analyses", //path:"/notebook/05.BEASTModel/20250716",
      pages:[
       {name:"Strict clock + latency", path:"/notebook/05.BEASTModel/sc.latency_processedBeastAnalysis"},
       {name:"Strict clock + latency no Makona", path:"/notebook/05.BEASTModel/sc.latency.noMakona_processedBeastAnalysis"},
       {name:"Strict clock + latency - constrained root", path:"/notebook/05.BEASTModel/sc.latency.constrained_processedBeastAnalysis"},

      ]
    },
        {
      name:"Assessing geographic spread", //path:"/notebook/05.BEASTModel/20250716",
      pages:[
       {name:"Strict clock + latency", path:"/notebook/05.BEASTModel/sc.latency.bd_phylogeographicAnalysis"},
       {name:"Strict clock + latency no Makona", path:"/notebook/05.BEASTModel/sc.latency.noMakona.bd_phylogeographicAnalysis"},
      ]
    },
        {
      name:"BEAST analyses - No Kasai", //path:"/notebook/05.BEASTModel/20250716",
      open:"false",
      pages:[
       {name:"Strict clock + latency", path:"/notebook/05.BEASTModel/sc.latency.18_processedBeastAnalysis"},
       {name:"Strict clock + latency no Makona", path:"/notebook/05.BEASTModel/sc.latency.noMakona.18_processedBeastAnalysis"},
      ]
    },
    {
      name:"BEAST analyses - prior sensitivity", //path:"/notebook/05.BEASTModel/20250716",
      open:"false",
      pages:[
      {name:"Strict clock + latency (prior)", path:"/notebook/05.BEASTModel/sc.latency.prior_processedBeastAnalysis"},
      {name:"Strict clock + latency (2X root height)", path:"/notebook/05.BEASTModel/sc.latency-rh2_processedBeastAnalysis"},
      {name:"Strict clock + latency no Makona (2X root height)", path:"/notebook/05.BEASTModel/sc.latency.noMakona-rh2_processedBeastAnalysis"},
      {name:"Strict clock + latency (1/2X root height)", path:"/notebook/05.BEASTModel/sc.latency-rh0.5_processedBeastAnalysis"},
      {name:"Strict clock + latency no Makona (1/2X root height)", path:"/notebook/05.BEASTModel/sc.latency.noMakona-rh0.5_processedBeastAnalysis"},
      ]
    }
  ],

  dynamicPaths: [
    "/notebook/05.BEASTModel/sc.latency_processedBeastAnalysis",
    "/notebook/05.BEASTModel/sc.latency_phylogeographicAnalysis"
  ],


  // Some additional configuration options and their defaults:
  // theme: "default", // try "light", "dark", "slate", etc.
  // header: "", // what to show in the header (HTML)
  // footer: "Built with Observable.", // what to show in the footer (HTML)
  // toc: true, // whether to show the table of contents
  pager: false, // whether to show previous & next links in the footer
  root: "src", // path to the source root for preview
  // output: "dist", // path to the output root for build
  // search: true, // activate search
};
