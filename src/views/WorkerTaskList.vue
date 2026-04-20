<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card class="pa-4 rounded-lg" elevation="2">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
        <div>
          <div class="text-overline tasklist-kicker">Shift Task List</div>
          <div class="text-h5 font-weight-bold">
            {{ shiftHeading }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ shiftSubheading }}
          </div>
        </div>

        <div class="d-flex ga-2 flex-wrap">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/worker')">
            Back to Schedule
          </v-btn>
          <v-btn color="#8b1e1e" class="text-white" :loading="loading" @click="loadTaskData">
            Refresh
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-progress-linear v-if="loading" indeterminate color="#8b1e1e" class="mb-4" />

      <v-alert
        v-else-if="!tasklistCards.length"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        No task lists are assigned to this shift yet.
      </v-alert>

      <v-row v-else>
        <v-col
          v-for="tasklist in tasklistCards"
          :key="tasklist.ID"
          cols="12"
          lg="6"
        >
          <v-card class="pa-4 tasklist-card" elevation="1">
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
              <div>
                <div class="text-h6 font-weight-bold">{{ tasklist.name }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ tasklist.completedCount }} of {{ tasklist.tasks.length }} completed
                </div>
              </div>
              <v-chip color="#8b1e1e" variant="tonal" size="small">
                {{ tasklist.originLabel }}
              </v-chip>
            </div>

            <v-progress-linear
              :model-value="tasklist.progress"
              color="#8b1e1e"
              height="8"
              rounded
              class="mb-4"
            />

            <div
              v-for="task in tasklist.tasks"
              :key="task.ID"
              class="task-row"
            >
              <div class="d-flex align-start justify-space-between ga-3">
                <div class="flex-grow-1">
                  <v-checkbox
                    :model-value="task.completed"
                    :label="task.name"
                    color="#8b1e1e"
                    hide-details
                    density="comfortable"
                    :disabled="savingTaskIDs.includes(task.ID)"
                    @update:model-value="toggleTask(task, $event)"
                  />
                  <div v-if="task.description" class="text-body-2 text-medium-emphasis ml-10 mt-n1">
                    {{ task.description }}
                  </div>
                  <div v-if="task.lastUpdatedLabel" class="text-caption text-medium-emphasis ml-10 mt-1">
                    {{ task.lastUpdatedLabel }}
                  </div>
                </div>
                <v-progress-circular
                  v-if="savingTaskIDs.includes(task.ID)"
                  indeterminate
                  size="20"
                  width="2"
                  color="#8b1e1e"
                  class="mt-2"
                />
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import positionServices from "../services/positionServices.js";
import shiftServices from "../services/shiftServices.js";
import shiftTaskListServices from "../services/shiftTaskListServices.js";
import taskListItemServices from "../services/taskListItemServices.js";
import taskListItemStatusServices from "../services/taskListItemStatusServices.js";
import taskListServices from "../services/taskListServices.js";
import userShiftServices from "../services/userShiftServices.js";
import userShiftTaskListServices from "../services/userShiftTaskList.js";

export default {
  name: "WorkerTaskList",
  data() {
    return {
      loading: false,
      error: "",
      currentUserID: null,
      assignment: null,
      shift: null,
      position: null,
      tasklistCards: [],
      statusRowsByTaskID: {},
      savingTaskIDs: [],
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  computed: {
    userShiftID() {
      const id = Number(this.$route.params.userShiftID);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    shiftHeading() {
      if (!this.shift) return "Selected shift";
      const dateLabel = this.formatShiftDate(this.shift.shift_date);
      const timeLabel = `${this.toHHMM(this.shift.start_time)} - ${this.toHHMM(this.shift.end_time)}`;
      return `${dateLabel} | ${timeLabel}`;
    },
    shiftSubheading() {
      if (!this.shift) return "Loading shift details";
      return this.position?.title || "Assigned tasks for this shift";
    },
  },
  async mounted() {
    this.currentUserID = this.getCurrentUserID();
    await this.loadTaskData();
  },
  watch: {
    "$route.params.userShiftID": {
      async handler() {
        await this.loadTaskData();
      },
    },
  },
  methods: {
    normalizeID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },
    getCurrentUserID() {
      const user = this.getCurrentUser();
      return this.normalizeID(user?.ID ?? user?.id ?? user?.userID);
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    formatShiftDate(value) {
      if (!value) return "Unknown date";
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    formatStatusTime(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleString();
    },
    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },
    buildOriginLabel(origins = []) {
      if (origins.includes("shift") && origins.includes("personal")) return "Shift + Personal";
      if (origins.includes("personal")) return "Personal";
      return "Shift";
    },
    buildTasklistCards(tasklists, itemsByTasklistID, statusesByTaskID, tasklistOriginsByID) {
      return tasklists
        .map((tasklist) => {
          const tasklistID = this.normalizeID(tasklist?.ID ?? tasklist?.id);
          const rawTasks = itemsByTasklistID[tasklistID] || [];
          const tasks = rawTasks.map((task) => {
            const taskID = this.normalizeID(task?.ID ?? task?.id);
            const statusRow = statusesByTaskID[taskID] || null;
            const isCompleted = String(statusRow?.status || "").trim().toLowerCase() === "complete";

            return {
              ...task,
              ID: taskID,
              completed: isCompleted,
              statusRow,
              lastUpdatedLabel: statusRow?.date_checked
                ? `Last updated ${this.formatStatusTime(statusRow.date_checked)}`
                : "",
            };
          });

          const completedCount = tasks.filter((task) => task.completed).length;

          return {
            ...tasklist,
            ID: tasklistID,
            tasks,
            completedCount,
            progress: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
            originLabel: this.buildOriginLabel(tasklistOriginsByID[tasklistID] || []),
          };
        })
        .filter((tasklist) => tasklist.tasks.length > 0)
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    },
    async loadTaskData() {
      this.loading = true;
      this.error = "";
      this.assignment = null;
      this.shift = null;
      this.position = null;
      this.tasklistCards = [];
      this.statusRowsByTaskID = {};

      try {
        if (!this.userShiftID) {
          this.error = "No worker shift was selected.";
          return;
        }

        const assignment = await userShiftServices.get(this.userShiftID);
        const assignmentUserID = this.normalizeID(assignment?.userID);
        if (!assignment?.ID || !assignment?.shiftID) {
          this.error = "The selected shift assignment could not be found.";
          return;
        }

        if (this.currentUserID && assignmentUserID && assignmentUserID !== this.currentUserID) {
          this.error = "This shift does not belong to the current worker.";
          return;
        }

        const [shift, shiftTaskLinksRes, userTaskLinksRes, statusRowsRes] = await Promise.all([
          shiftServices.get(assignment.shiftID),
          shiftTaskListServices.getAll({ shiftID: assignment.shiftID }),
          userShiftTaskListServices.getAll({ user_shiftID: this.userShiftID }),
          taskListItemStatusServices.getAll({ user_shiftID: this.userShiftID }),
        ]);

        this.assignment = assignment;
        this.shift = shift;

        if (shift?.positionID) {
          try {
            this.position = await positionServices.get(shift.positionID);
          } catch (error) {
            console.error("Failed to load shift position:", error?.response?.data || error);
            this.position = null;
          }
        }

        const shiftTaskLinks = Array.isArray(shiftTaskLinksRes) ? shiftTaskLinksRes : [];
        const userTaskLinks = Array.isArray(userTaskLinksRes) ? userTaskLinksRes : [];
        const statusRows = Array.isArray(statusRowsRes) ? statusRowsRes : [];

        const tasklistOriginsByID = {};
        for (const row of shiftTaskLinks) {
          const tasklistID = this.normalizeID(row?.task_listID);
          if (!tasklistID) continue;
          tasklistOriginsByID[tasklistID] = [...new Set([...(tasklistOriginsByID[tasklistID] || []), "shift"])];
        }
        for (const row of userTaskLinks) {
          const tasklistID = this.normalizeID(row?.task_listID);
          if (!tasklistID) continue;
          tasklistOriginsByID[tasklistID] = [...new Set([...(tasklistOriginsByID[tasklistID] || []), "personal"])];
        }

        const tasklistIDs = Object.keys(tasklistOriginsByID)
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0);

        if (!tasklistIDs.length) {
          return;
        }

        const [tasklists, itemLists] = await Promise.all([
          Promise.all(tasklistIDs.map((tasklistID) => taskListServices.get(tasklistID))),
          Promise.all(tasklistIDs.map((tasklistID) => taskListItemServices.getAll({ taskListID: tasklistID }))),
        ]);

        const itemsByTasklistID = Object.fromEntries(
          tasklistIDs.map((tasklistID, index) => [
            tasklistID,
            Array.isArray(itemLists[index]) ? itemLists[index] : [],
          ])
        );

        const statusesByTaskID = statusRows.reduce((acc, row) => {
          const taskID = this.normalizeID(row?.task_list_itemID ?? row?.taskListItemID);
          if (!taskID) return acc;

          const existing = acc[taskID];
          const existingTime = new Date(existing?.updatedAt || existing?.date_checked || 0).getTime();
          const rowTime = new Date(row?.updatedAt || row?.date_checked || 0).getTime();
          if (!existing || rowTime >= existingTime) acc[taskID] = row;
          return acc;
        }, {});

        this.statusRowsByTaskID = statusesByTaskID;
        this.tasklistCards = this.buildTasklistCards(
          tasklists.filter(Boolean),
          itemsByTasklistID,
          statusesByTaskID,
          tasklistOriginsByID
        );
      } catch (error) {
        console.error("Failed to load worker task list:", error?.response?.data || error);
        this.error = error?.response?.data?.message || "Failed to load the selected shift task list.";
      } finally {
        this.loading = false;
      }
    },
    async toggleTask(task, completed) {
      const taskID = this.normalizeID(task?.ID);
      if (!taskID || !this.userShiftID) return;

      this.savingTaskIDs = [...new Set([...this.savingTaskIDs, taskID])];
      const existingStatus = this.statusRowsByTaskID[taskID] || null;
      const payload = {
        status: completed ? "Complete" : "Pending",
        date_checked: new Date().toISOString(),
        checked_by: this.currentUserID,
        task_list_itemID: taskID,
        user_shiftID: this.userShiftID,
      };

      try {
        if (existingStatus?.ID) {
          await taskListItemStatusServices.update(existingStatus.ID, payload);
        } else {
          await taskListItemStatusServices.create(payload);
        }

        await this.loadTaskData();
        this.showMessage(completed ? "Task marked complete." : "Task marked pending.");
      } catch (error) {
        console.error("Failed to save task status:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Could not save task status.", "error");
      } finally {
        this.savingTaskIDs = this.savingTaskIDs.filter((id) => id !== taskID);
      }
    },
  },
};
</script>

<style scoped>
.tasklist-kicker {
  letter-spacing: 0.12em;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.tasklist-card {
  border-radius: 20px;
}

.task-row + .task-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(114, 21, 26, 0.08);
}
</style>
