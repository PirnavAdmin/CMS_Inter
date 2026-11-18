export function readableActivityMessage(value) {
  let text = String(value || "");
  // Convert technical request audit entries into readable activity messages.
  const request = text.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(?:https?:\/\/[^\s/]+)?(\/api\/[^\s]+)(?:\s+resulted in HTTP\s+(\d{3}))?/i);
  if (request) {
    const [, method, path, statusText] = request;
    const status = Number(statusText || text.match(/\bHTTP\s+(\d{3})\b/i)?.[1]);
    const resource = /\/landing-page\/public\b/i.test(path) ? "Public landing page"
      : /\/landing-page\/config\b/i.test(path) ? "Landing page settings"
      : /\/subscriptions?\b/i.test(path) ? "Subscription details"
      : /\/colleges?\b/i.test(path) ? "College details"
      : /\/payments?\b|\/invoices?\b/i.test(path) ? "Billing details"
      : /\/notifications?\b/i.test(path) ? "Notifications"
      : /\/settings?\b|\/config\b/i.test(path) ? "Platform settings"
      : "Platform request";
    const operation = method.toUpperCase() === "GET" ? "load"
      : method.toUpperCase() === "DELETE" ? "delete"
      : ["PUT", "PATCH"].includes(method.toUpperCase()) ? "update" : "submit";
    if (status >= 500) text = `${resource}: unable to ${operation} due to a service error.`;
    else if (status === 401) text = `${resource}: sign-in required to ${operation}.`;
    else if (status === 403) text = `${resource}: access denied.`;
    else if (status === 404) text = `${resource}: requested information was not found.`;
    else if (status >= 400) text = `${resource}: the request could not be completed.`;
    else if (status >= 200 && status < 300) text = `${resource}: ${method.toUpperCase() === "GET" ? "loaded" : method.toUpperCase() === "DELETE" ? "deleted" : ["PUT", "PATCH"].includes(method.toUpperCase()) ? "updated" : "submitted"} successfully.`;
    else text = `${resource}: ${operation} request recorded.`;
  }

  return text;
}