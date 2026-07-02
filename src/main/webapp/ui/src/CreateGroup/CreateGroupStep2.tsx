import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { ThemeProvider } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import StyledEngineProvider from "@mui/styled-engine/StyledEngineProvider";
import EmailValidator from "email-validator";
import React from "react";
import CreatableSelect from "react-select/creatable";
import axios from "@/common/axios";
import { useI18n } from "@/i18n/I18nContext";
import materialTheme from "../theme";

// biome-ignore lint/suspicious/noExplicitAny: initial biome migration
class createGroupStep2 extends React.Component<any, any> {
  // biome-ignore lint/suspicious/noExplicitAny: initial biome migration
  constructor(props: any) {
    super(props);
    this.state = {
      radioOptions: {
        value: "",
        selectedUser: "",
        displayNominate: false,
      },
      returnedUserList: [],
      emailValidation: true,
    };
  }
  // biome-ignore lint/suspicious/noExplicitAny: initial biome migration
  handleChange = (event: any) => {
    //Check to see if self nominated or not
    const nominatePi = event.target.value !== this.props.currentUser;

    this.setState({
      radioOptions: {
        value: event.target.value,
        displayNominate: nominatePi,
        selectedUser: event.target.value,
      },
    });
  };

  getCurrentUsers = (value: string) => {
    //Don't perform a search until after 3 characters have been input
    if (value.length < 3) {
      return;
    }

    //Validate email
    const emailTest = EmailValidator.validate(value);
    this.setState({
      emailValidation: emailTest,
    });
    const selfService = $("#selfServiceLabGroup").length !== 0;
    const projectGroup = $("#projectGroup").length !== 0;
    const url =
      (selfService && !projectGroup ? `/selfServiceLabGroup/` : projectGroup ? /projectGroup/ : `/cloud/ajax/`) +
      `searchPublicUserInfoList?term=${value}`;

    axios
      .get(url)
      .then((data) => {
        this.displayExistingUsers(data.data.data);
      })
      .catch((error) => {
        if (error.message === "Network Error") {
          console.warn("No network connection");
        } else {
          console.warn("Error retrieving information");
        }
      });
  };

  // biome-ignore lint/suspicious/noExplicitAny: initial biome migration
  handleSelect = (user: any) => {
    if (user === null) {
      // biome-ignore lint/suspicious/noExplicitAny: initial biome migration
      this.setState((prevState: any) => ({
        radioOptions: {
          ...prevState.radioOptions,
          selectedUser: "",
        },
      }));
    } else {
      const emailTest = EmailValidator.validate(user.value);

      this.setState({
        emailValidation: emailTest,
      });

      // biome-ignore lint/suspicious/noExplicitAny: initial biome migration
      this.setState((prevState: any) => ({
        radioOptions: {
          ...prevState.radioOptions,
          selectedUser: user.value,
        },
      }));
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: initial biome migration
  displayExistingUsers = (userList: any) => {
    const display = [];
    for (let i = 0; i < userList.length; i++) {
      display.push({
        value: userList[i].email,
        label: userList[i].email,
      });
    }
    this.setState({
      returnedUserList: [...display],
    });
  };

  componentDidMount() {
    this.setState({
      radioOptions: {
        ...this.props.radioDetails,
      },
    });
  }

  componentWillUnmount() {
    this.props.changePI(this.state.radioOptions);
  }

  render() {
    const { t } = useI18n();
    return (
      <Box sx={{ padding: "0 25px 10px 25px" }}>
        <StyledEngineProvider injectFirst enableCssLayer>
          <ThemeProvider theme={materialTheme}>
            <h3>{t("groups.createGroup.createGroupStep2.selectPi")}</h3>
            <RadioGroup
              aria-label={t("groups.createGroup.createGroupStep2.piRoleAriaLabel")}
              name="piRole"
              value={this.state.radioOptions.value}
              onChange={this.handleChange}
            >
              <FormControlLabel
                data-test-id="createGroupSelectSelfPI"
                value={this.props.currentUser}
                control={<Radio color="primary" />}
                label={t("groups.createGroup.createGroupStep2.makeMeTheGroupPiLabel")}
              />
              <FormControlLabel
                data-test-id="createGroupSelectOtherPI"
                value="selectPI"
                control={<Radio color="primary" />}
                label={
                  <span>
                    {t("groups.createGroup.createGroupStep2.nominateAPiMakeMeLab")}
                    <br />
                    <Typography variant="inherit" component="em" sx={{ fontSize: "11px" }}>
                      {t("groups.createGroup.createGroupStep2.noteGroupWontBeCreatedUntil")}
                    </Typography>
                  </span>
                }
              />
            </RadioGroup>
            {this.state.radioOptions.displayNominate === true && (
              <div>
                <p>{t("groups.createGroup.createGroupStep2.enterASingleEmailAddressOf")}</p>
                <FormControl
                  data-test-id="createGroupChoosePI"
                  error
                  aria-describedby="email-error-text"
                  sx={{ width: "100%" }}
                >
                  <CreatableSelect
                    isClearable={true}
                    onChange={this.handleSelect}
                    onInputChange={this.getCurrentUsers}
                    options={this.state.returnedUserList}
                    placeholder={t("groups.createGroup.createGroupStep2.startTypingPlaceholder")}
                    formatCreateLabel={(userInput) => `Select ${userInput}`}
                    defaultValue={{
                      value: this.props.radioDetails.selectedUser,
                      label: this.props.radioDetails.selectedUser,
                    }}
                    classNamePrefix="seleniumTest"
                  />
                  {!this.state.emailValidation && (
                    <FormHelperText id="email-error-text">
                      {t("groups.createGroup.createGroupStep2.pleaseEnterAValidEmailAddress")}
                    </FormHelperText>
                  )}
                </FormControl>
              </div>
            )}
          </ThemeProvider>
        </StyledEngineProvider>
      </Box>
    );
  }
}

export default createGroupStep2;
