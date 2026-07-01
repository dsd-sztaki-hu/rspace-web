import type React from "react";
import { createContext, Fragment, useContext, useEffect, useMemo, useState } from "react";
import axios from "@/common/axios";

type I18nMessages = Record<string, string>;

type TranslationValues = Record<string, string | number | boolean | null | undefined>;
type RichTranslationValues = Record<string, React.ReactNode>;

export type Translate = (key: string, values?: TranslationValues) => string;
export type TranslateNode = (key: string, values?: RichTranslationValues) => React.ReactNode;

export type ApiI18nCatalog = {
  locale: string;
  namespaces: Array<string>;
  messages: I18nMessages;
};

type I18nContextValue = {
  locale: string;
  loading: boolean;
  messages: I18nMessages;
  providerPresent: boolean;
  t: Translate;
  tNode: TranslateNode;
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

  const { data } = await axios.get<ApiI18nCatalog>("/i18n/ajax/catalog", { params });
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

function interpolateNode(message: string, values?: RichTranslationValues): React.ReactNode {
  if (!values) {
    return message;
  }

  const nodes: Array<React.ReactNode> = [];
  const placeholderPattern = /\{([A-Za-z0-9_]+)\}/g;
  let lastIndex = 0;
  let match = placeholderPattern.exec(message);

  while (match !== null) {
    const [placeholder, key] = match;
    if (match.index > lastIndex) {
      nodes.push(message.slice(lastIndex, match.index));
    }

    nodes.push(<Fragment key={`${key}-${match.index}`}>{values[key] ?? placeholder}</Fragment>);
    lastIndex = match.index + placeholder.length;
    match = placeholderPattern.exec(message);
  }

  if (lastIndex < message.length) {
    nodes.push(message.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

const fallbackTranslate: Translate = (key, values) => interpolate(key, values);
const fallbackTranslateNode: TranslateNode = (key, values) => interpolateNode(key, values);

const I18nContext = createContext<I18nContextValue>({
  locale: emptyCatalog.locale,
  loading: false,
  messages: emptyCatalog.messages,
  providerPresent: false,
  t: fallbackTranslate,
  tNode: fallbackTranslateNode,
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
    const t: Translate = (key, values) => interpolate(catalog.messages[key] ?? key, values);
    const tNode: TranslateNode = (key, values) => interpolateNode(catalog.messages[key] ?? key, values);
    return {
      locale: catalog.locale,
      loading,
      messages: catalog.messages,
      providerPresent: true,
      t,
      tNode,
    };
  }, [catalog, loading]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
