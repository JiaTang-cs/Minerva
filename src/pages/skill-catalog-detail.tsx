import { useNavigate, useSearch } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCatalogSkillDetail } from "@/hooks/useSkills";
import { ipc } from "@/ipc/types";
import { useTranslation } from "react-i18next";

export default function SkillCatalogDetailPage() {
  const { t } = useTranslation("skills");
  const navigate = useNavigate();
  const search = useSearch({ from: "/skills/catalog" });
  const { data, isLoading } = useCatalogSkillDetail(
    search.source,
    search.skillId,
  );

  const detail = data ?? null;
  const title = detail?.name ?? search.name ?? search.skillId;
  const sourceUrl =
    detail?.sourceUrl ??
    search.sourceUrl ??
    `https://github.com/${search.source}`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col space-y-6">
        <Button
          variant="ghost"
          className="-ml-3 w-fit"
          onClick={() =>
            navigate({
              to: "/skills",
              search: search.query ? { q: search.query } : {},
            })
          }
        >
          <ArrowLeft className="size-4" />
          {t("detail.back")}
        </Button>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {t("detail.loading")}
          </div>
        ) : detail ? (
          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-h-0 space-y-6 overflow-y-auto pr-1">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{t("navigation.title")}</span>
                      <span>/</span>
                      <span>{search.source}</span>
                      <span>/</span>
                      <span>{search.skillId}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {title}
                      </h1>
                      <Badge variant="outline">{search.skillId}</Badge>
                    </div>
                    <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                      {detail.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => ipc.system.openExternalUrl(sourceUrl)}
                  >
                    {t("detail.openSource")}
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
              </div>

              {detail.whenToUse ? (
                <section className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("detail.whenToUse")}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-foreground/90">
                    {detail.whenToUse}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t("detail.skillFile")}
                </h2>
                <div className="prose prose-sm mt-6 max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {detail.body}
                  </ReactMarkdown>
                </div>
              </section>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              {typeof search.installs === "number" ? (
                <InfoCard
                  label={t("detail.installs")}
                  value={search.installs.toLocaleString()}
                />
              ) : null}
              <InfoCard label={t("detail.repository")} value={search.source} />
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {t("detail.loadError")}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
