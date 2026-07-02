import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { observer } from "mobx-react-lite";
import type React from "react";
import { useEffect, useState } from "react";
import axios from "@/common/axios";
import { useI18n } from "@/i18n/I18nContext";
import { OptionExplanation, OptionHeading } from "../components/Inputs/RadioField";
import { useDeploymentProperty } from "../hooks/api/useDeploymentProperty";
import * as FetchingData from "../util/fetchingData";
import { Optional } from "../util/optional";
import * as Parsers from "../util/parsers";
import type { Validator } from "../util/Validator";
import type { ExportSelection } from "./common";
import type { Repo } from "./repositories/common";

export type ArchiveType = "pdf" | "doc" | "xml" | "html" | "eln";

type RepoOption = {
  _label?: string;
  metadataLanguages?: Repo["metadataLanguages"];
};

type RepoUiConfig = Omit<Repo, "repoCfg"> & {
  options: Record<string, RepoOption>;
};

const WORD_ERRORS = [
  "Word export is only available for a single document, and you have selected more than one.",
  "Word export is only available for a single document, and you've selected a folder.",
  "Word export is only available for a single document or notebook entry, and you've selected a Notebook.",
  "All selected items are attachments — there are no RSpace documents to export.",
];

type FormatChoiceArgs = {
  exportConfigUpdate: {
    (key: "repoData", repos: ReadonlyArray<Repo>): void;
    (key: "archiveType", archiveType: ArchiveType): void;
    (key: "fileStores", includeFilesInFilestores: boolean): void;
    (key: "allVersions", allVersions: boolean): void;
    (key: "repository", exportToRepository: boolean): void;
  };
  exportSelection: ExportSelection;
  validator: Validator;
  archiveType: ArchiveType | "";
  allowFileStores: boolean;
  repoSelected: boolean;
  allVersions: boolean;
  fileStoresSelected: boolean;
  updateFileStores: (key: "includeNfsFiles", incluedNfsFiles: boolean) => void;
};

function FormatChoice({
  exportConfigUpdate,
  exportSelection,
  validator,
  archiveType,
  allowFileStores,
  repoSelected,
  allVersions,
  fileStoresSelected,
  updateFileStores,
}: FormatChoiceArgs): React.ReactNode {
  const { t } = useI18n();
  const [msgBlockingRepoChoice, setMsgBlockingRepoChoice] = useState(Optional.present("Loading"));
  const [pdfAvailable, setPdfAvailable] = useState(false);
  const [wordAvailable, setWordAvailable] = useState(false);
  const [wordAvailabilityMessage, setWordAvailabilityMessage] = useState("");
  const asposeEnabled = useDeploymentProperty("aspose.enabled");

  const repoCheck = () => {
    const url = "/repository/ajax/repo/uiConfig";

    axios
      .get<Array<RepoUiConfig> | { exceptionMessage: string }>(url)
      .then((response) => {
        const repos = response.data;
        if (!Array.isArray(repos)) throw new Error(repos.exceptionMessage);
        if (repos.length === 0) {
          setMsgBlockingRepoChoice(Optional.present(t("editor.export.formatChoice.noRepoSetup")));
          return;
        }
        setMsgBlockingRepoChoice(Optional.empty());

        const normalizedRepos = repos.flatMap<Repo>((repo) => {
          const baseRepo = {
            repoName: repo.repoName,
            displayName: repo.displayName,
            subjects: repo.subjects,
            license: repo.license,
            linkedDMPs: repo.linkedDMPs,
          };

          if (repo.repoName === "app.dataverse") {
            /*
             * On the apps page, users can configure multiple dataverses, so
             * here we process that so each dataverse config is treated as a
             * separate repository. The `keys` for each option is the string
             * of a integer, and so too is `repoCfg`, but that is not really
             * an important detail.
             */
            const keys = Object.keys(repo.options);
            if (keys.length) {
              return keys.map<Repo>((k) => ({
                ...baseRepo,
                repoCfg: k,
                label: repo.options[k]?._label,
                metadataLanguages: repo.options[k]?.metadataLanguages,
              }));
            }
            return [];
          }

          /*
           * On the apps page, users can only configure a just one
           * destination for each of the other repository services so we
           * just copy the object from the API
           */
          return [
            {
              ...baseRepo,
              repoCfg: -1,
              label: repo.label,
              metadataLanguages: repo.metadataLanguages,
            },
          ];
        });

        exportConfigUpdate("repoData", normalizedRepos);
      })
      .catch(() => {
        setMsgBlockingRepoChoice(Optional.present(t("editor.export.formatChoice.fetchingError")));
      });
  };

  const pdfCheck = () => {
    let disabled = false;
    let allMedia = false;
    let isSystem = false;
    // @ts-expect-error Global variable
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const isGallery = typeof isGalleryPage !== "undefined" && isGalleryPage;

    if (exportSelection.type === "selection") {
      // if all are media, there's nothing to export in this format: RSpac1333
      allMedia = exportSelection.exportTypes.every((n) => n === "MEDIA_FILE");
      // @ts-expect-error Global variable
    } else if (typeof isSystemFolderChecked === "function") {
      isSystem = true;
    }
    if (allMedia || isSystem || isGallery) {
      disabled = true;
    }

    setPdfAvailable(!disabled);
  };

  const wordCheck = () => {
    let disabledBecauseMultiple = false;
    let disabledBecauseFolder = false;
    let disabledBecauseNotebook = false;
    let disabledBecauseAllMedia = false;

    if (exportSelection.type === "selection" && exportSelection.exportIds.length === 1) {
      const selectedType = exportSelection.exportTypes[0];
      if (selectedType.indexOf("FOLDER") >= 0) {
        disabledBecauseFolder = true;
      } else if (selectedType === "NOTEBOOK") {
        disabledBecauseNotebook = true;
      }
    } else {
      disabledBecauseMultiple = true;
    }
    if (exportSelection.type === "selection") {
      disabledBecauseAllMedia = exportSelection.exportTypes.every((n) => n === "MEDIA_FILE");
    }

    const wordExportAllowed =
      !disabledBecauseMultiple && !disabledBecauseFolder && !disabledBecauseNotebook && !disabledBecauseAllMedia;

    setWordAvailable(wordExportAllowed);

    if (disabledBecauseMultiple) setWordAvailabilityMessage(WORD_ERRORS[0]);
    if (disabledBecauseFolder) setWordAvailabilityMessage(WORD_ERRORS[1]);
    if (disabledBecauseNotebook) setWordAvailabilityMessage(WORD_ERRORS[2]);
    if (disabledBecauseAllMedia) setWordAvailabilityMessage(WORD_ERRORS[3]);
  };

  useEffect(() => {
    repoCheck();
    pdfCheck();
    wordCheck();
  }, []);

  useEffect(() => {
    validator.setValidFunc(() => Promise.resolve(true));
  }, [validator]);

  const handleChange = ({ target: { value } }: { target: { value: ArchiveType } }) => {
    exportConfigUpdate("archiveType", value);
    if (value === "pdf" || value === "doc") exportConfigUpdate("fileStores", false);
    if (value !== "xml") exportConfigUpdate("allVersions", false);
  };

  return (
    <Grid container>
      <h3>{t("editor.export.formatChoice.chooseAnAppropriateFormatForYour")}</h3>
      <RadioGroup
        aria-label={t("editor.export.formatChoice.selectExportAriaLabel")}
        name="exportType"
        value={archiveType}
        // @ts-expect-error TypeScript doesn't realise that the value can only be one of the ArchiveType values
        onChange={handleChange}
      >
        <Stack spacing={2}>
          <FormControlLabel
            value="html"
            control={<Radio data-test-id="zip-html" color="primary" />}
            label={
              <>
                <OptionHeading>{t("editor.export.formatChoice.zipBundleContainingHtmlFiles")}</OptionHeading>
                <OptionExplanation>
                  {t("editor.export.formatChoice.exportedDataNotebooksAndAttachedFiles")}
                </OptionExplanation>
              </>
            }
          />
          <FormControlLabel
            value="xml"
            control={<Radio data-test-id="zip-xml" color="primary" />}
            label={
              <>
                <OptionHeading>{t("editor.export.formatChoice.zipBundleContainingXmlFiles")}</OptionHeading>
                <OptionExplanation>
                  {t("editor.export.formatChoice.exportedDataIsMachineReadableGood")}
                </OptionExplanation>
              </>
            }
          />
          <FormControlLabel
            value="pdf"
            disabled={!pdfAvailable}
            control={<Radio data-test-id="pdf" color="primary" />}
            label={
              <>
                <OptionHeading>{t("editor.export.formatChoice.pdfFile")}</OptionHeading>
                <OptionExplanation>
                  {pdfAvailable ? (
                    // biome-ignore lint/complexity/noUselessFragments: fragment keeps the prop typed as ReactNode
                    <>{t("editor.export.formatChoice.aReadOnlyVersionOfYour")}</>
                  ) : (
                    // biome-ignore lint/complexity/noUselessFragments: fragment keeps the prop typed as ReactNode
                    <>{t("editor.export.formatChoice.allSelectedItemsAreAttachmentsMdash")}</>
                  )}
                </OptionExplanation>
              </>
            }
          />
          <FormControlLabel
            value="eln"
            control={<Radio data-test-id="zip-eln" color="primary" />}
            label={
              <>
                <OptionHeading>{t("editor.export.formatChoice.roCrate")}</OptionHeading>
                <OptionExplanation>{t("editor.export.formatChoice.anXmlBundleWithAnRo")}</OptionExplanation>
              </>
            }
          />
          {FetchingData.getSuccessValue(asposeEnabled).flatMap(Parsers.isBoolean).orElse(false) && (
            <FormControlLabel
              value="doc"
              disabled={!wordAvailable}
              control={<Radio data-test-id="doc" color="primary" />}
              label={
                <>
                  <OptionHeading>{t("editor.export.formatChoice.docFile")}</OptionHeading>
                  <OptionExplanation>
                    {wordAvailable ? (
                      // biome-ignore lint/complexity/noUselessFragments: fragment keeps the prop typed as ReactNode
                      <>{t("editor.export.formatChoice.msWordVersionOfYourRspace")}</>
                    ) : (
                      wordAvailabilityMessage
                    )}
                  </OptionExplanation>
                </>
              }
            />
          )}
        </Stack>
      </RadioGroup>
      <Typography variant="h6" component="h3" sx={{ marginTop: "20px" }}>
        {t("editor.export.formatChoice.chooseAdditionalDestinations")}
      </Typography>
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={repoSelected}
              onChange={({ target: { checked } }) => exportConfigUpdate("repository", checked)}
              value="repository"
              color="primary"
              disabled={msgBlockingRepoChoice.isPresent()}
              data-test-id="repo"
              slotProps={{ input: { role: "checkbox" } }}
            />
          }
          label={msgBlockingRepoChoice.orElse(t("editor.export.formatChoice.exportToRepo"))}
        />
      </Grid>
      {allowFileStores && (archiveType === "html" || archiveType === "xml" || archiveType === "eln") && (
        <Grid size={12}>
          <h3>{t("editor.export.formatChoice.filestores")}</h3>
          <FormControlLabel
            control={
              <Switch
                checked={fileStoresSelected}
                onChange={({ target: { checked } }) => {
                  exportConfigUpdate("fileStores", checked);
                  updateFileStores("includeNfsFiles", checked);
                }}
                value="fileStores"
                color="primary"
                data-test-id="filestores"
                slotProps={{ input: { role: "checkbox" } }}
              />
            }
            label={t("editor.export.formatChoice.includeFilestoreLinksLabel")}
          />
        </Grid>
      )}
      {(archiveType === "xml" || archiveType === "eln") && (
        <Grid size={12}>
          <h3>{t("editor.export.formatChoice.revisions")}</h3>
          <FormControlLabel
            control={
              <Switch
                checked={allVersions}
                onChange={({ target: { checked } }) => {
                  exportConfigUpdate("allVersions", checked);
                }}
                value="allVersions"
                color="primary"
                data-test-id="allVersions"
                slotProps={{ input: { role: "checkbox" } }}
              />
            }
            label={t("editor.export.formatChoice.checkToIncludeAllPreviousLabel")}
          />
        </Grid>
      )}
    </Grid>
  );
}

export default observer(FormatChoice);
