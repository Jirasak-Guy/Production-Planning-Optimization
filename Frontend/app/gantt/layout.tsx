export default function GanttLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // No Header for Gantt page - it has its own header
    return <>{children}</>;
}
