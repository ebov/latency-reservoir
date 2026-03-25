#!/bin/bash
# for word in "$@"; do echo "$word"; done
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --dir=*) DIR="${1#*=}" ;;
    --stem=*) STEM="${1#*=}" ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

# echo "HELLO"
logcombiner -trees -burnin 10000000 -resample 100000 ./src/analyses/BEAST/${DIR}/*_${STEM}.trees ./src/analyses/BEAST/${DIR}/${STEM}.combined.trees  >./src/notebook/05.BEASTModel/providerLogs/${DIR}-${STEM}.combinedTrees.log 

cat ./src/analyses/BEAST/${DIR}/${STEM}.combined.trees
