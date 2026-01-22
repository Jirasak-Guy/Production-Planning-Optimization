"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import SideNav from "./sidenav";

export default function ClientLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();

    // Hide default header on Gantt page (it has its own header)
    const hideHeader = pathname === "/gantt" || pathname.startsWith("/gantt/");

    return (
        <div className="flex h-screen">
            <SideNav />
            <div className="flex flex-col flex-1">
                {!hideHeader && <Header />}
                <main className={`flex-1 overflow-hidden ${hideHeader ? "" : "bg-gray-100"}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}
