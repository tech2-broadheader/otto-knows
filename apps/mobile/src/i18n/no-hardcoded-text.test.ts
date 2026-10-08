// Story 13.3 AC1: user-facing copy lives in the catalog, not in components.
// Parses the UI source with the TypeScript compiler and reports text that
// looks user-facing: JSX text, string text props, sentence-like strings, and
// strings under message-like object keys. Data, styles and identifiers are not
// flagged. Add a true exception to ALLOWED with a reason.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");
const SCANNED = ["screens", "components", "design", "hooks", "lib", "auth", "connectors"];

/** JSX props whose string value is shown or read aloud to the user. */
const TEXT_PROPS = new Set([
  "label",
  "title",
  "sub",
  "body",
  "detail",
  "hint",
  "placeholder",
  "message",
  "action",
  "accessibilityLabel",
  "accessibilityHint",
  "loadingLabel",
  "doneLabel",
  "text",
]);

/** Object keys whose string value is shown to the user. */
const TEXT_KEYS = new Set([
  "l",
  "label",
  "title",
  "sub",
  "subtitle",
  "body",
  "description",
  "detail",
  "purpose",
  "message",
  "text",
  "hint",
  "tagline",
  "action",
  "error",
  "name",
]);

/** "file:text" pairs that are not translatable copy. */
const ALLOWED = new Set<string>([]);

const SENTENCE = /[A-Za-z]{2,}[ ,.!?'’—-]+[A-Za-z]{2,}/;
const WORD = /[A-Za-z]{2,}/;
const URL_LIKE = /^`?https?:\/\//;
/** Asset / font identifiers such as PlusJakartaSans_400Regular. */
const IDENTIFIER = /^\w+_\w+$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function isNonCopyContext(node: ts.Node): boolean {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isLiteralTypeNode(parent)) return true;
  // Comparisons and switch cases on string values are logic, not copy.
  if (ts.isBinaryExpression(parent) && /=/.test(parent.operatorToken.getText())) return true;
  if (ts.isCaseClause(parent)) return true;
  if (ts.isElementAccessExpression(parent)) return true;
  // Developer-facing errors are not copy.
  if (ts.isNewExpression(parent) && parent.expression.getText() === "Error") return true;
  // t("some.key") — the key itself.
  if (ts.isCallExpression(parent) && parent.expression.getText() === "t") return true;
  return false;
}

function findings(path: string): string[] {
  const source = readFileSync(path, "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(SRC, path).replace(/\\/g, "/");
  const out: string[] = [];
  const report = (node: ts.Node, text: string): void => {
    const clean = text.trim().replace(/\s+/g, " ");
    if (ALLOWED.has(`${rel}:${clean}`) || URL_LIKE.test(clean) || IDENTIFIER.test(clean)) return;
    const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    out.push(`${rel}:${line}  ${clean}`);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && WORD.test(node.getText())) {
      report(node, node.getText());
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const text = node.text;
      if (!isNonCopyContext(node) && WORD.test(text)) {
        if (ts.isJsxAttribute(parent) && TEXT_PROPS.has(parent.name.getText())) report(node, text);
        else if (
          ts.isJsxExpression(parent) &&
          ts.isJsxAttribute(parent.parent) &&
          TEXT_PROPS.has(parent.parent.name.getText())
        )
          report(node, text);
        else if (ts.isJsxExpression(parent) && !ts.isJsxAttribute(parent.parent))
          report(node, text);
        else if (
          ts.isBindingElement(parent) &&
          parent.initializer === node &&
          TEXT_PROPS.has(parent.name.getText())
        )
          report(node, text);
        else if (
          ts.isPropertyAssignment(parent) &&
          parent.initializer === node &&
          TEXT_KEYS.has(parent.name.getText())
        )
          report(node, text);
        else if (SENTENCE.test(text) && !/^[\w./@-]+$/.test(text)) report(node, text);
      }
    } else if (ts.isTemplateExpression(node)) {
      const pieces = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ");
      if (SENTENCE.test(pieces) && !isNonCopyContext(node)) report(node, node.getText());
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

describe("user-facing text lives in the string catalog (story 13.3)", () => {
  it("has no hard-coded copy in screens, components, design, hooks or lib", () => {
    const all = SCANNED.flatMap((dir) => files(join(SRC, dir))).flatMap(findings);
    expect(all).toEqual([]);
  });
});
