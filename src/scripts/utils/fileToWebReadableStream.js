import fs from "node:fs";
import { Readable } from "stream";

// Convert Node.js stream to native Web ReadableStream

export function fileToWebReadableStream(filePath) {
    const nodeStream = fs.createReadStream(filePath);
    return Readable.toWeb(nodeStream);
}
