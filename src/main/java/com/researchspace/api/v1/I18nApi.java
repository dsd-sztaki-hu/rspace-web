package com.researchspace.api.v1;

import com.researchspace.api.v1.model.ApiI18nCatalog;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

/** Translated UI message catalog for frontend clients. */
@RequestMapping("/api/v1/i18n")
public interface I18nApi {

  @GetMapping
  ApiI18nCatalog messages(
      @RequestParam(name = "namespaces", required = false) String namespaces,
      HttpServletRequest request);
}
