import { Users, Settings, LayoutGrid, MessageSquare, MessageSquareCode } from "@repo/design/base/icons";
import type { MenuGroup } from "@repo/design/components/providers/config-provider";

export const headerMenu = [
  {
    href: "/user/profile",
    label: "Profile",
    icon: Users,
  },
  {
    href: "/user/settings",
    label: "Settings",
    icon: Settings,
  },
];
