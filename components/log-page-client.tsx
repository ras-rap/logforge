"use client";

import { useState } from "react";
import LogViewer, { type JumpSignal } from "@/components/log-viewer";
import AnalysisDrawer from "@/components/analysis-drawer";
import type { ParsedLog } from "@/lib/parser/types";

export default function LogPageClient({ text, parsed }: { text: string; parsed: ParsedLog }) {
    const [jumpSignal, setJumpSignal] = useState<JumpSignal | null>(null);

    function jumpToCrash() {
        const firstError = parsed.errors?.[0];
        if (!firstError) return;
        setJumpSignal({ line: firstError.line - 1, nonce: Date.now() });
    }

    return (
        <>
            <LogViewer text={text} jumpSignal={jumpSignal} onJumpToCrash={jumpToCrash} hasCrash={!!parsed.errors?.length} />
            <AnalysisDrawer data={parsed} onJumpToCrash={jumpToCrash} />
        </>
    );
}