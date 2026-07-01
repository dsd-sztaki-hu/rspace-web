import type React from "react";
import { describe, expect, test } from "vitest";
import { render, screen, waitFor } from "@/__tests__/customQueries";
import { type ApiI18nCatalog, I18nProvider, useI18n } from "../I18nContext";

function TranslatedText(): React.ReactNode {
  const { locale, loading, t } = useI18n();
  return (
    <>
      <span>{locale}</span>
      <span>{loading ? "loading" : "loaded"}</span>
      <span>{t("inventory.search.noResults", "No results.")}</span>
      <span>{t("inventory.search.resultsFound", "{count} results found.", { count: 3 })}</span>
    </>
  );
}

describe("I18nProvider", () => {
  test("uses loaded catalog messages", async () => {
    const catalog: ApiI18nCatalog = {
      locale: "hu",
      namespaces: ["inventory"],
      messages: {
        "inventory.search.noResults": "Nincs találat.",
        "inventory.search.resultsFound": "{count} találat.",
      },
    };

    render(
      <I18nProvider loadCatalog={() => Promise.resolve(catalog)}>
        <TranslatedText />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("loaded")).toBeInTheDocument());
    expect(screen.getByText("hu")).toBeInTheDocument();
    expect(screen.getByText("Nincs találat.")).toBeInTheDocument();
    expect(screen.getByText("3 találat.")).toBeInTheDocument();
  });

  test("uses fallback strings when no catalog message exists", () => {
    render(
      <I18nProvider
        initialCatalog={{ locale: "en", namespaces: [], messages: {} }}
        loadCatalog={() => Promise.resolve({ locale: "en", namespaces: [], messages: {} })}
        loadOnMount={false}
      >
        <TranslatedText />
      </I18nProvider>,
    );

    expect(screen.getByText("No results.")).toBeInTheDocument();
    expect(screen.getByText("3 results found.")).toBeInTheDocument();
  });
});
