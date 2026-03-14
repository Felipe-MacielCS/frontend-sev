<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card class="pa-4" elevation="2">
      <div class="d-flex align-center justify-space-between mb-4">
        <h2 class="text-h6 font-weight-bold">Templates</h2>
        <v-btn color="primary" variant="tonal" @click="$router.push('/manager')">
          Go To Schedule
        </v-btn>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-3">
        {{ error }}
      </v-alert>

      <v-alert
        v-if="!error && templates.length === 0 && !loading"
        type="info"
        variant="tonal"
        class="mb-3"
      >
        No templates yet. Create one from the Schedule page by selecting type = Template.
      </v-alert>

      <v-table v-if="templates.length > 0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Range</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in templates" :key="t.ID">
            <td>{{ t.name || "Untitled Template" }}</td>
            <td>{{ t.start_date }} to {{ t.end_date }}</td>
            <td>{{ t.status }}</td>
            <td>
              <v-btn
                size="small"
                variant="text"
                @click="openInSchedule(t)"
              >
                Use In Schedule
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script>
import scheduleServices from "../services/scheduleServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";

export default {
  name: "ManagerTemplates",
  data() {
    return {
      loading: false,
      error: "",
      templates: [],
      managerDepartmentID: null,
    };
  },
  async mounted() {
    await this.loadTemplates();
  },
  methods: {
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
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
        links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },
    async loadTemplates() {
      this.loading = true;
      this.error = "";
      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.error = "No manager department found.";
          return;
        }
        const res = await scheduleServices.getAll({
          departmentID: this.managerDepartmentID,
          type: "template",
          limit: 200,
        });
        this.templates = Array.isArray(res?.schedules) ? res.schedules : [];
      } catch (e) {
        console.error(e);
        this.error = e?.response?.data?.message || "Failed to load templates.";
      } finally {
        this.loading = false;
      }
    },
    openInSchedule(template) {
      this.$router.push({
        path: "/manager",
        query: { templateID: String(template.ID) },
      });
    },
  },
};
</script>
