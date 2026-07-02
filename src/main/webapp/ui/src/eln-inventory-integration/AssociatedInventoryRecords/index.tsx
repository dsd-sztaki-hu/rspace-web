import Collapse from "@mui/material/Collapse";
import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Analytics from "@/components/Analytics";
import { MuiCssLayerProvider } from "@/components/MuiCssLayerProvider";
import { I18nProvider, useI18n } from "@/i18n/I18nContext";
import AnalyticsContext from "@/stores/contexts/Analytics";
import type { ElnDocumentId } from "@/stores/models/MaterialsModel";
import NoValue from "../../components/NoValue";
import useStores from "../../stores/use-stores";

type AssociatedInventoryRecordsArgs = {
  elnDocumentId: ElnDocumentId;
};

const AssociatedInventoryRecords = observer(function AssociatedInventoryRecords({
  elnDocumentId,
}: AssociatedInventoryRecordsArgs) {
  const { trackEvent } = React.useContext(AnalyticsContext);
  const { materialsStore } = useStores();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    if (open) {
      void materialsStore.getDocumentMaterialsListings(elnDocumentId);
    }
  }, [open, elnDocumentId, materialsStore]);

  useEffect(() => {
    const handleListOfMaterialsOpened = () => {
      /*
       * Close the listing so that the data has to be fetched in case there
       * have been changes to the inventory records included in the list of materials
       */
      setOpen(false);
    };

    window.addEventListener("listOfMaterialsOpened", handleListOfMaterialsOpened);

    return () => {
      window.removeEventListener("listOfMaterialsOpened", handleListOfMaterialsOpened);
    };
  }, []);

  if (Number.isNaN(elnDocumentId)) return null;
  return (
    <>
      {/** biome-ignore lint/a11y/useButtonType: initial biome migration */}
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen) {
            trackEvent("user:open:inventory_attachment_listing:document_editor");
          } else {
            trackEvent("user:close:inventory_attachment_listing:document_editor");
          }
        }}
        className="btn btn-primary"
      >
        {t("editor.eln-inventory-integration.associatedInventoryRecords.inventoryItems")}
      </button>
      <Collapse in={open}>
        <ul>
          {materialsStore.loading ? (
            <NoValue label={t("editor.eln-inventory-integration.associatedInventoryRecords.loadingLabel")} />
          ) : materialsStore.allInvRecordsFromAllDocumentLists.size === 0 ? (
            <>{t("editor.eln-inventory-integration.associatedInventoryRecords.theDocumentHasNoConnectedInventory")}</>
          ) : (
            materialsStore.allInvRecordsFromAllDocumentLists.map(({ name, globalId, permalinkURL }) => (
              <li key={globalId}>
                <a href={permalinkURL || ""}>{name}</a>
              </li>
            ))
          )}
        </ul>
      </Collapse>
    </>
  );
});

const wrapperDiv = document.getElementById("inventoryRecordList");
if (wrapperDiv) {
  const root = createRoot(wrapperDiv);
  root.render(
    <Analytics>
      <I18nProvider>
        <MuiCssLayerProvider>
          <AssociatedInventoryRecords elnDocumentId={parseInt(wrapperDiv.dataset.documentid || "0", 10)} />
        </MuiCssLayerProvider>
      </I18nProvider>
    </Analytics>,
  );
}

export default AssociatedInventoryRecords;
