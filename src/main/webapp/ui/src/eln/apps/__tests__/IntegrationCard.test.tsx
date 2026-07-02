// Side-effect mock imports must precede the component import so vi.mock registers first.
import "@/__tests__/__mocks__/matchMedia";
import "@/__tests__/__mocks__/muiTransitions";
import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nContext";
import materialTheme from "../../../theme";
import IntegrationCard from "../IntegrationCard";

function renderWithI18n(children: React.ReactNode) {
  return render(
    <I18nProvider
      initialCatalog={{
        locale: "en",
        namespaces: ["apps"],
        messages: {
          "apps.eln.apps.integrationCard.seeWebsiteAndDocsForMore": "See {websiteLink} and our {docsLink} for more.",
          "apps.eln.apps.integrationCard.seeDocsForMore": "See our {docsLink} for more.",
          "apps.eln.apps.integrationCard.setup": "Setup",
          "apps.eln.apps.integrationCard.close": "Close",
          "apps.eln.apps.integrationCard.disable": "DISABLE",
          "apps.eln.apps.integrationCard.enable": "ENABLE",
        },
      }}
      loadOnMount={false}
    >
      <ThemeProvider theme={materialTheme}>{children}</ThemeProvider>
    </I18nProvider>,
  );
}

describe("IntegrationCard", () => {
  test("Name should be shown.", () => {
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "ENABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={() => {}}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        // biome-ignore lint/complexity/noUselessFragments: initial biome migration
        setupSection={<></>}
      />,
    );
    expect(screen.getByText("SomeIntegration")).toBeVisible();
  });
  test("Explanatory text should be shown.", () => {
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "ENABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={() => {}}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        // biome-ignore lint/complexity/noUselessFragments: initial biome migration
        setupSection={<></>}
      />,
    );
    expect(screen.getByText("Something, something, something...")).toBeVisible();
  });
  test("Logo image should be shown.", () => {
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "ENABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={() => {}}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        // biome-ignore lint/complexity/noUselessFragments: initial biome migration
        setupSection={<></>}
      />,
    );
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "image url");
  });
  test("When card is tapped, a dialog should be shown.", () => {
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "ENABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={() => {}}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        // biome-ignore lint/complexity/noUselessFragments: initial biome migration
        setupSection={<></>}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  test("DialogContent should be shown once card has been tapped.", () => {
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "ENABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={() => {}}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        setupSection="Some dialog content"
      />,
    );

    expect(screen.queryByText("Some dialog content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Some dialog content")).toBeInTheDocument();
  });
  test("When tapped, the enable button should invoke update.", () => {
    const update = vi.fn();
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "DISABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={update}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        // biome-ignore lint/complexity/noUselessFragments: initial biome migration
        setupSection={<></>}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    fireEvent.click(screen.getByRole("button", { name: "ENABLE" }));
    expect(update).toHaveBeenCalledWith("ENABLED");
  });
  test("When tapped, the disable button should invoke update.", () => {
    const update = vi.fn();
    renderWithI18n(
      <IntegrationCard
        name="SomeIntegration"
        integrationState={{ mode: "ENABLED", credentials: {} }}
        explanatoryText="Something, something, something..."
        image="image url"
        color={{ hue: 0, saturation: 100, lightness: 50 }}
        update={update}
        usageText=""
        helpLinkText="test"
        docLink=""
        website=""
        // biome-ignore lint/complexity/noUselessFragments: initial biome migration
        setupSection={<></>}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    fireEvent.click(screen.getByRole("button", { name: "DISABLE" }));
    expect(update).toHaveBeenCalledWith("DISABLED");
  });
});
