import { useOrganization } from "@/hooks/useOrganization";

interface OrgLogoProps {
  size?: "sm" | "md";
}

const OrgLogo = ({ size = "md" }: OrgLogoProps) => {
  const { data: org } = useOrganization();

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSz = size === "sm" ? "text-xs" : "text-sm";
  const nameSz = size === "sm" ? "text-sm" : "text-lg";
  const subSz = size === "sm" ? "text-[10px]" : "text-xs";

  const displayName = org?.short_name || org?.name || "VendaMais";
  const subtitle = org?.tagline || "Gestão de Performance";

  const initials = (org?.short_name || org?.name || "VM")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const accent = org?.primary_color || null;

  return (
    <div className="flex items-center gap-3">
      {org?.logo_url ? (
        <img
          src={org.logo_url}
          alt={displayName}
          className={`${dim} rounded-lg object-contain`}
        />
      ) : (
        <div
          className={`${dim} rounded-lg flex items-center justify-center ${!accent ? "bg-primary/10" : ""}`}
          style={accent ? { backgroundColor: `${accent}18` } : undefined}
        >
          <span
            className={`${textSz} font-semibold ${!accent ? "text-primary" : ""}`}
            style={accent ? { color: accent } : undefined}
          >
            {initials}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <h1 className={`${nameSz} font-semibold tracking-tight text-foreground truncate`}>
          {displayName}
        </h1>
        <p className={`${subSz} text-muted-foreground mt-0.5`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default OrgLogo;
