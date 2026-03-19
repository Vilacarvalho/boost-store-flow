export type AppRole = "admin" | "manager" | "seller" | "supervisor" | "super_admin";

export function getDashboardByRole(role: AppRole | null): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin-dashboard";
    case "supervisor":
      return "/supervisor-dashboard";
    case "manager":
      return "/manager-dashboard";
    case "seller":
      return "/dashboard";
    default:
      return "/post-login";
  }
}

export function canSell(role: AppRole | null): boolean {
  return role === "seller" || role === "manager";
}
