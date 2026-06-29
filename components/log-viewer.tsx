"use client";

import React from "react";


function getLevel(line: string) {

    const lower =
        line.toLowerCase();


    if (
        lower.includes("error") ||
        lower.includes("exception") ||
        lower.includes("crash") ||
        lower.includes("fatal")
    )
        return "error";


    if (
        lower.includes("warn")
    )
        return "warn";


    if (
        lower.includes("debug")
    )
        return "debug";


    if (
        lower.includes("info")
    )
        return "info";


    return "normal";

}


export default function LogViewer({
                                      text
                                  }: {
    text: string
}) {


    const lines =
        text.split("\n");


    return (

        <div
            className="
rounded-xl
border-4
border-black
bg-black
shadow-[6px_6px_0_black]
overflow-hidden
"
        >


            <div
                className="
h-[calc(100vh-120px)]
max-h-none
overflow-auto
p-3
font-mono
text-sm
"
            >


                {
                    lines.map(
                        (line, index) => {


                            const level =
                                getLevel(line);


                            return (

                                <div
                                    key={index}
                                    className="
flex
min-w-max
"
                                >


<span
    className="
w-12
select-none
pr-3
text-right
text-zinc-600
"
>

{index + 1}

</span>


                                    <pre
                                        className={`
whitespace-pre
${
                                            level === "error"
                                                ?
                                                "text-red-400"
                                                :
                                                level === "warn"
                                                    ?
                                                    "text-yellow-300"
                                                    :
                                                    level === "debug"
                                                        ?
                                                        "text-purple-300"
                                                        :
                                                        level === "info"
                                                            ?
                                                            "text-blue-300"
                                                            :
                                                            "text-zinc-300"
                                        }
`}
                                    >

{line}

</pre>


                                </div>

                            )

                        })
                }


            </div>

        </div>

    )

}