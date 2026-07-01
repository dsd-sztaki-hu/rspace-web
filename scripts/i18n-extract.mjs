#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const USER_FACING_PROPS = new Set([
  "aria-label",
  "emptyText",
  "helperText",
  "label",
  "placeholder",
  "primary",
  "secondary",
  "title",
  "tooltip",
  "alt",
  "subheader"
]);

const NON_USER_FACING_JSX_PROPS = new Set([
  "className",
  "color",
  "component",
  "data-testid",
  "data-test-id",
  "id",
  "orientation",
  "rel",
  "role",
  "slot",
  "style",
  "sx",
  "target",
  "to",
  "type",
  "value",
  "variant",
]);

const NON_USER_FACING_OBJECT_KEYS = new Set([
  "alignItems",
  "background",
  "backgroundColor",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundSize",
  "border",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderRadius",
  "bottom",
  "boxShadow",
  "color",
  "display",
  "flexDirection",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "gap",
  "height",
  "justifyContent",
  "left",
  "lineHeight",
  "margin",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxHeight",
  "maxWidth",
  "mb",
  "minHeight",
  "mt",
  "overflow",
  "overscrollBehavior",
  "p",
  "padding",
  "position",
  "right",
  "textAlign",
  "textDecoration",
  "textTransform",
  "top",
  "transform",
  "transition",
  "width",
  "zIndex",
]);

const REPO_ROOT = process.cwd();
const UI_SRC = path.join(REPO_ROOT, "src/main/webapp/ui/src");
const BUNDLES_ROOT = path.join(REPO_ROOT, "src/main/resources/bundles");

function usage(exitCode = 1) {
  console.log(`Usage:
  pnpm run i18n:extract -- --file <tsx-file> --namespace <bundle-name> [options]

Options:
  --key-prefix <prefix>   Prefix for generated keys. Defaults from file path.
  --bundle <file>         Bundle file. Defaults from namespace, e.g. inventory -> bundles/inventory/inventory.properties.
  --dry-run               Print planned changes without writing files.

Examples:
  pnpm run i18n:extract -- --file src/main/webapp/ui/src/Inventory/Search/components/NoResults.tsx --namespace inventory --dry-run
  pnpm run i18n:extract -- --file src/main/webapp/ui/src/Inventory/Search/components/NoResults.tsx --namespace inventory --key-prefix inventory.search
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { dryRun: false };
  const parsedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  for (let i = 0; i < parsedArgv.length; i += 1) {
    const arg = parsedArgv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--file" || arg === "--namespace" || arg === "--key-prefix" || arg === "--bundle") {
      const value = parsedArgv[i + 1];
      if (!value) usage();
      args[arg.slice(2)] = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }
  if (!args.file || !args.namespace) usage();
  return args;
}

function namespaceBundle(namespace) {
  if (namespace === "common") {
    return path.join(BUNDLES_ROOT, "ApplicationResources.properties");
  }
  return path.join(BUNDLES_ROOT, namespace, `${namespace}.properties`);
}

function defaultKeyPrefix(filePath, namespace) {
  const relative = path.relative(UI_SRC, filePath).replaceAll(path.sep, "/").replace(/\.[jt]sx$/, "");
  const withoutIndex = relative.replace(/\/index$/, "");
  const parts = withoutIndex
    .split("/")
    .filter((part) => !["src", "components", "__tests__"].includes(part))
    .map((part) => part.replace(/^[A-Z]/, (c) => c.toLowerCase()));
  if (parts[0]?.toLowerCase() === namespace.toLowerCase()) {
    parts.shift();
  }
  return [namespace, ...parts].join(".");
}

function normaliseText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function hasUserFacingText(text) {
  const trimmed = normaliseText(text);
  return /[A-Za-zÀ-ž]/.test(trimmed) && !isObviouslyNonUserFacingString(trimmed);
}

function isObviouslyNonUserFacingString(text) {
  return (
    /^https?:\/\//.test(text) ||
    /^\/[\w./-]*$/.test(text) ||
    /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(text) ||
    /^-?\d*\.?\d+(px|r?em|vh|vw|%|s|ms|fr|deg)$/.test(text) ||
    /^(absolute|auto|block|bold|border-box|center|column|contain|contents|cover|flex|grid|hidden|inherit|inline|inline-block|none|normal|nowrap|relative|row|solid|static|sticky|transparent|underline)$/.test(
      text,
    ) ||
    /^(primary|secondary|success|error|warning|info|small|medium|large|standard|outlined|contained|text)$/.test(text)
  );
}

function wordsForKey(text, maxWords = 6) {
  const words = normaliseText(text)
    .replace(/['’]/g, "")
    .replace(/[^A-Za-zÀ-ž0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords);
  return words.length ? words : ["text"];
}

function toCamel(words) {
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function makeUniqueKey(baseKey, usedKeys) {
  let key = baseKey;
  let index = 2;
  while (usedKeys.has(key)) {
    key = `${baseKey}${index}`;
    index += 1;
  }
  usedKeys.add(key);
  return key;
}

function propertyEscape(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n");
}

function parseExistingKeys(bundlePath) {
  if (!fs.existsSync(bundlePath)) return new Set();
  const keys = new Set();
  for (const line of fs.readFileSync(bundlePath, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([^:=\s]+)\s*[:=]/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function isInsideRange(node, ranges) {
  return ranges.some(({ start, end }) => node.getStart() >= start && node.getEnd() <= end);
}

function hasAncestor(node, predicate) {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return true;
    current = current.parent;
  }
  return false;
}

function propertyNameText(name) {
  if (!name) return "";
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return name.getText();
}

function isInsideJsxProp(node, propNames) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxAttribute(current)) {
      return propNames.has(current.name.getText());
    }
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isInsideNonUserFacingObjectProperty(node) {
  let current = node.parent;
  while (current) {
    if (ts.isPropertyAssignment(current)) {
      const key = propertyNameText(current.name);
      if (NON_USER_FACING_OBJECT_KEYS.has(key) || key.startsWith("&") || key.startsWith("@")) {
        return true;
      }
    }
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function shouldIgnoreStringLiteral(node) {
  return (
    isObviouslyNonUserFacingString(node.text) ||
    isInsideJsxProp(node, NON_USER_FACING_JSX_PROPS) ||
    isInsideNonUserFacingObjectProperty(node) ||
    hasAncestor(node, (ancestor) => ts.isImportDeclaration(ancestor) || ts.isExportDeclaration(ancestor))
  );
}

function meaningfulChildren(children) {
  return children.filter((child) => {
    if (ts.isJsxText(child)) return hasUserFacingText(child.getText());
    if (ts.isJsxExpression(child)) return child.expression !== undefined;
    return true;
  });
}

function jsxTextOf(node) {
  return node
    .getText()
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function childPlaceholder(child, fallbackIndex) {
  const tag = ts.isJsxElement(child) ? child.openingElement.tagName.getText() : "node";
  const text = jsxTextOf(child);
  const textPart = toCamel(wordsForKey(text, 3));
  return `${textPart}${tag.charAt(0).toUpperCase()}${tag.slice(1)}${fallbackIndex === 1 ? "" : fallbackIndex}`;
}

function simpleJsxTextChild(element) {
  const meaningful = meaningfulChildren(element.children);
  return meaningful.length === 1 && ts.isJsxText(meaningful[0]) ? meaningful[0] : null;
}

function buildRichReplacement(node, sourceText, keyPrefix, usedKeys, additions, skipped) {
  const children = meaningfulChildren(node.children);
  if (!children.some(ts.isJsxText) || !children.some(ts.isJsxElement)) {
    return null;
  }
  if (children.some((child) => ts.isJsxExpression(child) && child.expression !== undefined)) {
    skipped.push({
      line: lineOf(sourceText, node.getStart()),
      reason: "rich JSX block contains expressions",
      text: normaliseText(node.getText()).slice(0, 120),
    });
    return null;
  }

  const placeholders = new Map();
  const messageParts = [];
  const keyWords = [];
  let elementIndex = 1;
  for (const child of children) {
    if (ts.isJsxText(child)) {
      const text = normaliseText(child.getText());
      if (text) {
        messageParts.push(text);
        keyWords.push(...wordsForKey(text, 4));
      }
    } else if (ts.isJsxElement(child)) {
      const placeholder = childPlaceholder(child, elementIndex);
      placeholders.set(child, placeholder);
      messageParts.push(`{${placeholder}}`);
      keyWords.push(...wordsForKey(jsxTextOf(child), 3));
      elementIndex += 1;
    } else {
      return null;
    }
  }

  const message = messageParts.join(" ").replace(/\s+([.,;:!?])/g, "$1");
  const key = makeUniqueKey(`${keyPrefix}.${toCamel(keyWords.slice(0, 6))}`, usedKeys);
  additions.set(key, message);

  const valueEntries = [];
  for (const [child, placeholder] of placeholders.entries()) {
    let childSource = sourceText.slice(child.getStart(), child.getEnd());
    if (ts.isJsxElement(child)) {
      const labelNode = simpleJsxTextChild(child);
      if (labelNode) {
        const label = normaliseText(labelNode.getText());
        const labelKey = makeUniqueKey(`${key}.${placeholder}`, usedKeys);
        additions.set(labelKey, label);
        const relativeStart = labelNode.getStart() - child.getStart();
        const relativeEnd = labelNode.getEnd() - child.getStart();
        childSource = `${childSource.slice(0, relativeStart)}{t("${labelKey}")}${childSource.slice(
          relativeEnd,
        )}`;
      }
    }
    valueEntries.push(`  ${placeholder}: (${childSource}),`);
  }

  return {
    start: node.openingElement.end,
    end: node.closingElement.pos,
    text: `{tNode("${key}", {\n${valueEntries.join("\n")}\n})}`,
    key,
  };
}

function lineOf(sourceText, position) {
  return sourceText.slice(0, position).split(/\r?\n/).length;
}

function addImport(sourceText) {
  if (sourceText.includes("@/i18n/I18nContext")) return sourceText;
  const imports = [...sourceText.matchAll(/^import .*?;$/gm)];
  if (!imports.length) return `import { useI18n } from "@/i18n/I18nContext";\n${sourceText}`;
  const lastImport = imports.at(-1);
  const insertAt = lastImport.index + lastImport[0].length;
  return `${sourceText.slice(0, insertAt)}\nimport { useI18n } from "@/i18n/I18nContext";${sourceText.slice(insertAt)}`;
}

function findHookInsertion(sourceFile, sourceText) {
  let insertion = null;
  function visit(node) {
    if (insertion !== null) return;
    if (ts.isFunctionDeclaration(node) && node.body && /^[A-Z]/.test(node.name?.text ?? "")) {
      insertion = node.body.getStart(sourceFile) + 1;
      return;
    }
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(
        (declaration) =>
          ts.isIdentifier(declaration.name) &&
          /^[A-Z]/.test(declaration.name.text) &&
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) &&
          declaration.initializer.body &&
          ts.isBlock(declaration.initializer.body),
      )
    ) {
      const declaration = node.declarationList.declarations[0];
      insertion = declaration.initializer.body.getStart(sourceFile) + 1;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (insertion === null) {
    const firstBrace = sourceText.indexOf("{");
    return firstBrace === -1 ? null : firstBrace + 1;
  }
  return insertion;
}

function addHook(sourceFile, sourceText) {
  if (sourceText.includes("useI18n()")) return sourceText;
  const insertion = findHookInsertion(sourceFile, sourceText);
  if (insertion === null) return sourceText;
  return `${sourceText.slice(0, insertion)}\n  const { t, tNode } = useI18n();${sourceText.slice(insertion)}`;
}

function extract(args) {
  const filePath = path.resolve(REPO_ROOT, args.file);
  const bundlePath = path.resolve(REPO_ROOT, args.bundle ?? namespaceBundle(args.namespace));
  const keyPrefix = args["key-prefix"] ?? defaultKeyPrefix(filePath, args.namespace);
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const existingKeys = parseExistingKeys(bundlePath);
  const usedKeys = new Set(existingKeys);
  const additions = new Map();
  const replacements = [];
  const skipped = [];
  const richRanges = [];

  function collectRich(node) {
    if (ts.isJsxElement(node)) {
      const replacement = buildRichReplacement(node, sourceText, keyPrefix, usedKeys, additions, skipped);
      if (replacement) {
        replacements.push(replacement);
        richRanges.push({ start: node.getStart(), end: node.getEnd() });
        return;
      }
    }
    ts.forEachChild(node, collectRich);
  }
  collectRich(sourceFile);

  function collectSimple(node) {
    if (isInsideRange(node, richRanges)) return;

    if (ts.isJsxText(node) && hasUserFacingText(node.getText())) {
      const text = normaliseText(node.getText());
      const key = makeUniqueKey(`${keyPrefix}.${toCamel(wordsForKey(text))}`, usedKeys);
      additions.set(key, text);
      replacements.push({ start: node.getStart(), end: node.getEnd(), text: `{t("${key}")}`, key });
      return;
    }

    if (
      ts.isJsxAttribute(node) &&
      USER_FACING_PROPS.has(node.name.getText()) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      hasUserFacingText(node.initializer.text)
    ) {
      const text = normaliseText(node.initializer.text);
      const propName = node.name.getText().replace(/[^A-Za-z0-9]+/g, " ");
      const key = makeUniqueKey(`${keyPrefix}.${toCamel([...wordsForKey(text, 5), ...wordsForKey(propName, 2)])}`, usedKeys);
      additions.set(key, text);
      replacements.push({ start: node.initializer.getStart(), end: node.initializer.getEnd(), text: `{t("${key}")}`, key });
      return;
    }

    if (
      ts.isStringLiteral(node) &&
      hasUserFacingText(node.text) &&
      !shouldIgnoreStringLiteral(node)
    ) {
      skipped.push({
        line: lineOf(sourceText, node.getStart()),
        reason: "string literal is not in an allow-listed JSX prop",
        text: node.text,
      });
    }

    ts.forEachChild(node, collectSimple);
  }
  collectSimple(sourceFile);

  let nextSource = sourceText;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    nextSource = `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`;
  }
  if (replacements.length) {
    nextSource = addImport(nextSource);
    const reparsed = ts.createSourceFile(filePath, nextSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    nextSource = addHook(reparsed, nextSource);
  }

  const newBundleLines = [...additions.entries()]
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => `${key}=${propertyEscape(value)}`);

  return { additions, bundlePath, filePath, keyPrefix, newBundleLines, nextSource, replacements, skipped, sourceText };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = extract(args);

  console.log(`File: ${path.relative(REPO_ROOT, result.filePath)}`);
  console.log(`Bundle: ${path.relative(REPO_ROOT, result.bundlePath)}`);
  console.log(`Key prefix: ${result.keyPrefix}`);
  console.log(`Replacements: ${result.replacements.length}`);
  console.log(`New keys: ${result.newBundleLines.length}`);

  if (result.skipped.length) {
    console.log("\nSkipped for manual review:");
    for (const skipped of result.skipped) {
      console.log(`  line ${skipped.line}: ${skipped.reason}: "${skipped.text}"`);
    }
  }

  if (result.newBundleLines.length) {
    console.log("\nKeys to append:");
    for (const line of result.newBundleLines) console.log(`  ${line}`);
  }

  if (args.dryRun) {
    console.log("\nDry run: no files were changed.");
    return;
  }

  if (result.replacements.length) {
    fs.writeFileSync(result.filePath, result.nextSource);
  }
  if (result.newBundleLines.length) {
    const existing = fs.existsSync(result.bundlePath) ? fs.readFileSync(result.bundlePath, "utf8") : "";
    const prefix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
    fs.writeFileSync(result.bundlePath, `${existing}${prefix}\n# React UI messages generated by i18n extractor\n${result.newBundleLines.join("\n")}\n`);
  }
}

main();
