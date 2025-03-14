import { RateLimitError, UserError } from "@repo/core";
import { logger } from "@repo/logger";
import * as cheerio from "cheerio";
import * as contentTypeHelper from "content-type";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { RagMetadata } from "@repo/db/schema";
import { defaultATransformer } from "./node-markdown.override";
import { reformatContentLLM } from "./scraping.llm";
import { extractMetadata } from "./metadata.extract";

const MAX_SCRAPE_SIZE = process.env.MAX_SCRAPE_SIZE ? parseInt(process.env.MAX_SCRAPE_SIZE) : 1024 * 400;
const MAX_LLM_TRANSFORM_SIZE = process.env.MAX_LLM_TRANSFORM_SIZE
  ? parseInt(process.env.MAX_LLM_TRANSFORM_SIZE)
  : 1024 * 55;

export async function scrapeUrl(
  url: string,
  options: {
    stripLinks?: boolean;
    stripImages?: boolean;
    stripHeader?: boolean;
    stripFooter?: boolean;
    stripQueries?: string;
    allowSubdomains?: boolean;
    allowLinksRegexp?: string;
    excludeLinksRegexp?: string;
    supportedContentTypes?: string[];
    transformStrategy?: "llm" | "markdown";
  }
) {
  options = {
    stripLinks: false,
    stripImages: true,
    stripHeader: true,
    stripFooter: true,
    allowSubdomains: false,
    transformStrategy: "llm",
    stripQueries: "aside, nav",
    supportedContentTypes: ["text/html", "application/xhtml+xml", "text/plain", "text/markdown", "text/x-markdown"],
    ...options,
  };
  logger.info({ url }, "Scraping URL");

  const urlParts = new URL(url);
  const hostname = urlParts.hostname.toLowerCase().replace("www.", "");
  const domain = hostname.split(".").slice(-2).join(".");
  const response = await fetch(url);
  let redirectedUrl = url;
  if (response.redirected) {
    redirectedUrl = response.url;
  }
  if (response.status === 429) {
    throw new RateLimitError("Rate limit reached");
  }
  if (response.status !== 200) {
    throw new UserError("Failed to fetch, error from server: " + response.statusText + " status: " + response.status);
  }

  const contentType = contentTypeHelper.parse(response.headers.get("content-type"));
  if (!options.supportedContentTypes.includes(contentType.type)) {
    return { unsuportedContent: true, contentType: contentType.type };
  }
  const html = await response.text();

  const $ = cheerio.load(html);
  const title = $("title").first().text();
  const description = $("meta[name='description']").first().attr("content") || "";
  logger.debug("Scraped HTML for page", { title });

  const canonicalUrl = $("link[rel='canonical']").first().attr("href") || redirectedUrl;

  // Collect links to be scraped later:
  let links: string[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || !URL.canParse(href, url)) {
      return;
    }
    const urlHref = new URL(href, urlParts);

    if (options.allowSubdomains) {
      // Same domain regardless of subdomain:
      const urlDomain = urlHref.hostname.toLowerCase().split(".").slice(-2).join(".");
      if (urlDomain != domain) {
        return;
      }
    } else if (urlHref.hostname.toLowerCase().replace("www.", "") != hostname) {
      // Only exact domain:
      return;
    }

    if (options.allowLinksRegexp) {
      const allowLinksRegexp = new RegExp(options.allowLinksRegexp);
      if (!allowLinksRegexp.test(urlHref.toString())) {
        return;
      }
    }

    if (options.excludeLinksRegexp) {
      const excludeLinksRegexp = new RegExp(options.excludeLinksRegexp);
      if (excludeLinksRegexp.test(urlHref.toString())) {
        return;
      }
    }

    // Skip image file extensions
    const ext = urlHref.pathname.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "gif", "svg", "webp", "ico"].includes(ext)) {
      return;
    }

    // Collect url with protocol hostname and path
    let newUrl = urlHref.protocol + "//" + urlHref.hostname + urlHref.pathname;
    links.push(newUrl.toLowerCase());
  });

  // Clean up and shorten the content:
  // Strip links:
  if (options.stripLinks) {
    $("a").attr("href", "");
  } else {
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || !URL.canParse(href, url)) return;
      const urlHref = new URL(href, urlParts);

      // Absolute links to same domain become relative:
      if (urlHref.hostname.replace("www.", "") == hostname) {
        const relativeUrl = urlHref.pathname + urlHref.search + urlHref.hash;
        $(el).attr("href", relativeUrl);
      }

      // Strip anchor links to the same page:
      if (
        urlHref.hostname.replace("www.", "") == hostname &&
        urlHref.pathname == urlParts.pathname &&
        urlHref.search == urlParts.search &&
        urlHref.hash
      ) {
        $(el).attr("href", "");
      }
    });
  }
  if (options.stripImages) {
    $("img").attr("src", "");
    $("svg").attr("src", "");
  } else {
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (!src || !URL.canParse(src, url)) return;
      const urlSrc = new URL(src, urlParts.origin);
      if (urlSrc.hostname.replace("www.", "") == hostname) {
        const relativeUrl = urlSrc.pathname.split("/").slice(-1)[0] + urlSrc.search + urlSrc.hash;
        $(el).attr("src", relativeUrl);
      }
      if (!$(el).attr("alt")) {
        $(el).attr("alt", "Image");
      }
    });
  }
  if (options.stripHeader) {
    $("header").remove();
  }
  if (options.stripFooter) {
    $("footer").remove();
  }

  if (options.stripQueries) {
    $(options.stripQueries).remove();
  }

  $("script, style, noscript").remove();

  // Strip every attribute from every element:
  $("*").each((_, el) => {
    const attributes = $(el).attr();
    for (const attribute of Object.keys(attributes)) {
      // Except:
      if (["href", "src", "alt", "title", "id", "alt"].includes(attribute)) {
        continue;
      }
      $(el).removeAttr(attribute);
    }
  });

  const body = $("body").html()?.toString();
  if (!body) {
    throw new UserError("No body content found in page");
  }
  logger.debug({ bytes: body.length }, "Extracted body content");

  let content: string;
  let metadata: Partial<RagMetadata> = {};

  if (options.transformStrategy == "markdown" || body.length > MAX_LLM_TRANSFORM_SIZE) {
    if (body.length > MAX_LLM_TRANSFORM_SIZE) {
      logger.warn(
        { bytes: body.length, maxBytes: MAX_LLM_TRANSFORM_SIZE },
        "Content too large for LLM transform, using Markdown"
      );
    }
    // Translate to markdown:
    content = NodeHtmlMarkdown.translate(
      body,
      {
        ignore: ["script", "style", "noscript", "svg", "img"],
        keepDataImages: false,
        useLinkReferenceDefinitions: false,
        useInlineLinks: false,
        codeBlockStyle: "fenced",
      },
      {
        // Had to copy the transformer from node-html-markdown just to add a .trim() to the <a>:
        ...defaultATransformer,
      }
    );
    metadata = await extractMetadata(content, url);
  } else {
    const result = await reformatContentLLM(body, url, title);
    if (!result) {
      throw new UserError("Failed to reformat content");
    }
    content = result.content;
    metadata = result.metadata;
  }

  if (content.length > MAX_SCRAPE_SIZE) {
    logger.warn({ bytes: content.length, maxBytes: MAX_SCRAPE_SIZE }, "Content too large, truncating");
    content = content.slice(0, MAX_SCRAPE_SIZE);
  }

  logger.debug({ bytes: content.length }, "Markdown content extracted");

  return { title, content, description, links, canonicalUrl, contentType: contentType.type, metadata };
}
