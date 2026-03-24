import { useEffect } from "react";
import { useOrganization } from "./useOrganization";

const DEFAULT_FAVICON = "/favicon.svg";

export function useDynamicFavicon() {
  const { data: org } = useOrganization();

  useEffect(() => {
    const faviconUrl = org?.logo_url || DEFAULT_FAVICON;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    link.type = faviconUrl.endsWith(".svg")
      ? "image/svg+xml"
      : "image/png";

    // Also update page title with org name
    const orgName = org?.short_name || org?.name;
    if (orgName) {
      document.title = `${orgName} — Gestão de Performance`;
    } else {
      document.title = "VendaMais — Gestão de Performance";
    }
  }, [org?.logo_url, org?.short_name, org?.name]);
}
