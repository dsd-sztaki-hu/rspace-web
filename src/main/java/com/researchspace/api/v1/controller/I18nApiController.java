package com.researchspace.api.v1.controller;

import com.researchspace.api.v1.I18nApi;
import com.researchspace.api.v1.model.ApiI18nCatalog;
import com.researchspace.service.I18nMessageCatalogManager;
import java.util.Locale;
import javax.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;

@ApiController
public class I18nApiController extends BaseApiController implements I18nApi {

  private @Autowired I18nMessageCatalogManager i18nMessageCatalogManager;

  @Override
  public ApiI18nCatalog messages(String namespaces, HttpServletRequest request) {
    Locale locale = request.getLocale();
    return i18nMessageCatalogManager.getCatalog(locale, namespaces);
  }
}
