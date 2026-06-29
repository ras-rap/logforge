import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <div className="space-y-6 text-center">
                <div>
                    <h1 className="text-5xl font-black">
                        404
                    </h1>

                    <p className="mt-2 text-muted-foreground">
                        That log doesn&#39;t exist.
                    </p>
                </div>

                <Link
                    href="/"
                    className="inline-flex rounded-md border px-4 py-2 font-medium transition hover:bg-accent"
                >
                    Go Home
                </Link>
            </div>
        </main>
    );
}