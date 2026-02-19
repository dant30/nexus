export const allowIfAuthenticated = (isAuthenticated) => {
  return !!isAuthenticated;
};

const resolveUserRoles = (user) => {
  if (!user) return [];

  const roles = new Set();
  const role = String(user.role || user.user_type || "").toLowerCase().trim();
  if (role) roles.add(role);

  if (user.is_admin === true) roles.add("admin");
  if (user.is_staff === true) roles.add("admin");
  if (user.is_superuser === true) {
    roles.add("admin");
    roles.add("superadmin");
  }

  return Array.from(roles);
};

export const allowIfRole = (user, roles = []) => {
  if (!roles.length) return true;
  if (!user) return false;

  const expected = roles.map((r) => String(r).toLowerCase().trim());
  const actual = resolveUserRoles(user);
  return expected.some((role) => actual.includes(role));
};
