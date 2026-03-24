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

  const initials = org?.name
    ? org.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "VM";

  return (
    <div className="flex items-center gap-3">
      {org?.logo_url ? (
        <img
          src={org.logo_url}
          alt={org.name || "Logo"}
          className={`${dimensions} rounded-lg object-contain`}
        />
      ) : (
        <div
          className={`${dimensions} rounded-lg bg-primary/10 flex items-center justify-center`}
        >
          <span className={`${textSize} font-semibold text-primary`}>
            {initials}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <h1 className={`${nameSize} font-semibold tracking-tight text-foreground truncate`}>
          {org?.name || "VendaMais"}
        </h1>
        <p className={`${subSize} text-muted-foreground mt-0.5`}>
          Gestão de Performance
        </p>
      </div>
    </div>
  );
};

export default OrgLogo;
