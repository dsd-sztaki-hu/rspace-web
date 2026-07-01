package com.researchspace.service;

import com.researchspace.api.v1.model.ApiI18nCatalog;
import java.util.Locale;

/** Builds translated message catalogs for frontend clients. */
public interface I18nMessageCatalogManager {

  /**
   * Returns messages for the requested locale, optionally limited to comma-separated namespaces.
   *
   * @param locale locale to resolve messages for
   * @param requestedNamespaces comma-separated namespace names, or {@code null} for all namespaces
   * @return resolved message catalog
   */
  ApiI18nCatalog getCatalog(Locale locale, String requestedNamespaces);
}
