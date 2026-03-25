import {timeParse} from "d3-time-format";
export function leapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

export function decimalToDate(decimal){
    const year = Math.trunc(decimal);
    const totalNumberOfDays = leapYear(year)? 366:365;
    const day = Math.round(((decimal-year)*totalNumberOfDays))+1;// (.0 is jan first)

    return timeParse("%Y-%j")(`${year}-${day}`)
}

export function dateGuesser(string){
    let dateBit = string.split("|").pop().replace(/'/g, "");
    const dashCount = (dateBit.match(/-/g) || []).length;
    if(dashCount==0){
        dateBit = dateBit+"-6-15"
    }else if(dashCount==1){
        dateBit = dateBit+"-15"
    }else if(dashCount!==2){
        throw Error(`tried to parse ${dateBit} as a date`)
    }
    // copilot added
    const parsedDate = timeParse("%Y-%m-%d")(dateBit);
    const year = parsedDate.getFullYear();
    const startOfYear = new Date(year, 0, 0);
    const diff = parsedDate - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const totalNumberOfDays = leapYear(year) ? 366 : 365;
    return year + (dayOfYear / totalNumberOfDays);

}