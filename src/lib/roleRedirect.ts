type AppRole = "admin" | "manager" | "seller" | "supervisor" | "super_admin";

export function getDashboardByRole(role: AppRole | null): string {
  switch (role) {
    case "super_admin":
      return "/admin-dashboard";
    case "admin":
      return "/admin-dashboard";
    case "supervisor":
      return "/supervisor-dashboard";
    case "manager":
      return "/manager-dashboard";
    case "seller":
      return "/dashboard";
    default:
      // Don't fallback to seller — stay on a generic path until role loads
      return "/dashboard";
  }
}
