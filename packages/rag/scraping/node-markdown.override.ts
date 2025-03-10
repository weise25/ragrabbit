export const defaultATransformer = {
  a: ({ node, options, visitor }) => {
    const href = node.getAttribute("href");
    if (!href) return {};

    // Encodes symbols that can cause problems in markdown
    let encodedHref = "";
    for (const chr of href) {
      switch (chr) {
        case "(":
          encodedHref += "%28";
          break;
        case ")":
          encodedHref += "%29";
          break;
        case "_":
          encodedHref += "%5F";
          break;
        case "*":
          encodedHref += "%2A";
          break;
        default:
          encodedHref += chr;
      }
    }

    const title = node.getAttribute("title");

    // Inline link, when possible
    // See: https://github.com/crosstype/node-html-markdown/issues/17
    if (node.textContent === href && options.useInlineLinks) return { content: `<${encodedHref}>` };

    return {
      // RagRabbit: added a trim:
      postprocess: ({ content }) => content.replace(/(?:\r?\n)+/g, " ").trim(),
      childTranslators: visitor.instance.aTagTranslators,
      prefix: "[",
      postfix:
        "]" +
        (!options.useLinkReferenceDefinitions
          ? `(${encodedHref}${title ? ` "${title}"` : ""})`
          : `[${visitor.addOrGetUrlDefinition(encodedHref)}]`),
    };
  },
};
