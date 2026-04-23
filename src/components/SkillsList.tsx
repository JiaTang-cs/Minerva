import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { activeSkillsSectionAtom } from "@/atoms/viewAtoms";
import {
  SKILLS_CONTENT_SCROLL_ID,
  SKILLS_SECTIONS,
} from "@/lib/sectionNavigation";
import { useTranslation } from "react-i18next";

export function SkillsList({ show }: { show: boolean }) {
  const { t } = useTranslation("skills");
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [activeSection, setActiveSection] = useAtom(activeSkillsSectionAtom);

  useEffect(() => {
    if (!show || pathname !== "/skills") {
      return;
    }

    const root = document.getElementById(SKILLS_CONTENT_SCROLL_ID);
    if (!root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            return;
          }
        }
      },
      { root, rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const section of SKILLS_SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) {
        observer.observe(el);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [pathname, setActiveSection, show]);

  if (!show) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 p-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("sidebar.title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("sidebar.description")}
        </p>
      </div>
      <div className="flex-grow overflow-y-auto">
        <div className="space-y-1 p-4 pt-0">
          {SKILLS_SECTIONS.map((section) => (
            <Link
              key={section.id}
              to="/skills"
              hash={section.id === "overview" ? undefined : section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/skills" && activeSection === section.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "hover:bg-sidebar-accent",
              )}
            >
              {t(`sidebar.${section.id}`)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
