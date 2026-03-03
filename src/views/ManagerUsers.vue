<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card class="pa-4" elevation="2">
      <div class="d-flex align-center justify-space-between mb-4">
        <h2 class="text-h6 font-weight-bold">Workers</h2>

        <v-text-field
          v-model="search"
          label="Search workers"
          variant="solo"
          density="compact"
          hide-details
          style="max-width: 320px;"
        />
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-alert v-if="!error && workers.length === 0 && !loading" type="info" variant="tonal" class="mb-4">
        No workers found for your department.
      </v-alert>

      <v-table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="w in filteredWorkers" :key="w.ID">
            <td>{{ w.name }}</td>
            <td>{{ w.email }}</td>
            <td>{{ w.phone }}</td>
            <td>{{ w.status }}</td>
            <td>
              <v-btn size="small" variant="text" @click="viewUser(w)">View</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script>
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";

export default {
  name: "ManagerUsers",
  data() {
    return {
      loading: false,
      error: "",
      search: "",
      workers: [],
      headers: [
        { title: "Name", key: "name" },
        { title: "Email", key: "email" },
        { title: "Phone", key: "phone" },
        { title: "Status", key: "status" },
        { title: "Actions", key: "actions", sortable: false },
      ],
    };
  },
  computed: {
    filteredWorkers() {
      const q = this.search.trim().toLowerCase();
      if (!q) return this.workers;
      return this.workers.filter((u) => {
        const name = String(u.name ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        const phone = String(u.phone ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    },
  },
  async mounted() {
    await this.loadWorkers();
  },
  methods: {
    async getManagerDepartmentID() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      const u = stored?.user ?? stored;
      const managerID = u?.ID ?? u?.id ?? u?.userID;
      if (!managerID) return null;

      const res = await departmentUsersServices.getByUser(managerID);

      const links = Array.isArray(res)
        ? res
        : Array.isArray(res?.departmentusers)
        ? res.departmentusers
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const managerLink =
        links.find((l) => String(l.role).toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },

    async loadWorkers() {
      this.loading = true;
      this.error = "";
      this.workers = [];

      try {
        const departmentID = await this.getManagerDepartmentID(); // ✅ await
        if (!departmentID) {
          this.error = "No department found for this manager (check department_users for manager row).";
          return;
        }

        const duRes = await departmentUsersServices.getByDepartment(departmentID);

        const links = Array.isArray(duRes)
          ? duRes
          : Array.isArray(duRes?.departmentusers)
          ? duRes.departmentusers
          : Array.isArray(duRes?.data)
          ? duRes.data
          : [];

        const userIDs = links
          .filter((l) => String(l.role || "").trim().toLowerCase() === "worker")
          .map((l) => l.userID)
          .filter(Boolean);

        const users = await Promise.all(userIDs.map((id) => userServices.get(id)));

        this.workers = users.filter((u) => String(u.role || "").toLowerCase() === "worker");
      } catch (e) {
        this.error = e?.response?.data?.message || "Failed to load workers.";
        console.error(e?.response?.data || e);
      } finally {
        this.loading = false;
      }
    },

    viewUser(user) {

      console.log("View user:", user);
    },
  },
};
</script>