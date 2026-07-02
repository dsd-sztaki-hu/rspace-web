import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import { ThemeProvider } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import React from "react";
import { useI18n } from "@/i18n/I18nContext";
import { useApplicationVersionQuery } from "@/modules/common/queries/applicationVersion";
import createAccentedTheme from "../../accentedTheme";
import RSpaceLogo from "../../assets/branding/rspace/logo.svg";
import { ACCENT_COLOR } from "../../assets/branding/rspace/other";
import docLinks from "../../assets/DocLinks";
import { useDeploymentProperty } from "../../hooks/api/useDeploymentProperty";
import * as FetchingData from "../../util/fetchingData";
import { Dialog } from "../DialogBoundary";
import ErrorBoundary from "../ErrorBoundary";

interface AboutRSpaceDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Renders the running application version. Suspends while it loads, so it must
 * be wrapped in a `<Suspense>` boundary, and throws on failure, so it must be
 * wrapped in an error boundary.
 */
function ApplicationVersion(): React.ReactElement {
  const { data: version } = useApplicationVersionQuery();
  return (
    <Typography variant="h6" gutterBottom>
      {version}
    </Typography>
  );
}

export function AboutRSpaceContent(): React.ReactElement {
  const deploymentDescription = useDeploymentProperty("deployment.description");
  const helpEmail = useDeploymentProperty("deployment.helpEmail");
  const { t, tNode } = useI18n();
  return (
    <Stack sx={{ py: 2, alignItems: "center" }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={RSpaceLogo} alt={t("ApplicationResources.appBar.aboutRSpaceDialog.rspaceLogoAlt")} />{" "}
      </Box>

      <Box sx={{ mb: 3 }}>
        <ErrorBoundary message={t("ApplicationResources.appBar.aboutRSpaceDialog.versionUnavailable")}>
          <React.Suspense
            fallback={
              <Typography variant="h6" gutterBottom color="textSecondary">
                {t("ApplicationResources.appBar.aboutRSpaceDialog.loadingVersion")}
              </Typography>
            }
          >
            <ApplicationVersion />
          </React.Suspense>
        </ErrorBoundary>
      </Box>

      {FetchingData.match(deploymentDescription, {
        loading: () => null,
        error: () => null,
        success: (description) => {
          if (typeof description === "string" && description.trim()) {
            return (
              <Typography variant="body2" align="center" color="textSecondary" gutterBottom>
                {description}
              </Typography>
            );
          }
          return null;
        },
      })}

      <Typography variant="body2" align="center" color="textSecondary" gutterBottom>
        {tNode("ApplicationResources.appBar.aboutRSpaceDialog.forGeneralSupportEmailSupportResearchspace", {
          supportResearchspaceComLink: (
            <Link href="mailto:support@researchspace.com">
              {t(
                "ApplicationResources.appBar.aboutRSpaceDialog.forGeneralSupportEmailSupportResearchspace.supportResearchspaceComLink",
              )}
            </Link>
          ),
        })}
      </Typography>

      {FetchingData.match(helpEmail, {
        loading: () => null,
        error: () => null,
        success: (email) => {
          if (typeof email === "string" && email.trim()) {
            return (
              <Typography variant="body2" align="center" color="textSecondary" gutterBottom>
                {tNode("ApplicationResources.appBar.aboutRSpaceDialog.forAccountAndGroupText", {
                  textLink: <Link href={`mailto:${email}`}>{email}</Link>,
                })}
              </Typography>
            );
          }
          return null;
        },
      })}

      <Typography variant="body2" align="center" gutterBottom sx={{ mt: 3 }}>
        {t("ApplicationResources.appBar.aboutRSpaceDialog.rspaceIsOpenSourceAndPowered")}
        <br />
        {t("ApplicationResources.appBar.aboutRSpaceDialog.rspaceIsLicensedUnderAgpl")}
      </Typography>
      <Typography variant="caption" align="center" color="textSecondary">
        {t("ApplicationResources.appBar.aboutRSpaceDialog.2026Researchspace")}
      </Typography>

      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="body2" component="div">
          <Stack spacing={2} direction="row" sx={{ alignItems: "center" }}>
            <Link href="https://researchspace.com" target="_blank" rel="noreferrer">
              {t("ApplicationResources.appBar.aboutRSpaceDialog.website")}
            </Link>
            <Link href={docLinks.changelog} target="_blank" rel="noreferrer">
              {t("ApplicationResources.appBar.aboutRSpaceDialog.changelog")}
            </Link>
            <Link href="https://github.com/rspace-os" target="_blank" rel="noreferrer">
              {t("ApplicationResources.appBar.aboutRSpaceDialog.sourceCode")}
            </Link>
          </Stack>
        </Typography>
      </Box>
    </Stack>
  );
}

export default function AboutRSpaceDialog({ open, onClose }: AboutRSpaceDialogProps): React.ReactElement {
  const { t } = useI18n();
  return (
    <ThemeProvider theme={createAccentedTheme(ACCENT_COLOR)}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t("ApplicationResources.appBar.aboutRSpaceDialog.aboutRspace")}</DialogTitle>
        <DialogContent>
          <AboutRSpaceContent />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("ApplicationResources.appBar.aboutRSpaceDialog.close")}</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
