import * as xmljson from 'xml-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {parseArgs} from "node:util";

const {
    values: {dir,stem}
  } = parseArgs({
    options: {dir: {type: "string"},stem: {type: "string"}}
  });

const filePath = join(`src/analyses/BEAST/${dir}`, `${stem}.xml`);
const xml = await readFile(filePath, 'utf-8');

process.stdout.write(xmljson.xml2json(xml,{compact:true}));