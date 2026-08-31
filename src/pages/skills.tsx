import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useSkillCatalogSearch, useSkills } from "@/hooks/useSkills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Skill, SkillSourceType } from "@/ipc/types";
import { SKILLS_CONTENT_SCROLL_ID } from "@/lib/sectionNavigation";
import { useTranslation } from "react-i18next";

export default function SkillsPage() {
  const { t } = useTranslation("skills");
  const appId = useAtomValue(selectedAppIdAtom);
  const navigate = useNavigate();
  const search = useSearch({ from: "/skills" });
  const [searchQuery, setSearchQuery] = useState(search.q ?? "");
  const {
    skills,
    loadErrors,
    roots,
    isLoading,
    refresh,
    isRefreshing,
    installSkill,
  } = useSkills(appId);
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSkillCatalogSearch(searchQuery);

  useEffect(() => {
    setSearchQuery(search.q ?? "");
  }, [search.q]);

  const skillsBySource: Record<SkillSourceType, Skill[]> = useMemo(() => {
    return {
      bundled: skills.filter((skill) => skill.sourceType === "bundled"),
      user: skills.filter((skill) => skill.sourceType === "user"),
      project: skills.filter((skill) => skill.sourceType === "project"),
    };
  }, [skills]);

  const sourceSections: Array<{
    key: SkillSourceType;
    title: string;
    description: string;
  }> = [
    {
      key: "bundled",
      title: t("sections.bundled.title"),
      description: t("sections.bundled.description"),
    },
    {
      key: "user",
      title: t("sections.user.title"),
      description: t("sections.user.description"),
    },
    {
      key: "project",
      title: t("sections.project.title"),
      description: t("sections.project.description"),
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div
        id={SKILLS_CONTENT_SCROLL_ID}
        className="mx-auto min-h-0 w-full max-w-6xl flex-1 space-y-8 overflow-y-auto pr-2"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {t("page.title")}
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? t("page.refreshing") : t("page.refresh")}
          </Button>
        </div>

        <section
          id="overview"
          className="rounded-2xl border border-border bg-card/60 p-5"
        >
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold">{t("overview.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("overview.description")}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setSearchQuery(nextQuery);
                  void navigate({
                    to: "/skills",
                    search: nextQuery.trim()
                      ? {
                          q: nextQuery,
                        }
                      : {},
                    replace: true,
                  });
                }}
                placeholder={t("page.searchPlaceholder")}
                aria-label={t("page.searchLabel")}
                className="h-11 pl-10 pr-4 shadow-sm"
              />
            </div>
            {searchQuery.trim().length < 2 ? (
              <p className="text-sm text-muted-foreground">
                {t("page.typeToSearch")}
              </p>
            ) : isSearching ? (
              <p className="text-sm text-muted-foreground">
                {t("page.searching")}
              </p>
            ) : searchError ? (
              <p className="text-sm text-destructive">
                {t("page.searchError")}
              </p>
            ) : searchResults?.length ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {t("page.resultCount", { count: searchResults.length })}
                </div>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:bg-accent/20 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/skills/catalog"
                          search={{
                            source: result.source,
                            skillId: result.skillId,
                            name: result.name,
                            installs: result.installs,
                            sourceUrl: result.sourceUrl,
                            query: searchQuery.trim() ? searchQuery : undefined,
                          }}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {result.name}
                        </Link>
                        <Badge variant="outline">{result.skillId}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.installs.toLocaleString()} installs
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {result.source}
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        const installed = await installSkill({
                          source: result.source,
                          skillId: result.skillId,
                        });
                        toast.success(
                          t("page.installSuccess", {
                            name: installed.skill.name,
                            path: installed.installedTo,
                          }),
                        );
                      }}
                    >
                      {t("actions.install")}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("page.noResults")}
              </p>
            )}
          </div>
        </section>

        {!isLoading && roots ? (
          <section className="grid gap-3 md:grid-cols-3">
            <PathCard title={t("roots.bundled")} path={roots.bundled} />
            <PathCard title={t("roots.user")} path={roots.user} />
            <PathCard title={t("roots.project")} path={roots.project} />
          </section>
        ) : null}

        {sourceSections.map((section) => (
          <section key={section.key} id={section.key} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-border p-5 text-sm text-muted-foreground">
                {t("page.loadingSkills")}
              </div>
            ) : skillsBySource[section.key].length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                {t(`sections.${section.key}.empty`)}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {skillsBySource[section.key].map((skill) => (
                  <SkillCard
                    key={`${skill.sourceType}:${skill.name}`}
                    skill={skill}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

        {loadErrors.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("page.loadErrors")}</h2>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="space-y-3">
                {loadErrors.map((error, index) => (
                  <div
                    key={`${error.directoryPath}:${index}`}
                    className="text-sm"
                  >
                    <div className="font-medium">
                      {error.sourceType} skill at {error.directoryPath}
                    </div>
                    <div className="text-muted-foreground">{error.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function PathCard({ title, path }: { title: string; path: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
        {path}
      </div>
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const { t } = useTranslation("skills");
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{skill.displayName}</h3>
        <Badge variant="secondary">{skill.sourceType}</Badge>
        {skill.overriddenBy.length > 0 ? (
          <Badge variant="outline">
            {t("card.overriddenBy", { sources: skill.overriddenBy.join(", ") })}
          </Badge>
        ) : null}
        {skill.overrides.length > 0 ? (
          <Badge variant="outline">
            {t("card.overrides", { sources: skill.overrides.join(", ") })}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{skill.description}</p>
      {skill.whenToUse ? (
        <p className="mt-3 text-sm">
          <span className="font-medium">{t("card.whenToUse")}</span>{" "}
          {skill.whenToUse}
        </p>
      ) : null}
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{t("card.path")}</span>{" "}
          <span className="break-all font-mono">{skill.sourcePath}</span>
        </div>
        <div>
          <span className="font-medium text-foreground">
            {t("card.invocation")}
          </span>{" "}
          /{skill.name}
        </div>
        {skill.allowedTools.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">
              {t("card.allowedTools")}
            </span>{" "}
            {skill.allowedTools.join(", ")}
          </div>
        ) : null}
      </div>
    </article>
  );
}
