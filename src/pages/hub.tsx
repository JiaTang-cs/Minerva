import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useSettings } from "@/hooks/useSettings";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateCard } from "@/components/TemplateCard";
import { CreateAppDialog } from "@/components/CreateAppDialog";
import { NeonConnector } from "@/components/NeonConnector";
import { useTranslation } from "react-i18next";

const HubPage: React.FC = () => {
  const { t } = useTranslation(["home", "common"]);
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { templates, isLoading } = useTemplates();
  const { settings, updateSettings } = useSettings();
  const selectedTemplateId = settings?.selectedTemplateId;

  const handleTemplateSelect = (templateId: string) => {
    updateSettings({ selectedTemplateId: templateId });
  };

  const handleCreateApp = () => {
    setIsCreateDialogOpen(true);
  };
  // Separate templates into official and community
  const officialTemplates =
    templates?.filter((template) => template.isOfficial) || [];
  const communityTemplates =
    templates?.filter((template) => !template.isOfficial) || [];

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-5xl mx-auto pb-12">
        <Button
          onClick={() => router.history.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common:goBack")}
        </Button>
        <header className="mb-8 text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("home:hub.title")}
          </h1>
          <p className="text-md text-gray-600 dark:text-gray-400">
            {t("home:hub.description")}
            {isLoading ? ` ${t("home:hub.loadingAdditionalTemplates")}` : null}
          </p>
        </header>

        {/* Official Templates Section */}
        {officialTemplates.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("home:hub.officialTemplates")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {officialTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  onSelect={handleTemplateSelect}
                  onCreateApp={handleCreateApp}
                />
              ))}
            </div>
          </section>
        )}

        {/* Community Templates Section */}
        {communityTemplates.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("home:hub.communityTemplates")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  onSelect={handleTemplateSelect}
                  onCreateApp={handleCreateApp}
                />
              ))}
            </div>
          </section>
        )}

        <BackendSection />
      </div>

      <CreateAppDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        template={templates?.find((t) => t.id === settings?.selectedTemplateId)}
      />
    </div>
  );
};

function BackendSection() {
  const { t } = useTranslation("home");

  return (
    <div className="">
      <header className="mb-4 text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("hub.backendServicesTitle")}
        </h1>
        <p className="text-md text-gray-600 dark:text-gray-400">
          {t("hub.backendServicesDescription")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <NeonConnector />
      </div>
    </div>
  );
}

export default HubPage;
