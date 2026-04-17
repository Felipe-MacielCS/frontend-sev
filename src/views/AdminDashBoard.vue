<template>
  <v-container fluid class="admin-dashboard pa-6 bg-grey-lighten-4">
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card class="hero-card pa-5" elevation="2">
          <div class="text-overline page-kicker">Admin Controls</div>
          <div class="text-h5 font-weight-bold mb-2">Department and user administration</div>

        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="5">
        <v-card class="pa-4 fill-height" elevation="2">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-h6 font-weight-bold">Departments</div>

            </div>

            <v-btn color="#8b1e1e" class="text-white" elevation="0" @click="startCreateDepartment">
              New Department
            </v-btn>
          </div>

          <v-alert v-if="departmentError" type="error" variant="tonal" class="mb-4">
            {{ departmentError }}
          </v-alert>

          <v-alert
            v-if="departmentMessage"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            {{ departmentMessage }}
          </v-alert>

          <v-table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="department in departments" :key="department.ID">
                <td>{{ department.name }}</td>
                <td>{{ department.location || "N/A" }}</td>
                <td class="text-right">
                  <v-btn size="small" variant="text" @click="startEditDepartment(department)">
                    Edit
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    color="error"
                    :loading="deletingDepartmentID === department.ID"
                    @click="deleteDepartment(department)"
                  >
                    Delete
                  </v-btn>
                </td>
              </tr>
              <tr v-if="!departments.length && !loadingDepartments">
                <td colspan="3" class="text-medium-emphasis py-4">No departments found.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <v-col cols="12" lg="7">
        <v-card class="pa-4 fill-height" elevation="2">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
            <div>
              <div class="text-h6 font-weight-bold">Users</div>

            </div>

            <v-text-field
              v-model="search"
              label="Search users"
              variant="solo"
              density="compact"
              hide-details
              style="max-width: 320px;"
            />
          </div>

          <v-alert v-if="userError" type="error" variant="tonal" class="mb-4">
            {{ userError }}
          </v-alert>

          <v-alert
            v-if="userMessage"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            {{ userMessage }}
          </v-alert>

          <v-table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="getUserID(user)">
                <td>
                  <div>{{ user.name || "Unnamed user" }}</div>
                  <div class="text-caption text-medium-emphasis">{{ user.email || "No email" }}</div>
                </td>
                <td>{{ getRoleDisplayForUser(user) }}</td>
                <td>{{ getDepartmentNameForUser(user) }}</td>
                <td>{{ user.status || "N/A" }}</td>
                <td class="text-right">
                  <v-btn size="small" variant="text" @click="openUserDialog(user)">
                    Edit
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    color="error"
                    :loading="deletingUserID === getUserID(user)"
                    @click="deleteUser(user)"
                  >
                    Delete
                  </v-btn>
                </td>
              </tr>
              <tr v-if="!filteredUsers.length && !loadingUsers">
                <td colspan="5" class="text-medium-emphasis py-4">No users found.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="departmentDialog.open" max-width="640" eager>
      <v-card class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-h6 font-weight-bold">
            {{ departmentDialog.form.ID ? "Edit Department" : "Create Department" }}
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeDepartmentDialog" />
        </div>

        <v-alert
          v-if="departmentDialog.error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ departmentDialog.error }}
        </v-alert>

        <v-text-field
          v-model="departmentDialog.form.name"
          label="Department name"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          v-model="departmentDialog.form.location"
          label="Location"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          v-model="departmentDialog.form.phone"
          label="Phone"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          v-model="departmentDialog.form.email"
          label="Email"
          variant="outlined"
        />

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" @click="closeDepartmentDialog">Cancel</v-btn>
          <v-btn
            color="#8b1e1e"
            class="text-white"
            :loading="departmentDialog.saving"
            :disabled="departmentDialog.saving"
            @click="saveDepartment"
          >
            Save
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="userDialog.open" max-width="900" eager>
      <v-card class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div>
            <div class="text-h6 font-weight-bold">{{ userDialog.user?.name || "User" }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ userDialog.user?.email || "No email" }}</div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeUserDialog" />
        </div>

        <v-alert v-if="userDialog.error" type="error" variant="tonal" class="mb-4">
          {{ userDialog.error }}
        </v-alert>

        <v-row>
          <v-col cols="12" md="6">
            <v-switch
              v-model="userDialog.form.isAdmin"
              color="primary"
              inset
              label="Admin access"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-subtitle-2 mb-2">Status</div>
            <v-btn-toggle
              v-model="userDialog.form.status"
              mandatory
              divided
              color="primary"
              class="admin-status-toggle"
            >
              <v-btn value="active" variant="outlined">Active</v-btn>
              <v-btn value="inactive" variant="outlined">Inactive</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>

        <template v-if="!userDialog.form.isAdmin">
          <div class="text-subtitle-1 font-weight-bold mb-2">Department Assignments</div>


          <v-card variant="outlined" class="pa-3 mb-3 admin-assignment-card">
            <div
              v-for="(assignment, index) in userDialog.form.assignments"
              :key="assignment.key"
              class="mb-3 admin-assignment-row"
            >
              <v-row class="align-end">
                <v-col cols="12" md="7">
                <v-select
                  v-model="assignment.departmentID"
                  :items="availableDepartmentOptionsForIndex(index)"
                  label="Department"
                  variant="outlined"
                  item-title="title"
                  item-value="value"
                  :menu-props="{ maxHeight: 280 }"
                />
                </v-col>
                <v-col cols="12" md="4">
                <v-select
                  v-model="assignment.role"
                  :items="departmentRoleOptions"
                  label="Department role"
                  variant="outlined"
                  :menu-props="{ maxHeight: 280 }"
                />
                </v-col>
                <v-col cols="12" md="1" class="d-flex justify-end">
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    @click="removeDepartmentAssignment(index)"
                  />
                </v-col>
              </v-row>
            </div>

            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus"
              @click="addDepartmentAssignment"
            >
              Add Department
            </v-btn>
          </v-card>
        </template>

        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="mb-3"
        >
          Admins do not need departments
        </v-alert>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" @click="closeUserDialog">Cancel</v-btn>
          <v-btn
            color="#8b1e1e"
            class="text-white"
            :loading="userDialog.saving"
            :disabled="userDialog.saving"
            @click="saveUser"
          >
            Save Changes
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import departmentServices from "../services/departmentServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";

const DEFAULT_DEPARTMENT = () => ({
  ID: null,
  name: "",
  location: "",
  phone: "",
  email: "",
});

const DEFAULT_USER = () => ({
  isAdmin: false,
  status: "active",
  assignments: [],
});

export default {
  name: "AdminDashBoard",
  data() {
    return {
      loadingDepartments: false,
      loadingUsers: false,
      search: "",
      departments: [],
      users: [],
      departmentAssignments: [],
      deletingDepartmentID: null,
      departmentError: "",
      departmentMessage: "",
      userError: "",
      userMessage: "",
      deletingUserID: null,
      departmentDialog: {
        open: false,
        saving: false,
        error: "",
        form: DEFAULT_DEPARTMENT(),
      },
      userDialog: {
        open: false,
        saving: false,
        error: "",
        user: null,
        assignment: null,
        form: DEFAULT_USER(),
      },
      departmentRoleOptions: ["Manager", "Worker"],
    };
  },
  computed: {
    filteredUsers() {
      const query = this.search.trim().toLowerCase();
      if (!query) return this.users;
      return this.users.filter((user) => {
        const name = String(user?.name || "").toLowerCase();
        const email = String(user?.email || "").toLowerCase();
        const role = String(this.getRoleDisplayForUser(user) || "").toLowerCase();
        return name.includes(query) || email.includes(query) || role.includes(query);
      });
    },
    departmentOptions() {
      return this.departments.map((department) => ({
        title: department.name,
        value: this.getDepartmentID(department),
      }));
    },
  },
  watch: {
    "userDialog.form.isAdmin"(isAdmin) {
      if (!isAdmin) return;
      this.userDialog.form.assignments = [];
    },
  },
  async mounted() {
    await this.loadAdminData();
  },
  methods: {
    createAssignmentFormRow(assignment = {}) {
      return {
        key: `${assignment?.ID ?? "new"}-${assignment?.departmentID ?? "dept"}-${Math.random().toString(36).slice(2, 9)}`,
        ID: this.getAssignmentID(assignment),
        departmentID: assignment?.departmentID ?? null,
        role: this.normalizeRoleLabel(assignment?.role || "Worker"),
      };
    },
    normalizeRole(value) {
      return String(value || "").trim().toLowerCase();
    },
    normalizeRoleLabel(value) {
      const normalized = this.normalizeRole(value);
      if (normalized === "admin") return "Admin";
      if (normalized === "manager") return "Manager";
      return "Worker";
    },
    getUserID(user) {
      return Number(user?.ID ?? user?.id ?? user?.userID ?? 0) || null;
    },
    getDepartmentID(department) {
      return Number(department?.ID ?? department?.id ?? department?.departmentID ?? 0) || null;
    },
    getAssignmentID(assignment) {
      return Number(assignment?.ID ?? assignment?.id ?? 0) || null;
    },
    formatRole(value) {
      return this.normalizeRoleLabel(value);
    },
    getDepartmentRolesForUser(user) {
      const roles = this.getAssignmentsForUser(this.getUserID(user))
        .map((assignment) => this.normalizeRoleLabel(assignment?.role))
        .filter(Boolean);

      return [...new Set(roles)];
    },
    getRoleDisplayForUser(user) {
      if (this.normalizeRole(user?.role) === "admin") return "Admin";

      const departmentRoles = this.getDepartmentRolesForUser(user);
      if (departmentRoles.length === 0) return "Worker";
      return departmentRoles.join(", ");
    },
    getAssignmentsForUser(userID) {
      return this.departmentAssignments.filter(
        (assignment) => String(assignment?.userID) === String(userID)
      );
    },
    getDepartmentNameByID(departmentID) {
      const department = this.departments.find(
        (item) => String(this.getDepartmentID(item)) === String(departmentID)
      );
      return department?.name || "Unassigned";
    },
    getDepartmentNamesForUser(user) {
      return this.getAssignmentsForUser(this.getUserID(user))
        .map((assignment) => this.getDepartmentNameByID(assignment.departmentID))
        .filter(Boolean);
    },
    getDepartmentNameForUser(user) {
      const names = this.getDepartmentNamesForUser(user);
      return names.length ? names.join(", ") : "Unassigned";
    },
    availableDepartmentOptionsForIndex(index) {
      const selectedIDs = new Set(
        this.userDialog.form.assignments
          .filter((_, currentIndex) => currentIndex !== index)
          .map((assignment) => String(assignment.departmentID || ""))
          .filter(Boolean)
      );

      return this.departmentOptions.filter((option) => !selectedIDs.has(String(option.value)));
    },
    addDepartmentAssignment() {
      this.userDialog.form.assignments.push(this.createAssignmentFormRow());
    },
    removeDepartmentAssignment(index) {
      this.userDialog.form.assignments.splice(index, 1);
    },
    clearMessages() {
      this.departmentError = "";
      this.departmentMessage = "";
      this.userError = "";
      this.userMessage = "";
    },
    async loadAdminData() {
      this.clearMessages();
      this.loadingDepartments = true;
      this.loadingUsers = true;

      try {
        const [departments, users, assignments] = await Promise.all([
          departmentServices.getAll(),
          userServices.getAll(),
          departmentUsersServices.getAll(),
        ]);

        this.departments = Array.isArray(departments) ? departments : departments?.data || [];
        this.users = Array.isArray(users) ? users : users?.data || [];
        this.departmentAssignments = Array.isArray(assignments) ? assignments : assignments?.data || [];
      } catch (error) {
        const message = error?.response?.data?.message || "Failed to load admin data.";
        this.departmentError = message;
        this.userError = message;
        console.error("Failed to load admin data:", error?.response?.data || error);
      } finally {
        this.loadingDepartments = false;
        this.loadingUsers = false;
      }
    },
    startCreateDepartment() {
      this.departmentDialog = {
        open: true,
        saving: false,
        error: "",
        form: DEFAULT_DEPARTMENT(),
      };
    },
    startEditDepartment(department) {
      this.departmentDialog = {
        open: true,
        saving: false,
        error: "",
        form: {
          ID: this.getDepartmentID(department),
          name: department?.name || "",
          location: department?.location || "",
          phone: department?.phone || "",
          email: department?.email || "",
        },
      };
    },
    closeDepartmentDialog() {
      this.departmentDialog = {
        open: false,
        saving: false,
        error: "",
        form: DEFAULT_DEPARTMENT(),
      };
    },
    async saveDepartment() {
      const form = this.departmentDialog.form;
      if (!String(form.name || "").trim()) {
        this.departmentDialog.error = "Department name is required.";
        return;
      }

      this.departmentDialog.saving = true;
      this.departmentDialog.error = "";
      this.departmentError = "";
      this.departmentMessage = "";

      try {
        const payload = {
          name: form.name.trim(),
          location: String(form.location || "").trim() || null,
          phone: String(form.phone || "").trim() || null,
          email: String(form.email || "").trim() || null,
        };

        if (form.ID) {
          await departmentServices.update(form.ID, payload);
        } else {
          await departmentServices.create(payload);
        }

        await this.loadAdminData();
        this.departmentMessage = form.ID ? "Department updated." : "Department created.";
        this.closeDepartmentDialog();
      } catch (error) {
        this.departmentDialog.error =
          error?.response?.data?.message || "Failed to save department.";
        console.error("Failed to save department:", error?.response?.data || error);
      } finally {
        this.departmentDialog.saving = false;
      }
    },
    async deleteDepartment(department) {
      const departmentID = this.getDepartmentID(department);
      if (!departmentID) return;

      this.deletingDepartmentID = departmentID;
      this.departmentError = "";
      this.departmentMessage = "";

      try {
        await departmentServices.delete(departmentID);
        await this.loadAdminData();
        this.departmentMessage = "Department deleted.";
      } catch (error) {
        this.departmentError =
          error?.response?.data?.message || "Failed to delete department.";
        console.error("Failed to delete department:", error?.response?.data || error);
      } finally {
        this.deletingDepartmentID = null;
      }
    },
    openUserDialog(user) {
      const assignments = this.getAssignmentsForUser(this.getUserID(user));
      this.userDialog = {
        open: true,
        saving: false,
        error: "",
        user,
        assignment: null,
        form: {
          isAdmin: this.normalizeRole(user?.role) === "admin",
          status: String(user?.status || "").trim().toLowerCase() === "inactive" ? "inactive" : "active",
          assignments: assignments.length
            ? assignments.map((assignment) => this.createAssignmentFormRow(assignment))
            : [],
        },
      };
    },
    closeUserDialog() {
      this.userDialog = {
        open: false,
        saving: false,
        error: "",
        user: null,
        assignment: null,
        form: DEFAULT_USER(),
      };
    },
    async saveUser() {
      const userID = this.getUserID(this.userDialog.user);
      if (!userID) return;

      this.userDialog.saving = true;
      this.userDialog.error = "";
      this.userError = "";
      this.userMessage = "";

      try {
        const isAdmin = Boolean(this.userDialog.form.isAdmin);
        await userServices.update(userID, {
          role: isAdmin ? "Admin" : "Worker",
          status: this.userDialog.form.status,
        });

        const nextAssignments = isAdmin
          ? []
          : this.userDialog.form.assignments
              .filter((assignment) => assignment.departmentID)
              .map((assignment) => ({
                ...assignment,
                departmentID: Number(assignment.departmentID),
                role: this.normalizeRoleLabel(assignment.role || "Worker"),
              }));

        const duplicateDepartmentIDs = new Set();
        const seenDepartmentIDs = new Set();
        nextAssignments.forEach((assignment) => {
          const key = String(assignment.departmentID);
          if (seenDepartmentIDs.has(key)) duplicateDepartmentIDs.add(key);
          seenDepartmentIDs.add(key);
        });
        if (duplicateDepartmentIDs.size > 0) {
          this.userDialog.error = "A user cannot be assigned to the same department more than once.";
          return;
        }

        const currentAssignments = this.getAssignmentsForUser(userID);
        const currentAssignmentsByID = new Map(
          currentAssignments.map((assignment) => [this.getAssignmentID(assignment), assignment])
        );
        const nextAssignmentIDs = new Set(
          nextAssignments.map((assignment) => assignment.ID).filter(Boolean)
        );

        const assignmentsToDelete = currentAssignments.filter(
          (assignment) => !nextAssignmentIDs.has(this.getAssignmentID(assignment))
        );
        const assignmentsToUpdate = nextAssignments.filter((assignment) => assignment.ID);
        const assignmentsToCreate = nextAssignments.filter((assignment) => !assignment.ID);

        await Promise.all(assignmentsToDelete.map((assignment) =>
          departmentUsersServices.delete(this.getAssignmentID(assignment))
        ));

        await Promise.all(assignmentsToUpdate.map((assignment) => {
          const current = currentAssignmentsByID.get(assignment.ID);
          return departmentUsersServices.update(assignment.ID, {
            departmentID: assignment.departmentID,
            role: assignment.role,
            userID: current?.userID ?? userID,
          });
        }));

        await Promise.all(assignmentsToCreate.map((assignment) =>
          departmentUsersServices.create({
            userID,
            departmentID: assignment.departmentID,
            role: assignment.role,
          })
        ));

        await this.loadAdminData();
        this.closeUserDialog();
        this.userMessage = "User updated.";
      } catch (error) {
        this.userDialog.error = error?.response?.data?.message || "Failed to save user.";
        console.error("Failed to save user:", error?.response?.data || error);
      } finally {
        this.userDialog.saving = false;
      }
    },
    async deleteUser(user) {
      const userID = this.getUserID(user);
      if (!userID) return;

      this.deletingUserID = userID;
      this.userError = "";
      this.userMessage = "";

      try {
        const assignments = this.getAssignmentsForUser(userID);
        await Promise.all(
          assignments.map((assignment) =>
            departmentUsersServices.delete(this.getAssignmentID(assignment))
          )
        );
        await userServices.delete(userID);

        if (this.getUserID(this.userDialog.user) === userID) {
          this.closeUserDialog();
        }

        await this.loadAdminData();
        this.userMessage = "User deleted.";
      } catch (error) {
        this.userError = error?.response?.data?.message || "Failed to delete user.";
        console.error("Failed to delete user:", error?.response?.data || error);
      } finally {
        this.deletingUserID = null;
      }
    },
  },
};
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
}

.hero-card {
  background: linear-gradient(140deg, #fff8f6 0%, #fff 55%, #f3ecea 100%);
  border: 1px solid rgba(114, 21, 26, 0.08);
}

.page-kicker {
  color: #8b1e1e;
  letter-spacing: 0.12em;
}

.admin-assignment-card {
  max-height: 42vh;
  overflow-y: auto;
}

.admin-assignment-row:last-child {
  margin-bottom: 0 !important;
}

.admin-status-toggle {
  width: 100%;
}

.admin-status-toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-height: 52px;
  text-transform: none;
  letter-spacing: 0.01em;
}
</style>
