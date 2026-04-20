import departmentUsersServices from "./departmentUsersServices.js";
import scheduleServices from "./scheduleServices.js";
import shiftServices from "./shiftServices.js";
import swapShiftRequestServices from "./swapShiftRequestServices.js";
import userShiftServices from "./userShiftServices.js";

const SHIFT_TARGET_ROUTE = "/manager";
const WORKER_TRADE_ROUTE = "/worker/tradeboard";
const MANAGER_TRADE_ROUTE = "/manager/tradeboard";

const extractArray = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

const normalizeID = (raw) => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const normalizeRole = (value) => String(value || "").trim().toLowerCase();

const normalizeTradeStatus = (value) => {
  const normalized = normalizeRole(value);

  if (["accepted", "approved"].includes(normalized)) return "accepted";
  if (["pending approval", "pending_approval", "needs approval"].includes(normalized)) {
    return "pending_approval";
  }
  if (["cancelled", "canceled", "denied", "rejected"].includes(normalized)) return "cancelled";
  return "open";
};

const toHHMM = (value) => String(value || "00:00").slice(0, 5);

const getShiftTimestamp = (shift) =>
  new Date(`${shift.shift_date}T${toHHMM(shift.start_time)}:00`).getTime();

const isUpcomingShift = (shift) => {
  if (!shift?.shift_date) return false;
  return getShiftTimestamp(shift) >= Date.now();
};

const formatTime = (value) => {
  const hhmm = toHHMM(value);
  const [hoursRaw, minutesRaw] = hhmm.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return hhmm;

  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
};

const formatShiftLabel = (shift) => {
  const dateValue = shift?.shift_date ? new Date(`${shift.shift_date}T00:00:00`) : null;
  const dateLabel =
    dateValue && !Number.isNaN(dateValue.getTime())
      ? dateValue.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Upcoming shift";

  return `${dateLabel} | ${formatTime(shift?.start_time)} - ${formatTime(shift?.end_time)}`;
};

const getDepartmentIDForRole = async (userID, expectedRole) => {
  if (!userID) return null;

  const linksRes = await departmentUsersServices.getByUser(userID);
  const links = extractArray(linksRes, ["departmentusers"]);
  const preferredLink =
    links.find((link) => normalizeRole(link?.role) === expectedRole) || links[0] || null;

  return normalizeID(preferredLink?.departmentID);
};

const getOfficialSchedule = async (departmentID) => {
  if (!departmentID) return null;

  const scheduleRes = await scheduleServices.getAll({
    departmentID,
    type: "official",
    limit: 1,
  });
  const schedules = extractArray(scheduleRes, ["schedules"]);
  return schedules[0] || null;
};

const loadDepartmentShiftContext = async (departmentID) => {
  const officialSchedule = await getOfficialSchedule(departmentID);
  if (!officialSchedule?.ID) {
    return {
      assignmentByUserShiftID: {},
      assignmentsByShiftID: {},
      officialSchedule: null,
      upcomingShifts: [],
      shifts: [],
      shiftsByID: {},
    };
  }

  const shiftsRes = await shiftServices.getAll({ scheduleID: officialSchedule.ID });
  const shifts = extractArray(shiftsRes, ["shifts"])
    .filter(Boolean)
    .sort((a, b) => getShiftTimestamp(a) - getShiftTimestamp(b));
  const upcomingShifts = shifts.filter(isUpcomingShift);

  const assignmentResults = await Promise.allSettled(
    shifts.map((shift) => userShiftServices.getAll({ shiftID: shift.ID }))
  );

  const assignmentsByShiftID = Object.fromEntries(
    shifts.map((shift, index) => {
      const result = assignmentResults[index];
      if (result?.status !== "fulfilled") return [shift.ID, []];
      return [shift.ID, extractArray(result.value, ["usershifts"]).filter(Boolean)];
    })
  );

  const assignmentByUserShiftID = Object.values(assignmentsByShiftID)
    .flat()
    .reduce((acc, assignment) => {
      const id = normalizeID(assignment?.ID);
      if (id) acc[id] = assignment;
      return acc;
    }, {});

  const shiftsByID = shifts.reduce((acc, shift) => {
    const id = normalizeID(shift?.ID);
    if (id) acc[id] = shift;
    return acc;
  }, {});

  return {
    assignmentByUserShiftID,
    assignmentsByShiftID,
    officialSchedule,
    upcomingShifts,
    shifts,
    shiftsByID,
  };
};

const loadTradeRequests = async () => {
  const requestsRes = await swapShiftRequestServices.getAll();
  return extractArray(requestsRes, ["swapshiftrequests", "swapShiftRequests", "requests"]);
};

const toRequestContext = (rawRequest, shiftContext) => {
  const requestID = normalizeID(rawRequest?.ID ?? rawRequest?.id ?? rawRequest?.swapShiftRequestID);
  const requestAssignment =
    rawRequest?.userShift || rawRequest?.usershift || rawRequest?.UserShift || null;
  const userShiftID = normalizeID(
    rawRequest?.userShiftID ??
      requestAssignment?.ID ??
      rawRequest?.userShiftId ??
      rawRequest?.user_shift_id
  );
  const assignment = shiftContext.assignmentByUserShiftID[userShiftID] || requestAssignment || null;
  const shiftID = normalizeID(assignment?.shiftID ?? rawRequest?.shiftID ?? rawRequest?.shiftId);
  const shift = shiftContext.shiftsByID[shiftID] || null;

  if (!requestID || !userShiftID || !shift) return null;

  return {
    assignment,
    authorID: normalizeID(assignment?.userID ?? rawRequest?.userID ?? rawRequest?.authorID),
    id: requestID,
    shift,
    status: normalizeTradeStatus(rawRequest?.status),
  };
};

const buildOpenTradeNotifications = (requests, route, prefix) =>
  requests
    .filter((request) => request?.status === "open")
    .map((request) => ({
      id: `${prefix}-trade-open-${request.id}`,
      title: "Shift is available on the trade board",
      message: `${formatShiftLabel(request.shift)} is open on the trade board.`,
      to: route,
      icon: "mdi-swap-horizontal-circle-outline",
      color: "info",
      sortAt: getShiftTimestamp(request.shift),
    }));

export const getManagerNotificationFeed = async (userID) => {
  const managerID = normalizeID(userID);
  if (!managerID) return [];

  const departmentID = await getDepartmentIDForRole(managerID, "manager");
  if (!departmentID) return [];

  const shiftContext = await loadDepartmentShiftContext(departmentID);
  const unassignedShiftNotifications = shiftContext.upcomingShifts
    .filter((shift) => (shiftContext.assignmentsByShiftID[shift.ID] || []).length === 0)
    .map((shift) => ({
      id: `manager-unassigned-${shift.ID}`,
      title: "Shift has no workers assigned",
      message: `${formatShiftLabel(shift)} does not have any workers assigned yet.`,
      to: SHIFT_TARGET_ROUTE,
      icon: "mdi-account-alert-outline",
      color: "warning",
      sortAt: getShiftTimestamp(shift),
    }));

  const tradeRequests = (await loadTradeRequests())
    .map((request) => toRequestContext(request, shiftContext))
    .filter(Boolean);

  const openTradeNotifications = buildOpenTradeNotifications(
    tradeRequests,
    MANAGER_TRADE_ROUTE,
    "manager"
  );

  const tradeApprovalNotifications = tradeRequests
    .filter((request) => request?.status === "pending_approval")
    .map((request) => ({
      id: `manager-trade-approval-${request.id}`,
      title: "Trade request needs approval",
      message: `${formatShiftLabel(request.shift)} is waiting for manager approval.`,
      to: MANAGER_TRADE_ROUTE,
      icon: "mdi-swap-horizontal-circle-outline",
      color: "info",
      sortAt: getShiftTimestamp(request.shift),
    }));

  return [...unassignedShiftNotifications, ...openTradeNotifications, ...tradeApprovalNotifications].sort(
    (a, b) => a.sortAt - b.sortAt
  );
};

export const getWorkerNotificationFeed = async (userID) => {
  const workerID = normalizeID(userID);
  if (!workerID) return [];

  const departmentID = await getDepartmentIDForRole(workerID, "worker");
  if (!departmentID) return [];

  const shiftContext = await loadDepartmentShiftContext(departmentID);
  const tradeRequests = (await loadTradeRequests())
    .map((request) => toRequestContext(request, shiftContext))
    .filter(Boolean);

  return buildOpenTradeNotifications(tradeRequests, WORKER_TRADE_ROUTE, "worker").sort(
    (a, b) => a.sortAt - b.sortAt
  );
};
