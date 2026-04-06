<template>
  <v-container fluid class="pa-6 tasklists-page">
    <v-card class="pa-4 tasklists-card" elevation="2">
      <div class="d-flex justify-space-between align-start mb-4 flex-wrap ga-3">
        <div>
          <h2 class="text-h6 font-weight-bold mb-3">Tasklists</h2>

          <v-btn
            color="#6f42c1"
            class="text-white"
            elevation="0"
            @click="openCreateDialog"
          >
            Add Tasklist
          </v-btn>
        </div>

        <v-text-field
          v-model="search"
          label="Search tasklists"
          variant="solo"
          density="compact"
          hide-details
          style="max-width: 320px;"
        />
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-alert
        v-if="!error && tasklists.length === 0 && !loading"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        No tasklists found for your department.
      </v-alert>

      <v-table>
        <thead>
          <tr>
            <th>Tasklist Name</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="tasklist in filteredTasklists" :key="getTasklistId(tasklist)">
            <td>{{ tasklist.name || "Untitled Tasklist" }}</td>
            <td class="text-right">
              <div class="d-inline-flex align-center ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-pencil"
                  @click="openEditDialog(tasklist)"
                />
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-delete"
                  color="error"
                  :loading="deletingTasklistID === getTasklistId(tasklist)"
                  @click="deleteTasklist(tasklist)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialog.open" max-width="720">
      <v-card class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <h3 class="text-h6 font-weight-bold">
            {{ dialog.editingID ? "Edit Tasklist" : "Add Tasklist" }}
          </h3>
          <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
        </div>

        <v-alert
          v-if="dialog.error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ dialog.error }}
        </v-alert>

        <v-text-field
          v-model="dialog.form.name"
          label="Tasklist name"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          autofocus
          class="mb-4"
          @keyup.enter="submitTasklist"
        />

        <div class="text-subtitle-2 font-weight-medium mb-2">Tasks</div>

        <div
          v-for="(task, index) in dialog.form.tasks"
          :key="`task-${index}`"
          class="tasklist-task-row mb-3"
        >
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-body-2 font-weight-medium">Task {{ index + 1 }}</div>
            <v-btn
              v-if="dialog.form.tasks.length > 1"
              size="small"
              variant="text"
              color="error"
              icon="mdi-close"
              @click="removeTaskField(index)"
            />
          </div>

          <v-text-field
            v-model="task.name"
            label="Task name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-3"
          />

          <v-textarea
            v-model="task.description"
            label="Small note"
            variant="outlined"
            density="comfortable"
            rows="3"
            hide-details="auto"
          />
        </div>

        <v-btn
          variant="outlined"
          color="#6f42c1"
          class="text-none mb-2"
          prepend-icon="mdi-plus"
          @click="addTaskField"
        >
          Add Another Task
        </v-btn>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn
            color="#6f42c1"
            class="text-white"
            :loading="dialog.saving"
            :disabled="dialog.saving"
            @click="submitTasklist"
          >
            {{ dialog.editingID ? "Save Changes" : "Add Tasklist" }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import departmentUsersServices from "../services/departmentUsersServices.js";
import taskListItemServices from "../services/taskListItemServices.js";
import taskListServices from "../services/taskListServices.js";

const createEmptyTask = () => ({
  name: "",
  description: "",
});

const createDefaultDialogState = () => ({
  open: false,
  editingID: null,
  saving: false,
  error: "",
  form: {
    name: "",
    tasks: [createEmptyTask()],
  },
});

export default {
  name: "ManagerTasklists",
  data() {
    return {
      loading: false,
      error: "",
      search: "",
      tasklists: [],
      managerDepartmentID: null,
      deletingTasklistID: null,
      dialog: createDefaultDialogState(),
    };
  },
  computed: {
    filteredTasklists() {
      const query = this.search.trim().toLowerCase();
      if (!query) return this.tasklists;

      return this.tasklists.filter((tasklist) =>
        String(tasklist?.name ?? "").toLowerCase().includes(query)
      );
    },
  },
  async mounted() {
    await this.loadTasklists();
  },
  methods: {
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },

    getTasklistId(tasklist) {
      return tasklist?.ID ?? tasklist?.id ?? null;
    },

    async getManagerDepartmentID() {
      const currentUser = this.getCurrentUser();
      const managerID = currentUser?.ID ?? currentUser?.id ?? currentUser?.userID;
      if (!managerID) return null;

      const linksRes = await departmentUsersServices.getByUser(managerID);
      const links = Array.isArray(linksRes)
        ? linksRes
        : Array.isArray(linksRes?.departmentusers)
        ? linksRes.departmentusers
        : Array.isArray(linksRes?.data)
        ? linksRes.data
        : [];

      const managerLink =
        links.find((link) => String(link.role || "").trim().toLowerCase() === "manager") ||
        links[0];

      return managerLink?.departmentID ?? null;
    },

    async loadTasklists() {
      this.loading = true;
      this.error = "";

      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.error = "No manager department found.";
          this.tasklists = [];
          return;
        }

        const response = await taskListServices.getAll({
          departmentID: this.managerDepartmentID,
        });

        this.tasklists = Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Failed to load tasklists:", error?.response?.data || error);
        this.error = error?.response?.data?.message || "Failed to load tasklists.";
        this.tasklists = [];
      } finally {
        this.loading = false;
      }
    },

    openCreateDialog() {
      this.dialog = createDefaultDialogState();
      this.dialog.open = true;
    },

    openEditDialog(tasklist) {
      this.dialog = {
        open: true,
        editingID: this.getTasklistId(tasklist),
        saving: false,
        error: "",
        form: {
          name: tasklist?.name || "",
          tasks: [createEmptyTask()],
        },
      };
    },

    closeDialog() {
      this.dialog = createDefaultDialogState();
    },

    addTaskField() {
      this.dialog = {
        ...this.dialog,
        form: {
          ...this.dialog.form,
          tasks: [...this.dialog.form.tasks, createEmptyTask()],
        },
      };
    },

    removeTaskField(index) {
      const nextTasks = this.dialog.form.tasks.filter((_, taskIndex) => taskIndex !== index);
      this.dialog = {
        ...this.dialog,
        form: {
          ...this.dialog.form,
          tasks: nextTasks.length > 0 ? nextTasks : [createEmptyTask()],
        },
      };
    },

    async submitTasklist() {
      const name = this.dialog.form.name.trim();
      const validTasks = this.dialog.form.tasks
        .map((task) => ({
          name: String(task?.name ?? "").trim(),
          description: String(task?.description ?? "").trim(),
        }))
        .filter((task) => task.name);

      if (!name) {
        this.dialog = {
          ...this.dialog,
          error: "Tasklist name is required.",
        };
        return;
      }

      if (!this.dialog.editingID && validTasks.length === 0) {
        this.dialog = {
          ...this.dialog,
          error: "Add at least one task with a task name.",
        };
        return;
      }

      let departmentID = this.managerDepartmentID;
      if (!departmentID) {
        departmentID = await this.getManagerDepartmentID();
        this.managerDepartmentID = departmentID;
      }

      if (!departmentID) {
        this.dialog = {
          ...this.dialog,
          error: "Unable to determine the manager department.",
        };
        return;
      }

      this.dialog = {
        ...this.dialog,
        saving: true,
        error: "",
      };

      const payload = {
        name,
        description: null,
        departmentID,
      };

      try {
        if (this.dialog.editingID) {
          await taskListServices.update(this.dialog.editingID, payload);
        } else {
          const createdTasklist = await taskListServices.create(payload);
          const tasklistID = this.getTasklistId(createdTasklist);

          if (!tasklistID) {
            throw new Error("Tasklist was created but no ID was returned.");
          }

          const taskCreateResults = await Promise.allSettled(
            validTasks.map((task) =>
              taskListItemServices.create({
                name: task.name,
                description: task.description || null,
                taskListID: tasklistID,
              })
            )
          );

          const failedTaskCreates = taskCreateResults.filter((result) => result.status === "rejected");
          if (failedTaskCreates.length > 0) {
            console.error("Some task items failed to save:", failedTaskCreates);
          }
        }

        await this.loadTasklists();
        this.closeDialog();
      } catch (error) {
        console.error("Failed to save tasklist:", error?.response?.data || error);
        this.dialog = {
          ...this.dialog,
          saving: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to save tasklist.",
        };
      }
    },

    async deleteTasklist(tasklist) {
      const tasklistID = this.getTasklistId(tasklist);
      if (!tasklistID) return;

      this.deletingTasklistID = tasklistID;
      this.error = "";

      try {
        await taskListServices.delete(tasklistID);
        this.tasklists = this.tasklists.filter(
          (item) => String(this.getTasklistId(item)) !== String(tasklistID)
        );

        if (String(this.dialog.editingID) === String(tasklistID)) {
          this.closeDialog();
        }
      } catch (error) {
        console.error("Failed to delete tasklist:", error?.response?.data || error);
        this.error = error?.response?.data?.message || "Failed to delete tasklist.";
      } finally {
        this.deletingTasklistID = null;
      }
    },
  },
};
</script>

<style scoped>
.tasklists-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.18), transparent 24%),
    linear-gradient(180deg, #f4efff 0%, #ede4ff 100%);
}

.tasklists-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(111, 66, 193, 0.14);
  backdrop-filter: blur(6px);
}

.tasklist-task-row {
  border: 1px solid rgba(111, 66, 193, 0.18);
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 239, 255, 0.9));
}
</style>
