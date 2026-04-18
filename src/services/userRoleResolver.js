import departmentUsersServices from "./departmentUsersServices.js";

export const normalizeRole = (value) => String(value || "").trim().toLowerCase();

export const formatRoleLabel = (value) => {
  const normalized = normalizeRole(value);
  if (normalized === "admin") return "Admin";
  if (normalized === "manager") return "Manager";
  return "Worker";
};

export const getUserID = (rawUser) => {
  const id = Number(rawUser?.ID ?? rawUser?.id ?? rawUser?.userID);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const extractDepartmentLinks = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.departmentusers)) return response.departmentusers;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export const resolveEffectiveRole = async (rawUser) => {
  const currentRole = normalizeRole(rawUser?.role);
  if (currentRole === "admin") return "Admin";

  const userID = getUserID(rawUser);
  if (!userID) return formatRoleLabel(currentRole);

  try {
    const linksRes = await departmentUsersServices.getByUser(userID);
    const links = extractDepartmentLinks(linksRes);
    const roles = links.map((link) => normalizeRole(link?.role));

    if (roles.includes("manager")) return "Manager";
    if (roles.includes("worker")) return "Worker";
  } catch (error) {
    console.error("Failed to resolve effective role:", error?.response?.data || error);
  }

  return formatRoleLabel(currentRole);
};

export const withEffectiveRole = async (rawUser) => {
  if (!rawUser) return rawUser;
  const role = await resolveEffectiveRole(rawUser);
  return { ...rawUser, role };
};
