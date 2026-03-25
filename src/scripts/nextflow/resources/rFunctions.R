library(ape)
library(lubridate)
library(tidyverse)
library(zoo)

parseTipDate <- function(s, sep = "\\|", order = -1) {
    parts <- strsplit(s, sep)[[1]]
    if (order == -1) {
        dateString <- parts[length(parts)]
    } else {
        dateString <- parts[order]
    }

    precision <- str_count(dateString, "-")
    if (precision == 1) {
        dateString <- paste(dateString, "-15", sep = "")
    } else if (precision == 0) {
        dateString <- paste(dateString, "-06-15", sep = "")
    }
    return(decimal_date(parse_date(dateString)))
}

getEdge<-function(tree,parent,child){
    return(which(tree$edge[,1]==parent & tree$edge[,2]==child))
}

tipDivergences <- function(tree) {
    paths <- nodepath(tree)
    return(map_dbl(nodepath(tree), \(nodes) sum(rollapply(nodes,width=2,\(twoNodes) tree$edge.length[getEdge(tree,twoNodes[1],twoNodes[2])])) ))
}
