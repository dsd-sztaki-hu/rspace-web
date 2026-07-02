import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import type React from "react";
import { useI18n } from "@/i18n/I18nContext";

type SidebarToggleArgs = {
  sidebarOpen: boolean;
  sidebarId: string;
  setSidebarOpen: (open: boolean) => void;
};

/**
 * A hamburger menu icon that sits in the AppBar for toggling the left-hand
 * sidebar.
 */
export default function SidebarToggle({ sidebarOpen, sidebarId, setSidebarOpen }: SidebarToggleArgs): React.ReactNode {
  const { t } = useI18n();
  return (
    <IconButton
      aria-label={
        sidebarOpen ? t("ApplicationResources.appBar.closeSidebar") : t("ApplicationResources.appBar.openSidebar")
      }
      aria-controls={sidebarId}
      aria-expanded={sidebarOpen ? "true" : "false"}
      onClick={() => {
        setSidebarOpen(!sidebarOpen);
      }}
    >
      <MenuIcon />
    </IconButton>
  );
}
