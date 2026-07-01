package com.researchspace.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.researchspace.api.v1.model.ApiI18nCatalog;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.DefaultResourceLoader;

class I18nMessageCatalogManagerImplTest {

  @TempDir private Path tempDir;

  private I18nMessageCatalogManagerImpl manager;

  @BeforeEach
  void setUp() throws IOException {
    Path bundles = tempDir.resolve("bundles");
    Files.createDirectories(bundles.resolve("inventory"));
    Files.createDirectories(bundles.resolve("apps"));
    Files.writeString(
        bundles.resolve("ApplicationResources.properties"),
        "common.save=Save\ncommon.cancel=Cancel\n");
    Files.writeString(
        bundles.resolve("ApplicationResources_hu.properties"), "common.save=Mentés\n");
    Files.writeString(
        bundles.resolve("inventory/inventory.properties"),
        "inventory.search.noResults=No results\nshared.key=Inventory shared\n");
    Files.writeString(
        bundles.resolve("inventory/inventory_hu.properties"),
        "inventory.search.placeholder=Keresés\n");
    Files.writeString(bundles.resolve("apps/apps.properties"), "apps.title=Apps\n");

    String root = tempDir.toUri().toString();
    List<String> basenames =
        List.of(
            root + "bundles/ApplicationResources",
            root + "bundles/inventory/inventory",
            root + "bundles/apps/apps");

    ReloadableResourceBundleMessageSource messageSource =
        new ReloadableResourceBundleMessageSource();
    messageSource.setBasenames(basenames.toArray(String[]::new));
    messageSource.setDefaultEncoding("UTF-8");
    messageSource.setUseCodeAsDefaultMessage(true);

    manager =
        new I18nMessageCatalogManagerImpl(messageSource, new DefaultResourceLoader(), basenames);
    manager.initialiseBundleNamespaces();
  }

  @Test
  void getCatalogReturnsMessagesResolvedForLocaleWithFallbackKeys() {
    ApiI18nCatalog catalog = manager.getCatalog(Locale.forLanguageTag("hu"), null);

    assertEquals("hu", catalog.getLocale());
    assertEquals("Mentés", catalog.getMessages().get("common.save"));
    assertEquals("Cancel", catalog.getMessages().get("common.cancel"));
    assertEquals("Keresés", catalog.getMessages().get("inventory.search.placeholder"));
    assertTrue(catalog.getNamespaces().containsAll(List.of("common", "inventory", "apps")));
  }

  @Test
  void getCatalogFiltersByNamespace() {
    ApiI18nCatalog catalog = manager.getCatalog(Locale.ENGLISH, "inventory");

    assertEquals(List.of("inventory"), catalog.getNamespaces());
    assertEquals("No results", catalog.getMessages().get("inventory.search.noResults"));
    assertFalse(catalog.getMessages().containsKey("common.save"));
    assertFalse(catalog.getMessages().containsKey("apps.title"));
  }
}
