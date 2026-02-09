export const allowIfAuthenticated = (isAuthenticated) => {
  return !!isAuthenticated;
};

export const allowIfRole = (user, roles = []) => {
  if (!roles.length) return true;
  if (!user) return false;
  return roles.includes(user.role);
};