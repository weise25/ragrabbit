export function hyphenateUrl(url: string) {
  const urlObj = new URL(url);
  let domain = urlObj.hostname.replace(/^www\./, "");
  let path = urlObj.pathname;
  let query = urlObj.search;

  // Extract domain and subdomain
  const domainParts = domain.split(".");
  domain = domainParts.length > 3 ? "..." + domainParts.slice(-3).join(".") : domain;

  // Process path
  const pathParts = path.split("/").filter(Boolean);
  path = pathParts.length > 0 ? `/.../${pathParts[pathParts.length - 1]}` : "";

  // Process query string
  if (query.length > 1) {
    const queryParams = new URLSearchParams(query);
    query = Array.from(queryParams.keys())
      .map((key) => {
        if (key.length > 10) {
          return key.substring(0, 10) + "...";
        }
        return key;
      })
      .join("\u00AD&");
    query = query ? `?\u00AD${query}` : "";
  }

  let result = `${domain}${path}${query}`;

  // Truncate if longer than 100 characters
  if (result.length > 100) {
    result = result.substring(0, 97) + "...";
  }

  return result;
}
