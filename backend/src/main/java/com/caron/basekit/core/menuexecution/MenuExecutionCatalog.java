package com.caron.basekit.core.menuexecution;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.List;
@Component
public class MenuExecutionCatalog {
 public record Entry(String MENU_ID, List<String> PROGRAM_KEYS) {}
 private final List<Entry> entries;
 public MenuExecutionCatalog(ObjectMapper mapper) throws IOException {
  try(var input = new ClassPathResource("menu-execution-catalog.json").getInputStream()) {
   entries = List.of(mapper.readValue(input, Entry[].class));
  }
 }
 public List<String> rootIds() { return entries.stream().map(Entry::MENU_ID).toList(); }
 public boolean containsProgram(String menuId, String programKey) {
  return entries.stream().anyMatch(e -> e.MENU_ID().equals(menuId) && e.PROGRAM_KEYS().contains(programKey));
 }
 public String rootForProgram(String programKey) {
  return entries.stream().filter(e -> e.PROGRAM_KEYS().contains(programKey)).map(Entry::MENU_ID).findFirst().orElse(null);
 }
}
