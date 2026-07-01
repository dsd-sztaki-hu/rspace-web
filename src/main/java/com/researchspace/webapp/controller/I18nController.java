package com.researchspace.webapp.controller;

import com.researchspace.api.v1.model.ApiI18nCatalog;
import com.researchspace.service.I18nMessageCatalogManager;
import java.util.Locale;
import javax.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/** Translated UI message catalog for session-authenticated web clients. */
@Controller
@RequestMapping("/i18n/ajax")
public class I18nController extends BaseController {

  private @Autowired I18nMessageCatalogManager i18nMessageCatalogManager;

  @GetMapping("/catalog")
  @ResponseBody
  public ApiI18nCatalog messages(
      @RequestParam(name = "namespaces", required = false) String namespaces,
      HttpServletRequest request) {
    Locale locale = request.getLocale();
    return i18nMessageCatalogManager.getCatalog(locale, namespaces);
  }
}
