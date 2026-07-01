import type React from "react";
import { describe, expect, test } from "vitest";
import { render, screen, waitFor } from "@/__tests__/customQueries";
import { type ApiI18nCatalog, I18nProvider, useI18n } from "../I18nContext";

function TranslatedText(): React.ReactNode {
  const { locale, loading, t, tNode } = useI18n();
  return (
    <>
      <span>{locale}</span>
      <span>{loading ? "loading" : "loaded"}</span>
      <span>{t("inventory.search.noResults")}</span>
      <span>{t("inventory.search.resultsFound", { count: 3 })}</span>
      <span>
        {tNode("inventory.search.help", {
          guideLink: <a href="/help">the guide</a>,
        })}
      </span>
    </>
  );
}

describe("I18nProvider", () => {
  test("uses loaded catalog messages", async () => {
    const catalog: ApiI18nCatalog = {
      locale: "hu",
      namespaces: ["inventory"],
      messages: {
        "inventory.search.help": "Olvasd el: {guideLink}.",
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
    expect(screen.getByText(/Olvasd el:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "the guide" })).toHaveAttribute("href", "/help");
  });

  test("uses fallback strings when no catalog message exists", () => {
    render(
      <I18nProvider
        initialCatalog={{
          locale: "en",
          namespaces: [],
          messages: {
            "inventory.search.help": "Read {guideLink}.",
            "inventory.search.noResults": "No results.",
            "inventory.search.resultsFound": "{count} results found.",
          },
        }}
        loadCatalog={() => Promise.resolve({ locale: "en", namespaces: [], messages: {} })}
        loadOnMount={false}
      >
        <TranslatedText />
      </I18nProvider>,
    );

    expect(screen.getByText("No results.")).toBeInTheDocument();
    expect(screen.getByText("3 results found.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "the guide" })).toHaveAttribute("href", "/help");
  });

  test("falls back to key when no catalog message exists", () => {
    render(
      <I18nProvider initialCatalog={{ locale: "en", namespaces: [], messages: {} }} loadOnMount={false}>
        <TranslatedText />
      </I18nProvider>,
    );

    expect(screen.getByText("inventory.search.noResults")).toBeInTheDocument();
    expect(screen.getByText("inventory.search.resultsFound")).toBeInTheDocument();
    expect(screen.getByText("inventory.search.help")).toBeInTheDocument();
  });
});
