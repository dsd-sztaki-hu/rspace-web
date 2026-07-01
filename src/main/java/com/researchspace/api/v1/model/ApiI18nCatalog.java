package com.researchspace.api.v1.model;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Message catalog resolved for a specific locale. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiI18nCatalog {

  private String locale;
  private List<String> namespaces;
  private Map<String, String> messages;
}
