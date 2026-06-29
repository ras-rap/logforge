import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import {
    createLog
} from "@/lib/db";

import {
    parseLog
} from "@/lib/parser";


export async function POST(
    req:Request
){

    const body =
        await req.json();


    if(!body.content){

        return NextResponse.json(
            {
                error:"Missing content"
            },
            {
                status:400
            }
        );

    }


    const id =
        nanoid(10);



    const parsed =
        parseLog(
            body.content
        );



    createLog({

        id,

        filename:
            body.filename ??
            "pasted-log.txt",

        content:
        body.content,

        parsed:
            JSON.stringify(parsed),

        created_at:
            Date.now()

    });



    return NextResponse.json({
        id
    });

}