import { useOrganization } from "@/hooks/useOrganization";

interface OrgLogoProps {
  size?: "sm" | "md";
}

const OrgLogo = ({ size = "md" }: OrgLogoProps) => {
  const { data: org } = useOrganization();

  const dimensions = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const nameSize = size === "sm" ? "text-sm" : "text-lg";
  const subSize = size === "sm" ? "text-[10px]" : "text-xs";

  const displayName = org?.short_name || org?.name || "VendaMais";
  const subtitle = org?.tagline || "Gestão de Performance";

  const initials = (org?.short_name || org?.name || "VM")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Accent dot uses org primary_color if set (safe inline style)
  const accentColor = org?.primary_color || undefined;

  return (
    <div className="flex items-center gap-3">
      {org?.logo_url ? (
        <img
          src={org.logo_url}
          alt={displayName}
          className={`${dimensions} rounded-lg object-contain`}
        />
      ) : (
        <div
          className={`${dimensions} rounded-lg flex items-center justify-center`}
          style={{
            backgroundColor: accentColor
              ? `${accentColor}18`
              : undefined,
          }}
          {...(!accentColor ? { className: `${dimensions} rounded-lg bg-primary/10 flex items-center justify-center` } : {})}
        >
          <span
            className={`${textSize} font-semibold`}
            style={{ color: accentColor || undefined }}
            {...(!accentColor ? { className: `${textSize} font-semibold text-primary` } : {})}
          >
            {initials}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <h1 className={`${nameSize} font-semibold tracking-tight text-foreground truncate`}>
          {displayName}
        </h1>
        <p className={`${subSize} text-muted-foreground mt-0.5`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default OrgLogo;
