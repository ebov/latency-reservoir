
all: rooting-figures future-figures figures-tables rtt-figure map-figure tables phyloGeo-figures latent-durations
rooting-figures: doc/figures/allRoots.noMakona.png doc/figures/allRoots.noMakona-rh2.png doc/figures/allRoots.noMakona-rh0.5.png doc/figures/allRoots.png doc/figures/rootFigure.noMakona.png doc/figures/rootFigure.png

future-figures: doc/figures/futureFigure.withKasai.png doc/figures/futureFigure.png

figures-tables: rooting-figures doc/figures/mapFigure.png doc/figures/rtt.png doc/tables/table1.tex future-figures

rtt-figure: doc/figures/rtt.png

map-figure: doc/figures/mapFigure.png

tables: doc/tables/table1.tex

phyloGeo-figures:  doc/figures/phylogeo.png doc/figures/phylogeo-sup.png


latent-durations: results/beast/processed/sc.latency.LatentDuration.tsv results/beast/processed/sc.latency.noMakona.LatentDuration.tsv


doc/figures/rootFigure.png: results/remote/fetched.txt scripts/figures/compareRootingsFig.js results/beast/processed/sc.latency.lineages.json
	scripts/figures/compareRootingsFig.js \
		results/remote/sc.latency.combined.log \
		results/remote/sc.latency.json \
		doc/figures/rootFigure \
		0 3 \
		--size medium \
		--height 10 \
		--lineages results/beast/processed/sc.latency.lineages.json

doc/figures/rootFigure.noMakona.png: results/remote/fetched.txt scripts/figures/compareRootingsFig.js ./results/beast/processed/sc.latency.noMakona.lineages.json
	scripts/figures/compareRootingsFig.js \
		results/remote/sc.latency.noMakona.combined.log \
		results/remote/sc.latency.noMakona.json \
		doc/figures/rootFigure.noMakona \
		0 \
		--size medium \
		--height 7 \
		--lineages ./results/beast/processed/sc.latency.noMakona.lineages.json

doc/figures/futureFigure.png:scripts/figures/future.figure.js results/beast/processed/sc.latency.noMakona.18.csv
	scripts/figures/future.figure.js \
	results/beast/processed/sc.latency.noMakona.18.csv \
	doc/figures/futureFigure\
		--size medium -h 6

doc/figures/futureFigure.withKasai.png:scripts/figures/future.figure.js results/beast/processed/sc.latency.noMakona.csv 
	scripts/figures/future.figure.js \
		results/beast/processed/sc.latency.noMakona.csv \
		doc/figures/futureFigure.withKasai \
		--size medium -h 6

# covers table2 as well 
doc/tables/table1.tex : results/tipDater/set8_best.json  # all these are made by same nextflow run
	scripts/figures/pamlTable.js \
	results/tipDater/ \
	doc/tables/

# covers genomes.txt as well
# These are now made by hand and live in the docs directory
# doc/tables/outbreaks.tex :scripts/figures/outbreakTable.js
# 	cd scripts/figures/ && node outbreakTable.js

doc/figures/rtt.png:scripts/figures/rttFigure.js results/iqtree/set19_best.treefile
	scripts/figures/rttFigure.js \
	results/iqtree/set19_best.treefile \
	doc/figures/rtt

./results/beast/processed/sc.latency.noMakona.bd.mcc.nw:
	scripts/nextflow/bin/mcc.js \
	./results/remote/sc.latency.noMakona.bd.combined.trees \
	> ./results/beast/processed/sc.latency.noMakona.bd.mcc.nw

doc/figures/phylogeo.png: scripts/figures/phylogeoFig.js ./results/beast/processed/sc.latency.noMakona.bd.mcc.nw 
	scripts/figures/phylogeoFig.js \
		./results/beast/processed/sc.latency.noMakona.bd.mcc.nw  \
		doc/figures/phyloGeo


# ------------------------- supplements --------------------------------------------

doc/figures/mapFigure.png : results/iqtree/set19_best.treefile scripts/figures/mapAndTreeFigure.js 
	scripts/figures/mapAndTreeFigure.js \
	 results/iqtree/set19_best.treefile \
	 doc/figures/mapFigure \
	 --size medium \
	 -h 6

doc/figures/allRoots.png: results/remote/fetched.txt scripts/figures/compareRootingsFig.js
	scripts/figures/compareRootingsFig.js \
		results/remote/sc.latency.combined.log \
		results/remote/sc.latency.json \
		doc/figures/allRoots \
		--size medium \
		--height 16

doc/figures/allRoots.noMakona.png: results/remote/fetched.txt scripts/figures/compareRootingsFig.js
	scripts/figures/compareRootingsFig.js \
		results/remote/sc.latency.noMakona.combined.log \
		results/remote/sc.latency.noMakona.json \
		doc/figures/allRoots.noMakona \
		--size medium -h 12


doc/figures/allRoots.noMakona-rh0.5.png: results/remote/fetched.txt scripts/figures/compareRootingsFig.js
	scripts/figures/compareRootingsFig.js \
		results/remote/sc.latency.noMakona-rh0.5.combined.log \
		results/remote/sc.latency.noMakona-rh0.5.json \
		doc/figures/allRoots.noMakona-rh0.5 \
		--size medium -h 12

doc/figures/allRoots.noMakona-rh2.png: results/remote/fetched.txt scripts/figures/compareRootingsFig.js
	scripts/figures/compareRootingsFig.js \
		results/remote/sc.latency.noMakona-rh2.combined.log \
		results/remote/sc.latency.noMakona-rh2.json \
		doc/figures/allRoots.noMakona-rh2 \
		--size medium -h 12



doc/figures/rtt-cds3_ig.png:scripts/figures/rttFigure.js results/iqtree/set19_cds3_ig.treefile
	scripts/figures/rttFigure.js \
	results/iqtree/set19_cds3_ig.treefile \
	doc/figures/rtt-cds3_ig



#----------------- Analyses ----------
./results/beast/processed/sc.latency.noMakona.lineages.json: results/remote/fetched.txt
	scripts/utils/ltt.js  \
	./results/remote/sc.latency.noMakona.combined.trees \
	> ./results/beast/processed/sc.latency.noMakona.lineages.json

./results/beast/processed/sc.latency.lineages.json: results/remote/fetched.txt
	scripts/utils/ltt.js  \
	./results/remote/sc.latency.combined.trees \
	> ./results/beast/processed/sc.latency.lineages.json



./results/beast/processed/sc.latency.bd.mcc.nw: results/remote/fetched.txt
	scripts/nextflow/bin/mcc.js \
	./results/remote/sc.latency.bd.combined.trees \
	> ./results/beast/processed/sc.latency.bd.mcc.nw

doc/figures/phylogeo-sup.png: scripts/figures/phylogeoFig.js ./results/beast/processed/sc.latency.bd.mcc.nw 
	scripts/figures/phylogeoFig.js \
		./results/beast/processed/sc.latency.bd.mcc.nw  \
		doc/figures/phyloGeo-full \
		-p full


# get latent stats
results/beast/processed/sc.latency.LatentDuration.tsv:
	scripts/utils/getLatentStatsFromTrees.js \
	results/remote/sc.latency.combined.trees \
	 > results/beast/processed/sc.latency.LatentDuration.tsv
results/beast/processed/sc.latency.noMakona.LatentDuration.tsv:
	scripts/utils/getLatentStatsFromTrees.js \
	results/remote/sc.latency.noMakona.combined.trees \
	 > results/beast/processed/sc.latency.noMakona.LatentDuration.tsv
