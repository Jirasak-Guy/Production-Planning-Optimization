"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CubeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CogIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

const menuItems = [
  { name: "Home", href: "/", icon: HomeIcon },
  { name: "Orders", href: "/orders", icon: DocumentTextIcon },
  { name: "Products", href: "/products", icon: CubeIcon },
  { name: "Company Calendar", href: "/company-calendar", icon: CalendarIcon },
  { name: "Shifts", href: "/shifts", icon: ClockIcon },
  { name: "Resources", href: "/resources", icon: UserGroupIcon },
  { name: "Settings", href: "/settings", icon: CogIcon },
  { name: "Delivery", href: "/delivery", icon: TruckIcon },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-16 bg-gray-800 flex flex-col items-center py-4 gap-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${isActive
              ? "bg-red-600 text-white"
              : "text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            title={item.name}
          >
            <Icon className="w-6 h-6" />
          </Link>
        );
      })}
    </aside>
  );
}
