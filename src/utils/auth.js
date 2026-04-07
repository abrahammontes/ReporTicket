export const isAdmin = (user) => {
  if (!user) return false;
  
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  
  // 1. Direct role check (fuzzy)
  const isRoleAdmin = role.includes('admin') || role.includes('super');
  
  // 2. Specific email fail-safe
  const isEmailAdmin = email === 'abraham.montes@gmail.com';
  
  // 3. Permissions check
  const hasAdminPerms = user.permissions?.manageUsers || user.permissions?.manageCompanies;
  
  // Debug log to help identify why a user might be blocked
  if (isEmailAdmin || isRoleAdmin || hasAdminPerms) {
    console.log(`Auth check: User ${email} is ADMIN (Role: ${role}, Perms: ${!!hasAdminPerms})`);
  }
  
  return isRoleAdmin || isEmailAdmin || hasAdminPerms;
};

export const isSuperAdmin = (user) => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return role.includes('super') || email === 'abraham.montes@gmail.com';
};
