<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card class="pa-4" elevation="2">
      <div class="d-flex justify-space-between align-start mb-4 flex-wrap ga-3">
        <div>
          <h2 class="text-h6 font-weight-bold mb-3">Tasklists</h2>

          <v-btn
            color="#8b1e1e"
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
                  color="#8b1e1e"
                  class="text-white"
                  elevation="0"
                  @click="openViewDialog(tasklist)"
                >
                  View
                </v-btn>
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
                  @click="openDeleteDialog(tasklist)"
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
          color="#8b1e1e"
          class="text-none mb-2"
          prepend-icon="mdi-plus"
          @click="addTaskField"
        >
          Add Another Task
        </v-btn>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn
            color="#8b1e1e"
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

    <v-dialog v-model="viewDialog.open" max-width="680">
      <v-card class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <h3 class="text-h6 font-weight-bold">
            {{ viewDialog.tasklist?.name || "Tasklist" }}
          </h3>
          <v-btn icon="mdi-close" variant="text" @click="closeViewDialog" />
        </div>

        <v-alert
          v-if="viewDialog.error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ viewDialog.error }}
        </v-alert>

        <div class="text-subtitle-2 font-weight-medium mb-3">Tasks</div>

        <v-progress-linear
          v-if="viewDialog.loading"
          indeterminate
          color="#8b1e1e"
          class="mb-4"
        />

        

        <div
          v-for="(task, index) in viewDialog.tasks"
          :key="getTaskId(task) || `view-task-${index}`"
          class="tasklist-task-row mb-3"
        >
          <div class="text-subtitle-1 font-weight-bold mb-2">
            {{ index + 1 }}. {{ task.name }}
          </div>
          <div v-if="task.description" class="text-body-2">
            {{ task.description }}
          </div>

        </div>

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" @click="closeViewDialog">Close</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog.open" max-width="460">
      <v-card class="pa-4 text-center">
        <div class="d-flex align-center justify-center mb-3 delete-dialog-header">
          <h3 class="text-h6 font-weight-bold">Delete Tasklist?</h3>
          <v-btn icon="mdi-close" variant="text" @click="closeDeleteDialog" />
        </div>



        <p class="mb-4 delete-dialog-message">
          Are you sure you want to delete?
          <strong>{{ deleteDialog.tasklist?.name || "this tasklist" }}</strong>?
        </p>

        <div class="d-flex justify-center ga-2">
          <v-btn
            color="#8b1e1e"
            class="text-white"
            :loading="deleteDialog.deleting"
            :disabled="deleteDialog.deleting"
            @click="confirmDeleteTasklist"
          >
            Delete Tasklist
          </v-btn>
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
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
  ID: null,
  name: "",
  description: "",
});

const createDefaultDialogState = () => ({
  open: false,
  editingID: null,
  originalTaskIDs: [],
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
      viewDialog: {
        open: false,
        loading: false,
        error: "",
        tasklist: null,
        tasks: [],
      },
      deleteDialog: {
        open: false,
        deleting: false,
        error: "",
        tasklist: null,
      },
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

    getTaskId(task) {
      return task?.ID ?? task?.id ?? null;
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

    async openViewDialog(tasklist) {
      this.viewDialog = {
        open: true,
        loading: true,
        error: "",
        tasklist,
        tasks: [],
      };

      try {
        const response = await taskListItemServices.getAll({
          taskListID: this.getTasklistId(tasklist),
        });

        this.viewDialog = {
          ...this.viewDialog,
          loading: false,
          tasks: Array.isArray(response) ? response : [],
        };
      } catch (error) {
        console.error("Failed to load tasklist tasks:", error?.response?.data || error);
        this.viewDialog = {
          ...this.viewDialog,
          loading: false,
          error: error?.response?.data?.message || "Failed to load tasklist tasks.",
        };
      }
    },

    closeViewDialog() {
      this.viewDialog = {
        open: false,
        loading: false,
        error: "",
        tasklist: null,
        tasks: [],
      };
    },

    async openEditDialog(tasklist) {
      const tasklistID = this.getTasklistId(tasklist);
      this.dialog = {
        open: true,
        editingID: tasklistID,
        originalTaskIDs: [],
        saving: false,
        error: "",
        form: {
          name: tasklist?.name || "",
          tasks: [createEmptyTask()],
        },
      };

      try {
        const response = await taskListItemServices.getAll({
          taskListID: tasklistID,
        });
        const tasks = Array.isArray(response)
          ? response.map((task) => ({
              ID: this.getTaskId(task),
              name: task?.name || "",
              description: task?.description || "",
            }))
          : [];

        this.dialog = {
          ...this.dialog,
          originalTaskIDs: tasks.map((task) => task.ID).filter(Boolean),
          form: {
            ...this.dialog.form,
            tasks: tasks.length > 0 ? tasks : [createEmptyTask()],
          },
        };
      } catch (error) {
        console.error("Failed to load tasklist tasks:", error?.response?.data || error);
        this.dialog = {
          ...this.dialog,
          error: error?.response?.data?.message || "Failed to load tasklist tasks.",
        };
      }
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
          ID: this.getTaskId(task),
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

      if (validTasks.length === 0) {
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
          await this.syncTaskItems(this.dialog.editingID, validTasks);
        } else {
          const createdTasklist = await taskListServices.create(payload);
          const tasklistID = this.getTasklistId(createdTasklist);

          if (!tasklistID) {
            throw new Error("Tasklist was created but no ID was returned.");
          }

          await this.createTaskItems(tasklistID, validTasks);
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

    async createTaskItems(tasklistID, tasks) {
      await Promise.all(
        tasks.map((task) =>
          taskListItemServices.create({
            name: task.name,
            description: task.description || null,
            taskListID: tasklistID,
            task_listID: tasklistID,
          })
        )
      );
    },

    async syncTaskItems(tasklistID, tasks) {
      const nextExistingIDs = tasks.map((task) => task.ID).filter(Boolean).map(String);
      const deletedTaskIDs = this.dialog.originalTaskIDs.filter(
        (taskID) => !nextExistingIDs.includes(String(taskID))
      );

      await Promise.all([
        ...tasks.map((task) => {
          const payload = {
            name: task.name,
            description: task.description || null,
            taskListID: tasklistID,
            task_listID: tasklistID,
          };

          return task.ID
            ? taskListItemServices.update(task.ID, payload)
            : taskListItemServices.create(payload);
        }),
        ...deletedTaskIDs.map((taskID) => taskListItemServices.delete(taskID)),
      ]);
    },

    openDeleteDialog(tasklist) {
      this.deleteDialog = {
        open: true,
        deleting: false,
        error: "",
        tasklist,
      };
    },

    closeDeleteDialog() {
      this.deleteDialog = {
        open: false,
        deleting: false,
        error: "",
        tasklist: null,
      };
    },

    async confirmDeleteTasklist() {
      await this.deleteTasklist(this.deleteDialog.tasklist);
    },

    async deleteTasklist(tasklist) {
      const tasklistID = this.getTasklistId(tasklist);
      if (!tasklistID) return;

      this.deletingTasklistID = tasklistID;
      this.deleteDialog = {
        ...this.deleteDialog,
        deleting: true,
        error: "",
      };
      this.error = "";

      try {
        await taskListServices.delete(tasklistID);
        this.tasklists = this.tasklists.filter(
          (item) => String(this.getTasklistId(item)) !== String(tasklistID)
        );

        if (String(this.dialog.editingID) === String(tasklistID)) {
          this.closeDialog();
        }

        this.closeDeleteDialog();
      } catch (error) {
        console.error("Failed to delete tasklist:", error?.response?.data || error);
        this.deleteDialog = {
          ...this.deleteDialog,
          deleting: false,
          error: error?.response?.data?.message || "Failed to delete tasklist.",
        };
      } finally {
        this.deletingTasklistID = null;
      }
    },
  },
};
</script>

<style scoped>
.tasklist-task-row {
  border: 1px solid rgba(139, 30, 30, 0.16);
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}

.delete-dialog-header {
  position: relative;
}

.delete-dialog-header .v-btn {
  position: absolute;
  right: 0;
}

.delete-dialog-message {
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}
</style>
