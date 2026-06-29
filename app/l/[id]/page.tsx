import {notFound} from "next/navigation";
import LogViewer from "@/components/log-viewer";

import {getLog} from "@/lib/db";


export default async function LogPage(
    {
        params
    }: {
        params: Promise<{
            id: string
        }>
    }) {


    const {
        id
    } = await params;


    const log =
        getLog(id);


    if (!log)
        notFound();


    const parsed =
        log.parsed
            ? JSON.parse(log.parsed)
            : null;


    const lines =
        log.content.split("\n");


    return (

        <main
            className="
h-screen
p-4
overflow-hidden
"
        >

            <div
                className="
relative
h-full
"
            >


                {/* LOG */}
                <div
                    className="
h-full
pr-6
"
                >

                    <h1
                        className="
text-3xl
font-black
mb-3
"
                    >
                        LogForge
                    </h1>


                    <LogViewer
                        text={log.content}
                    />


                </div>


                {parsed && (

                    <div
                        className="
fixed
right-0
top-1/2
-translate-y-1/2
z-50
w-80
translate-x-[calc(100%-32px)]
hover:translate-x-0
transition-transform
duration-200
ease-out
"
                    >

                        {/* Drawer */}
                        <div
                            className="
        rounded-l-xl
        border-4
        border-black
        bg-white
        shadow-[-6px_6px_0_black]
        p-4
        max-h-[80vh]
        overflow-y-auto
        "
                        >


                            <div
                                className="
            flex
            items-center
            gap-2
            mb-4
            "
                            >

                                <div
                                    className="
                absolute
                left-0
                -translate-x-full
                h-16
                w-8
                rounded-l-xl
                border-4
                border-r-0
                border-black
                bg-yellow-300
                flex
                items-center
                justify-center
                font-black
                "
                                >
                                    ❮
                                </div>


                                <h2 className="text-xl font-black">
                                    Analysis
                                </h2>


                                <span
                                    className="
                ml-auto
                bg-black
                text-white
                text-xs
                px-2
                py-1
                rounded
                font-bold
                "
                                >
                AUTO
            </span>

                            </div>


                            <div className="space-y-3">


                                <MiniInfo
                                    label="Loader"
                                    value={parsed.loader}
                                />


                                <MiniInfo
                                    label="Minecraft"
                                    value={
                                        parsed.minecraftVersion ??
                                        "Unknown"
                                    }
                                />


                                <MiniInfo
                                    label="Java"
                                    value={
                                        parsed.javaVersion ??
                                        "Unknown"
                                    }
                                />


                                <MiniInfo
                                    label="Crash"
                                    value={
                                        parsed.crashCause ??
                                        "Unknown"
                                    }
                                />


                                <h3 className="font-black pt-3">
                                    Suspected Mods
                                </h3>


                                <SuspectList
                                    suspects={
                                        parsed.suspectMods
                                    }
                                />


                            </div>


                        </div>

                    </div>

                )}


            </div>

        </main>

    );

}


function MiniInfo({
                      label,
                      value
                  }: {
    label: string;
    value: React.ReactNode;
}) {

    return (

        <div
            className="
border-b-2
border-black
pb-2
"
        >

            <p
                className="
text-xs
uppercase
font-bold
text-gray-500
"
            >
                {label}
            </p>


            <p
                className="
font-black
break-words
"
            >
                {value}
            </p>


        </div>

    )

}

function ModList({
                     mods
                 }: {
    mods: string[]
}) {


    const shown =
        mods.slice(0, 3);


    return (

        <div className="flex flex-wrap gap-2">

            {
                shown.map(
                    mod => (

                        <span
                            key={mod}
                            className="
rounded-full
border-2
border-black
bg-white
px-2
py-1
text-xs
"
                        >

{mod}

</span>

                    ))
            }


            {
                mods.length > 3 && (

                    <span
                        className="
rounded-full
border-2
border-black
bg-white
px-2
py-1
text-xs
"
                    >

+{mods.length - 3}

</span>

                )

            }

        </div>

    )

}

function SuspectList({
                         suspects
                     }: {
    suspects: {
        name: string;
        reason: string;
        confidence: number;
    }[]
}) {


    if (!suspects.length)
        return (
            <span>
                No suspects found
            </span>
        );


    return (

        <div className="space-y-3">

            {
                suspects.map(
                    (s, i) => (

                        <div
                            key={i}
                            className="
                    rounded-xl
                    border-4
                    border-black
                    bg-red-200
                    p-3
                    "
                        >

                            <div
                                className="
                    flex
                    justify-between
                    font-black
                    "
                            >

                    <span>
                    ⚠ {s.name}
                    </span>


                                <span>
                    {s.confidence}%
                    </span>

                            </div>


                            <p
                                className="
                    text-sm
                    "
                            >

                                {s.reason}

                            </p>


                        </div>

                    ))
            }

        </div>

    )

}