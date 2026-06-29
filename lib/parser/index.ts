import {
    parseMinecraftLog
} from "./minecraft";


export function parseLog(
    content:string
) {

    return parseMinecraftLog(content);

}