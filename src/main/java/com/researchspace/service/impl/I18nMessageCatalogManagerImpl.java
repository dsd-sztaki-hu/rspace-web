package com.researchspace.service.impl;

import com.researchspace.api.v1.model.ApiI18nCatalog;
import com.researchspace.service.I18nMessageCatalogManager;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

@Service("i18nMessageCatalogManager")
@Slf4j
public class I18nMessageCatalogManagerImpl implements I18nMessageCatalogManager {

  private static final String CLASSPATH_PREFIX = "classpath:";
  private static final String BUNDLES_PATH = "bundles/";
  private static final String COMMON_NAMESPACE = "common";

  private final MessageSource messageSource;
  private final ResourceLoader resourceLoader;
  private final List<String> bundleBasenames;
  private List<BundleNamespace> bundleNamespaces;

  @Autowired
  public I18nMessageCatalogManagerImpl(
      MessageSource messageSource,
      ResourceLoader resourceLoader,
      @Qualifier("messageBundleBasenames") List<String> bundleBasenames) {
    this.messageSource = messageSource;
    this.resourceLoader = resourceLoader;
    this.bundleBasenames = List.copyOf(bundleBasenames);
  }

  @PostConstruct
  public void initialiseBundleNamespaces() {
    bundleNamespaces =
        bundleBasenames.stream()
            .map(basename -> new BundleNamespace(basename, namespaceFor(basename)))
            .collect(Collectors.toList());
  }

  @Override
  public ApiI18nCatalog getCatalog(Locale locale, String requestedNamespaces) {
    Locale catalogLocale = locale == null ? Locale.getDefault() : locale;
    Set<String> namespaceFilter = parseNamespaces(requestedNamespaces);
    LinkedHashSet<String> includedNamespaces = new LinkedHashSet<>();
    Map<String, String> messages = new LinkedHashMap<>();

    for (BundleNamespace bundleNamespace : bundleNamespaces) {
      if (!namespaceFilter.isEmpty() && !namespaceFilter.contains(bundleNamespace.namespace())) {
        continue;
      }
      includedNamespaces.add(bundleNamespace.namespace());
      for (String key : keysInBundle(bundleNamespace.basename(), catalogLocale)) {
        messages.putIfAbsent(key, resolveMessage(key, catalogLocale));
      }
    }

    return new ApiI18nCatalog(
        catalogLocale.toLanguageTag(), new ArrayList<>(includedNamespaces), messages);
  }

  private Set<String> parseNamespaces(String requestedNamespaces) {
    if (requestedNamespaces == null || requestedNamespaces.isBlank()) {
      return Collections.emptySet();
    }
    return List.of(requestedNamespaces.split(",")).stream()
        .map(String::trim)
        .filter(namespace -> !namespace.isEmpty())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private Set<String> keysInBundle(String basename, Locale locale) {
    LinkedHashSet<String> keys = new LinkedHashSet<>();
    for (String resourceLocation : resourceLocationsFor(basename, locale)) {
      Resource resource = resourceLoader.getResource(resourceLocation);
      if (!resource.exists()) {
        continue;
      }
      Properties properties = new Properties();
      try (InputStream inputStream = resource.getInputStream()) {
        properties.load(inputStream);
      } catch (IOException e) {
        log.warn("Unable to load i18n message bundle {}", resourceLocation, e);
        continue;
      }
      properties.stringPropertyNames().forEach(keys::add);
    }
    return keys;
  }

  private List<String> resourceLocationsFor(String basename, Locale locale) {
    List<String> locations = new ArrayList<>();
    locations.add(basename + ".properties");
    if (!locale.getLanguage().isEmpty()) {
      locations.add(basename + "_" + locale.getLanguage() + ".properties");
    }
    if (!locale.getCountry().isEmpty()) {
      locations.add(
          basename + "_" + locale.getLanguage() + "_" + locale.getCountry() + ".properties");
    }
    if (!locale.getVariant().isEmpty()) {
      locations.add(
          basename
              + "_"
              + locale.getLanguage()
              + "_"
              + locale.getCountry()
              + "_"
              + locale.getVariant()
              + ".properties");
    }
    return locations;
  }

  private String resolveMessage(String key, Locale locale) {
    try {
      return messageSource.getMessage(key, null, locale);
    } catch (NoSuchMessageException e) {
      return key;
    }
  }

  private String namespaceFor(String basename) {
    String normalised = stripPrefix(basename, CLASSPATH_PREFIX);
    int bundlesIndex = normalised.lastIndexOf("/" + BUNDLES_PATH);
    if (bundlesIndex != -1) {
      normalised = normalised.substring(bundlesIndex + BUNDLES_PATH.length() + 1);
    } else {
      normalised = stripPrefix(normalised, BUNDLES_PATH);
    }

    int slashIndex = normalised.indexOf('/');
    if (slashIndex == -1) {
      return COMMON_NAMESPACE;
    }
    return normalised.substring(0, slashIndex);
  }

  private String stripPrefix(String value, String prefix) {
    return value.startsWith(prefix) ? value.substring(prefix.length()) : value;
  }

  private record BundleNamespace(String basename, String namespace) {}
}
