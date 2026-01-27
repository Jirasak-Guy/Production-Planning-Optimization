import Header from "@/app/components/Header";

export default function GanttLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col h-screen">
            <Header />
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
