

import * as d3 from "d3";


// TODO install these!!!
import  gamma  from "@stdlib/stats-base-dists-gamma";
import  binomial  from "@stdlib/stats-base-dists-binomial";

import  poisson  from "@stdlib/stats-base-dists-poisson";


export function sericolaDensity(Q,branchLength,propLatent,tol=1e-10){
  const s = propLatent*branchLength;
  const dim=Math.sqrt(Q.length)
  const lambda = d3.max(
    Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
  )
  const P = Q.map((d, i) => identity[i] + d / lambda);
  const maxN  = poisson.quantile(1-tol, lambda * branchLength);

  const conditional = d3.sum(
    d3.range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, branchLength * lambda))
  );
  const {cdfWt,pdfWt} = getDensities(Q,maxN,branchLength)
  const density =  pdfWt(s)[3]/conditional; // if s===0 this calls the cdf
  if(propLatent>0){
    return density*branchLength;
  }else{
    return density;
  }
}


export function getDensities(Q,maxN,time){
    const dim = Math.sqrt(Q.length)
    const lambda = d3.max(
        Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
      )
      const identity = [1, 0, 0, 1];
      const P = Q.map((d, i) => identity[i] + d / lambda);
      const F = getF(P);
      const f = get_f(F)
      const jumpProbz = d3
      .range(maxN + 1)
      .map((d) => poisson.pmf(d, time * lambda));



     function cdfWt(s) {
        function kLoop(n, s) {
          let sum = new Array(dim * dim).fill(0);
      
          for (let k = 0; k < n + 1; k++) {
            const bin = binomial.pmf(k, n, s / time);
            sum = plus(sum, scalar(bin, F(n, k)));
          }
          return sum;
        }
      
        const sums = jumpProbz.map((d, n) => scalar(d, kLoop(n, s)));
        let out = sums[0];
        for (let i = 1; i < sums.length; i++) {
          out = plus(out, sums[i]);
        }
        return out;
      }

      function pdfWt(s){
          if (s === 0) {
            return cdfWt(0);
          }
          function kLoop(n, s) {
            let sum = new Array(dim * dim).fill(0);
        
            for (let k = 0; k < n + 1; k++) {
              const bin =  binomial.pmf(k, n, s / time);
              sum = plus(sum, scalar(bin, f(n + 1, k + 1)));
            }
            return sum;
          }
        
          const sums = jumpProbz.map((d, n) => scalar(d, kLoop(n, s)));
          // console.log(sums);
          let out = sums[0];
          for (let i = 1; i < sums.length; i++) {
            out = plus(out, sums[i]);
          }
          return scalar(lambda, out);
        }
      return {cdfWt,pdfWt}
}



export const identity = [1, 0, 0, 1];

  
export const idxFactory = (Q) =>  (i, j) => i * Math.sqrt(Q.length) + j
  
export function getF(P) {
    const cache = [];
    const idx = idxFactory(P);
    function F(n, k) {
      if (cache[n] === undefined || cache[n][k] === undefined) {
        if (cache[n] === undefined) {
          cache[n] = [];
        }
        if (k >= n + 1) {
          // if k is greater we are garuentted to be less than n and it's just about ending in the state
          cache[n][k] = exp(P, n); //Pn;
        } else if (k === 0) {
          cache[n][k] = [0, 0, 0, P[idx(1, 1)] ** n];
        } else {
          const left = x([P[idx(0, 0)], P[idx(0, 1)], 0, 0], F(n - 1, k - 1));
          const right = x([0, 0, P[idx(1, 0)], P[idx(1, 1)]], F(n - 1, k));
          cache[n][k] = plus(left, right);
        }
      }
      return cache[n][k];
    }
    return F;
  }



export function get_f(F){
 return function f(n, k) {
  if (k === 0) {
    return F(n, 0);
  }
  return minus(F(n, k), F(n, k - 1));
}
}

// Matrix functions



export function scalar(s, A) {
    return A.map((d) => d * s);
  }
export function exp(A, n) {
    // not efficient
    let a = identity;
  
    for (let i = 0; i < n; i++) {
      a = x(a, A);
    }
  
    return a;
  }
export function minus(A, B) {
    return A.map((a, i) => a - B[i]);
  }
export function plus(A, B) {
    // assume Nan is 0
    // return A.map((a, i) => (isNaN(a) ? 0 : a) + (isNaN(B[i]) ? 0 : B[i]));
    return A.map((a, i) => a + B[i]);
  }
export function x(A, B) {
    //all square matrixes
    const dim = Math.sqrt(A.length);
    const idx = idxFactory(A)
    const product = new Array(dim * dim).fill(0);
    for (let i = 0; i < dim; i++) {
      // rows of a
      for (let j = 0; j < dim; j++) {
        for (let k = 0; k < dim; k++) {
          product[idx(i, j)] += A[idx(i, k)] * B[idx(k, j)];
        }
      }
    }
    return product;
  }