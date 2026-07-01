import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import ElnApiService from "@/common/ElnApiService";

type I18nMessages = Record<string, string>;

type TranslationValues = Record<string, string | number | boolean | null | undefined>;

export type Translate = (key: string, fallback?: string, values?: TranslationValues) => string;

export type ApiI18nCatalog = {
  locale: string;
  namespaces: Array<string>;
  messages: I18nMessages;
};

type I18nContextValue = {
  locale: string;
  loading: boolean;
  messages: I18nMessages;
  t: Translate;
};

type I18nProviderArgs = {
  children: React.ReactNode;
  initialCatalog?: ApiI18nCatalog;
  loadCatalog?: (namespaces: ReadonlyArray<string>) => Promise<ApiI18nCatalog>;
  loadOnMount?: boolean;
  namespaces?: ReadonlyArray<string>;
};

const emptyCatalog: ApiI18nCatalog = {
  locale: "en",
  namespaces: [],
  messages: {},
};

export async function fetchI18nCatalog(namespaces: ReadonlyArray<string>): Promise<ApiI18nCatalog> {
  const params = new URLSearchParams();
  if (namespaces.length > 0) {
    params.set("namespaces", namespaces.join(","));
  }

  const { data } = await ElnApiService.query<ApiI18nCatalog>("i18n", params);
  return data;
}

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) {
    return message;
  }

  return message.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, key: string) => {
    const value = values[key];
    return value === null || typeof value === "undefined" ? placeholder : String(value);
  });
}

const fallbackTranslate: Translate = (key, fallback, values) => interpolate(fallback ?? key, values);

const I18nContext = createContext<I18nContextValue>({
  locale: emptyCatalog.locale,
  loading: false,
  messages: emptyCatalog.messages,
  t: fallbackTranslate,
});

export function I18nProvider({
  children,
  initialCatalog,
  loadCatalog = fetchI18nCatalog,
  loadOnMount = true,
  namespaces = [],
}: I18nProviderArgs): React.ReactNode {
  const [catalog, setCatalog] = useState(initialCatalog ?? emptyCatalog);
  const [loading, setLoading] = useState(loadOnMount && !initialCatalog);
  const namespacesKey = namespaces.join(",");

  useEffect(() => {
    if (!loadOnMount) {
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      try {
        const loadedCatalog = await loadCatalog(namespaces);
        if (!cancelled) {
          setCatalog(loadedCatalog);
        }
      } catch (e) {
        /*
         * Translation loading must not block the app. Components keep rendering
         * with their fallback strings until a later page load succeeds.
         */
        console.warn("Unable to load translations", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [loadCatalog, loadOnMount, namespacesKey]);

  const value = useMemo<I18nContextValue>(() => {
    const t: Translate = (key, fallback, values) => interpolate(catalog.messages[key] ?? fallback ?? key, values);
    return {
      locale: catalog.locale,
      loading,
      messages: catalog.messages,
      t,
    };
  }, [catalog, loading]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
