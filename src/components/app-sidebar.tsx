import {
  Home,
  Inbox,
  Settings,
  HelpCircle,
  Store,
  BookOpen,
  Sparkles,
  CircuitBoard,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { HelpDialog } from "./HelpDialog"; // Import the new dialog
import { SettingsList } from "./SettingsList";
import { LibraryList } from "./LibraryList";
import { SkillsList } from "./SkillsList";
import { useTranslation } from "react-i18next";

// Menu items.
const items = [
  {
    id: "apps",
    title: "Apps",
    to: "/",
    icon: Home,
  },
  {
    id: "chat",
    title: "Chat",
    to: "/chat",
    icon: Inbox,
  },
  {
    id: "settings",
    title: "Settings",
    to: "/settings",
    icon: Settings,
  },
  {
    id: "library",
    title: "Library",
    to: "/library",
    icon: BookOpen,
  },
  {
    id: "skills",
    title: "Skills",
    to: "/skills",
    icon: Sparkles,
  },
  {
    id: "minerva",
    title: "Minerva",
    to: "/minerva",
    icon: CircuitBoard,
  },
  {
    id: "hub",
    title: "Hub",
    to: "/hub",
    icon: Store,
  },
] as const;

const selectedItemByHoverState = {
  "start-hover:app": "Apps",
  "start-hover:chat": "Chat",
  "start-hover:settings": "Settings",
  "start-hover:library": "Library",
  "start-hover:skills": "Skills",
  "start-hover:minerva": "Minerva",
} as const;

const hoverStateByItemId = {
  apps: "start-hover:app",
  chat: "start-hover:chat",
  settings: "start-hover:settings",
  library: "start-hover:library",
  skills: "start-hover:skills",
  minerva: "start-hover:minerva",
  hub: undefined,
} as const;

// Hover state types
type HoverState =
  | "start-hover:app"
  | "start-hover:chat"
  | "start-hover:settings"
  | "start-hover:library"
  | "start-hover:skills"
  | "start-hover:minerva"
  | "clear-hover"
  | "no-hover";

export function AppSidebar() {
  const { t } = useTranslation("common");
  const { state, toggleSidebar } = useSidebar(); // retrieve current sidebar state
  const [hoverState, setHoverState] = useState<HoverState>("no-hover");
  const expandedByHover = useRef(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false); // State for dialog
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);

  useEffect(() => {
    if (hoverState.startsWith("start-hover") && state === "collapsed") {
      expandedByHover.current = true;
      toggleSidebar();
    }
    if (
      hoverState === "clear-hover" &&
      state === "expanded" &&
      expandedByHover.current &&
      !isDropdownOpen
    ) {
      toggleSidebar();
      expandedByHover.current = false;
      setHoverState("no-hover");
    }
  }, [hoverState, toggleSidebar, state, setHoverState, isDropdownOpen]);

  const routerState = useRouterState();
  const isAppRoute =
    routerState.location.pathname === "/" ||
    routerState.location.pathname.startsWith("/app-details");
  const isChatRoute = routerState.location.pathname === "/chat";
  const isSettingsRoute = routerState.location.pathname.startsWith("/settings");
  const isLibraryRoute = routerState.location.pathname.startsWith("/library");
  const isSkillsRoute = routerState.location.pathname.startsWith("/skills");
  const isMinervaRoute = routerState.location.pathname.startsWith("/minerva");

  let selectedItem: string | null = null;
  if (hoverState in selectedItemByHoverState) {
    selectedItem =
      selectedItemByHoverState[
        hoverState as keyof typeof selectedItemByHoverState
      ];
  } else if (state === "expanded") {
    if (isAppRoute) {
      selectedItem = "Apps";
    } else if (isChatRoute) {
      selectedItem = "Chat";
    } else if (isSettingsRoute) {
      selectedItem = "Settings";
    } else if (isLibraryRoute) {
      selectedItem = "Library";
    } else if (isSkillsRoute) {
      selectedItem = "Skills";
    } else if (isMinervaRoute) {
      selectedItem = "Minerva";
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseLeave={() => {
        if (!isDropdownOpen) {
          setHoverState("clear-hover");
        }
      }}
    >
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-8">
          {/* Left Column: Menu items */}
          <div className="">
            <SidebarTrigger
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
            />
            <AppIcons onHoverChange={setHoverState} />
          </div>
          {/* Right Column: Chat List Section */}
          <div className="w-[272px]">
            <AppList show={selectedItem === "Apps"} />
            <ChatList show={selectedItem === "Chat"} />
            <SettingsList show={selectedItem === "Settings"} />
            <LibraryList show={selectedItem === "Library"} />
            <SkillsList show={selectedItem === "Skills"} />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Change button to open dialog instead of linking */}
            <SidebarMenuButton
              size="sm"
              className="font-medium w-14 flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl"
              onClick={() => setIsHelpDialogOpen(true)} // Open dialog on click
            >
              <HelpCircle className="h-5 w-5" />
              <span className={"text-xs"}>{t("navigation.help")}</span>
            </SidebarMenuButton>
            <HelpDialog
              isOpen={isHelpDialogOpen}
              onClose={() => setIsHelpDialogOpen(false)}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function AppIcons({
  onHoverChange,
}: {
  onHoverChange: (state: HoverState) => void;
}) {
  const { t } = useTranslation("common");
  const { t: tSkills } = useTranslation("skills");
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigationLabels = {
    apps: t("navigation.apps"),
    chat: t("navigation.chat"),
    settings: t("navigation.settings"),
    library: t("navigation.library"),
    skills: tSkills("navigation.title"),
    minerva: "Minerva",
    hub: t("navigation.hub"),
  } as const;

  return (
    // When collapsed: only show the main menu
    <SidebarGroup className="pr-0">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              (item.to === "/" && pathname === "/") ||
              (item.to !== "/" && pathname.startsWith(item.to));

            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  as={Link}
                  to={item.to}
                  size="sm"
                  className={`font-medium w-14 flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl ${
                    isActive ? "bg-sidebar-accent" : ""
                  }`}
                  onMouseEnter={() => {
                    const hoverState = hoverStateByItemId[item.id];
                    if (hoverState) {
                      onHoverChange(hoverState);
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <item.icon className="h-5 w-5" />
                    <span className={"text-xs"}>
                      {navigationLabels[item.id]}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
