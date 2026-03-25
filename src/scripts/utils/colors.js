
import {scaleOrdinal} from "d3-scale"
export const grey= " rgb(171, 167, 155)"
export const black= "black" //" #585451"


export const menards1 = ["#f4dc2a","	#6b7a1f"," #071455","#6cabb4","	#f6d292","	#73878c","	#d43511"," #936310","#805882"]
export const clusterScale = scaleOrdinal(menards1).domain(["A","B","C","D","E","F","G","H","I"]);