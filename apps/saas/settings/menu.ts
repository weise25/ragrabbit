import {
  Users,
  Settings,
  LayoutGrid,
  MessageSquare,
  MessageSquareCode,
  FileText,
  BookOpen,
} from "@repo/design/base/icons";
import type { MenuGroup } from "@repo/design/components/providers/config-provider";

export const sidebarMenu: MenuGroup[] = [
  {
    groupLabel: "",
    menus: [
      {
        href: "/chat",
        label: "Chat",
        icon: MessageSquare,
        submenus: [],
      },

      {
        href: "/dashboard/llms",
        label: "LLMs.txt",
        icon: FileText,
      },
    ],
  },

  {
    groupLabel: "RAG",
    menus: [
      {
        href: "/dashboard/indexing",
        label: "Indexing",
        icon: LayoutGrid,
      },
      {
        href: "/dashboard/chats",
        label: "Chats",
        icon: MessageSquare,
      },
      {
        href: "/dashboard/widget",
        label: "Configuration",
        icon: MessageSquareCode,
      },
      {
        href: "/dashboard/integration",
        label: "Integration",
        icon: BookOpen,
      },
    ],
  },
  {
    groupLabel: "Settings",
    menus: [
      {
        href: "/dashboard/user/profile",
        label: "User",
        icon: Users,
      },
      // Uncomment if needed:
      /*{
        href: "/user/account",
        label: "Account",
        icon: Settings,
      },*/
    ],
  },
];

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
