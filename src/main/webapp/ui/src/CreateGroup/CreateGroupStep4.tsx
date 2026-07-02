import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useI18n } from "@/i18n/I18nContext";

// biome-ignore lint/suspicious/noExplicitAny: initial biome migration
const createGroupStep4 = (props: any) => {
  const selfService = $("#selfServiceLabGroup").length !== 0;
  const projectGroup = $("#projectGroup").length !== 0;
  const { t } = useI18n();
  return (
    <Box sx={{ padding: "0 25px 10px 25px" }}>
      <h3>{t("groups.createGroup.createGroupStep4.summary")}</h3>
      <p data-test-id="createGroupSummaryGroupName">
        <strong>{t("groups.createGroup.createGroupStep4.groupName")}</strong>{" "}
        {props.summary.groupName === "" ? (
          <Typography variant="inherit" component="span" sx={{ color: "#f44336" }}>
            {t("groups.createGroup.createGroupStep4.youRequireAGroupName")}
          </Typography>
        ) : (
          props.summary.groupName
        )}
      </p>
      <p data-test-id="createGroupSummaryPI">
        {projectGroup && <strong>{t("groups.createGroup.createGroupStep4.groupOwner")}</strong>}
        {!projectGroup && <strong>{t("groups.createGroup.createGroupStep4.pi")}</strong>}{" "}
        {props.summary.selectPI.selectedUser === "" ? (
          <Typography variant="inherit" component="span" sx={{ color: "#f44336" }}>
            {t("groups.createGroup.createGroupStep4.youMustSelectAPi")}
          </Typography>
        ) : (
          props.summary.selectPI.selectedUser
        )}
      </p>
      <p data-test-id="createGroupSummaryInvitedMem">
        <strong>{t("groups.createGroup.createGroupStep4.invitedMembers")}</strong>{" "}
        {props.summary.existingUsers.join(", ")}
      </p>
      {!selfService && (
        <p data-test-id="createGroupSummaryInvitedNonMem">
          <strong>{t("groups.createGroup.createGroupStep4.invitedNonMembers")}</strong>{" "}
          {props.summary.newUsers.join(", ")}
        </p>
      )}
    </Box>
  );
};

export default createGroupStep4;
