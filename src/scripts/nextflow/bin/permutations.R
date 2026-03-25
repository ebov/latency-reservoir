#!/usr/bin/env Rscript

library(ape)
library(lubridate)
library(tidyverse)
library(RcppAlgos)
library(jsonlite)
# - also function file so it's present in the working directory
source("rFunctions.R")
## Inputs
# - clusters csv
# - treefile
# - n permutations
# - prefix

## outputs
# - cor.tsv
# - rms.tsv
# - nonclustered_permutation_cor.tsv
# - nonclustered_permutation_rms.tsv
# - clustered_sampled_cor.tsv
# - clustered_sampled_rms.tsv
# - clustered_mean_cor.tsv
# - clustered_mean_rms.tsv
# - clustered_pruned_rms.tsv
# - clustered_pruned_cor.tsv

# Read command line arguments
args <- commandArgs(trailingOnly = TRUE)

# Check if all arguments are provided
if (length(args) != 3) {
    stop("Please provide all three arguments: treefile, and n permutations,and prefix")
}

# Assign arguments to variables
treefile <- args[1]
n <- as.integer(args[2])
prefix <- args[3]
#DEBUG
# n<-1000
# treefile<-"./set11_gp_HKY.treefile"

tree <- read.tree(treefile)


tipDates <- map_dbl(tree$tip.label, \(x) parseTipDate(x))


## non clustered test
rmsTree <- rtt(tree, tipDates)

dataCor <- cor.test(tipDates, tipDivergences(rmsTree))

dataLL <- lm(tipDivergences(rmsTree) ~ tipDates)

exhaustive <- FALSE
if (factorial(length(tipDates)) < n) {
    permutations <- permuteGeneral(length(tipDates))
    permutations<-permutations[-1,]
} else {
    permutations <- permuteSample(tipDates, n = n, m = length(tipDates))
}

# A function that takes in a tree, a tip dates vector and objective
# and returns a dataframe with stats about the root to tip correlation
rttData <- function(dates, tree, objective) {
    rootedTree <- rtt(tree, dates, objective = objective, opt.tol = 1e-20)
    divergences <- tipDivergences(rootedTree)
    if (length(divergences) < length(dates)) {
        return(tibble(r = NA, rate = NA, r2 = NA, rms = NA))
    }
    t <- cor.test(dates, divergences)
    tlm <- lm(divergences ~ dates)
    t_sum <- summary(tlm)
    return(tibble(r = t$estimate, rate = tlm$coefficients[2], r2 = t_sum$adj.r.squared, rms = mean(t_sum$residuals^2)))
}
## Observed data

d_cor <- rttData(tipDates, tree, "correlation")
write_tsv(d_cor, paste0(prefix, ".obs.cor.tsv"))
rootedTreeCor <- rtt(tree, tipDates, objective = "correlation", opt.tol = 1e-20)

d_rms <- rttData(tipDates, tree, "rms")
write_tsv(d_rms, paste0(prefix, ".obs.rms.tsv"))
rootedTreeRMS <- rtt(tree, tipDates, objective = "rms", opt.tol = 1e-20)


# no root length so need to remove the NA ape puts there
cat(paste(str_replace(write.tree(rootedTreeCor), "NA;", ";"), str_replace(write.tree(rootedTreeRMS), "NA;", ";"), sep = "\n"), file = paste0(prefix, ".trees"))

#---------------- permutations --------------------#
correlationPermutation <- map_df(array_branch(permutations, 1), \(x) rttData(x, tree, "correlation"))
write_tsv(correlationPermutation, paste0(prefix, ".cor.tsv"))


rmsPermutation <- map_df(array_branch(permutations, 1), \(x) rttData(x, tree, "rms"))
write_tsv(rmsPermutation, paste0(prefix, ".rms.tsv"))

