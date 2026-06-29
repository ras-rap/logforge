import {
    Loader,
    ParsedLog,
    LogEntry, SuspectMod
} from "./types";


function detectLoader(log:string):Loader {

    const lower = log.toLowerCase();


    if(lower.includes("fabric loader"))
        return "fabric";

    if(lower.includes("neoforge"))
        return "neoforge";

    if(
        lower.includes("forge") ||
        lower.includes("fml")
    )
        return "forge";

    if(lower.includes("quilt"))
        return "quilt";

    if(lower.includes("purpur"))
        return "purpur";

    if(lower.includes("paper"))
        return "paper";

    if(lower.includes("spigot"))
        return "spigot";


    return "unknown";
}




function detectVersion(
    log:string
){

    const patterns = [

        /Minecraft\s*Version[:\s]+([0-9.]+)/i,

        /minecraft@([0-9.]+)/i,

        /Minecraft\s+([0-9]+\.[0-9.]+)/i,

        /mc_version[=: ]+([0-9.]+)/i

    ];


    for(const pattern of patterns){

        const match =
            log.match(pattern);


        if(match)
            return match[1];

    }


    return undefined;
}




function detectJava(
    log:string
){

    const match =
        log.match(
            /Java Version[:\s]+(.+)/i
        );


    return match?.[1]?.trim();

}




function detectCause(
    log:string
){

    const lines =
        log.split("\n");


    let causedBy = "";



    for(
        let i=0;
        i<lines.length;
        i++
    ){

        const line =
            lines[i];


        if(
            line.includes("Caused by:")
        ){

            causedBy =
                line
                    .replace(
                        "Caused by:",
                        ""
                    )
                    .trim();

        }

    }


    if(causedBy)
        return causedBy;



    const exception =
        log.match(
            /([\w.$]+Exception)/
        );


    return exception?.[1];

}




function detectMods(
    log:string
){

    const mods = new Set<string>();

    const lines =
        log.split("\n");


    const blacklist = new Set([
        "minecraft",
        "forge",
        "java",
        "client",
        "server",
        "common",
        "loader",
        "mod",
        "mods",
        "version",
        "environment",
        "mixin",
        "mixinextras",
        "mixinsquared",
        "connector",
        "fabric"
    ]);



    for(const line of lines){

        const clean =
            line
                .trim()
                .replace(
                    /^[-| ]+/,
                    ""
                );



        /*
          Mod list entries:

          - hardcore_torches
          |-- ferritecore
        */

        if(
            /^[a-z0-9_ -]{3,50}$/i.test(clean)
        ){

            const id =
                clean
                    .split(" ")[0]
                    .toLowerCase();



            if(
                !blacklist.has(id) &&
                !id.includes(".")
            ){

                mods.add(id);

            }

        }



        /*
          jar files

          farmersdelight-1.20.1.jar
        */

        const jar =
            clean.match(
                /^([a-z0-9_-]{3,50})-\d/i
            );


        if(jar){

            const id =
                jar[1]
                    .toLowerCase();


            if(
                !blacklist.has(id)
            ){

                mods.add(id);

            }

        }


        /*
          modid=
        */

        const modid =
            clean.match(
                /modid[=: ]+([a-z0-9_-]+)/i
            );


        if(modid){

            mods.add(
                modid[1]
                    .toLowerCase()
            );

        }

    }



    return [
        ...mods
    ];

}




function isBadModId(
    id:string
){

    const blacklist = [

        "minecraft",
        "forge",
        "java",
        "client",
        "server",

        "mixin",
        "mixinextras",
        "mixinsquared",

        "json",
        "gson",

        "connector",

        "fmlearlywindow",
        "modlauncher",

        "net",
        "com",

        "org"

    ];


    return blacklist.includes(id);

}

function detectSuspectMods(
    log:string,
    mods:string[]
){

    const suspects = new Map<string, SuspectMod & { score:number }>();


    const lower =
        log.toLowerCase();


    const ignored = new Set([
        "client",
        "server",
        "common",
        "forge",
        "minecraft",
        "java",
        "connector",
        "20",
        "1",
    ]);



    const important =
        log
            .split("\n")
            .slice(-150)
            .join("\n")
            .toLowerCase();



    for(const mod of mods){

        const id =
            mod.toLowerCase();


        if(
            ignored.has(id)
        ){
            continue;
        }



        let score = 0;

        let reason =
            "";



        if(
            important.includes(id)
        ){

            score += 10;

            reason =
                "Referenced in crash";

        }



        if(
            important.includes(
                "mixin apply failed"
            )
            &&
            important.includes(id)
        ){

            score += 15;

            reason =
                "Mixin compatibility issue";

        }



        if(
            (
                important.includes(
                    "classnotfoundexception"
                )
                ||
                important.includes(
                    "noclassdeffounderror"
                )
            )
            &&
            important.includes(id)
        ){

            score += 15;

            reason =
                "Missing class reference";

        }



        if(score > 0){

            suspects.set(
                id,
                {
                    name: mod,
                    reason,
                    score,
                    confidence:
                        Math.min(
                            score * 10,
                            100
                        )
                }
            );

        }

    }




    // known compatibility suspects
    for(
        const word of [
        "hardcore_torches",
        "farmersdelight"
    ]
        ){

        if(
            lower.includes(word)
        ){

            suspects.set(
                word,
                {
                    name: word,
                    reason:
                        "Referenced in crash log",
                    score:20,
                    confidence:90
                }
            );

        }

    }




    return [
        ...suspects.values()
    ]
        .sort(
            (a,b)=>
                b.score-a.score
        )
        .slice(0,5)
        .map(
            x=>({
                name:x.name,
                reason:x.reason,
                confidence:x.confidence
            })
        );

}




function collectMessages(
    log:string
){

    const errors:LogEntry[]=[];
    const warnings:LogEntry[]=[];


    log.split("\n")
        .forEach(
            (line,index)=>{


                const lower =
                    line.toLowerCase();



                if(
                    lower.includes("error") ||
                    lower.includes("exception") ||
                    lower.includes("crash")
                ){

                    errors.push({
                        level:"error",
                        line:index+1,
                        text:line
                    });

                }



                if(
                    lower.includes("warn")
                ){

                    warnings.push({
                        level:"warn",
                        line:index+1,
                        text:line
                    });

                }

            }
        );


    return {
        errors,
        warnings
    };

}




function collectStackTrace(
    log:string
){

    return log
        .split("\n")
        .filter(
            line =>
                line.trim()
                    .startsWith("at ")
        )
        .slice(0,50);

}





export function parseMinecraftLog(
    raw:string
):ParsedLog {


    const messages =
        collectMessages(raw);


    const mods =
        detectMods(raw);


    return {

        loader:
            detectLoader(raw),



        minecraftVersion:
            detectVersion(raw),


        javaVersion:
            detectJava(raw),


        crashCause:
            detectCause(raw),


        mods,

        suspectMods:
            detectSuspectMods(
                raw,
                mods

            ),


        errors:
        messages.errors,


        warnings:
        messages.warnings,


        stackTrace:
            collectStackTrace(raw),


        importantLines:
            [
                ...messages.errors,
                ...messages.warnings
            ]
                .map(x=>x.line),


        raw

    };

}