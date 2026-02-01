<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";

import AthleteServices from "../services/athleteServices.js";
import CoachServices from "../services/coachServices.js";
import CoachAthleteServices from "../services/coachAthleteServices.js";

// ---------- CURRENT USER / COACH ----------
const router = useRouter();
const currentUser = ref(Utils.getStore("user") || {});
const currentCoachID = ref(null);

// ---------- STATE ----------
const search = ref("");
const selectedSport = ref("All Sports");
const sports = ["All Sports"];

const athletes = ref([]);       // all athletes from the backend
const assignments = ref([]);    // coach-athlete rows for current coach
const loading = ref(true);

// dialogs
const viewDialog = ref(false);
const athleteToView = ref(null);

const addDialog = ref(false);
const selectedAthleteIDs = ref([]); // IDs chosen in Add Athlete dialog

// ---------- HELPERS ----------
const goToGoals = (athlete) => {
  router.push(`/coach/goals/${athlete.id}`);
};

const isAssigned = (athleteID) =>
  assignments.value.some((ca) => ca.athleteID === athleteID);

// only athletes assigned to THIS coach
const filteredAthletes = computed(() =>
  athletes.value.filter(
    (a) =>
      isAssigned(a.id) &&
      a.name.toLowerCase().includes(search.value.toLowerCase())
  )
);

// options for Add Athlete dialog: only NOT yet assigned to this coach
const unassignedAthleteOptions = computed(() =>
  athletes.value
    .filter((a) => !isAssigned(a.id))
    .map((a) => ({
      title: a.name,
      value: a.id,
    }))
);

// ---------- FETCH FUNCTIONS ----------
const fetchCoaches = async () => {
  try {
    const res = await CoachServices.getAll();
    const data = res.data ?? res;

    const coaches = data || [];
    if (currentUser.value && currentUser.value.userID) {
      const mine = coaches.find(
        (c) =>
          c.userID === currentUser.value.userID ||
          c.user?.userID === currentUser.value.userID
      );
      if (mine) {
        currentCoachID.value = mine.coachID;
        console.log("Current coachID:", currentCoachID.value);
      } else {
        console.warn(
          "No coach profile found for userID",
          currentUser.value.userID
        );
      }
    }
  } catch (err) {
    console.error("Error fetching coaches:", err);
  }
};

const fetchAthletes = async () => {
  try {
    const res = await AthleteServices.getAll();
    const data = res.data ?? res;

    athletes.value = (data || []).map((a) => ({
      id: a.athleteID,
      userID: a.userID,
      name: a.user?.name || "Unknown",
      email: a.user?.email || "",
      sport: a.sport || "N/A",
      age: a.age || "-",
      weight: a.weight || "-",
      height: a.height || "-",
    }));

    console.log("Loaded athletes:", athletes.value);
  } catch (err) {
    console.error("Error fetching athletes:", err);
  }
};

const fetchAssignments = async () => {
  if (!currentCoachID.value) return;

  try {
    const res = await CoachAthleteServices.getAll({
      coachID: currentCoachID.value,
    });
    const data = res.data ?? res;
    assignments.value = data || [];
    console.log("Loaded coach-athlete assignments:", assignments.value);
  } catch (err) {
    console.error("Error fetching coach-athlete assignments:", err);
  }
};

onMounted(async () => {
  loading.value = true;
  await fetchCoaches();
  await Promise.all([fetchAthletes(), fetchAssignments()]);
  loading.value = false;
});

// ---------- VIEW ATHLETE ----------
const viewAthlete = (athlete) => {
  athleteToView.value = athlete;
  viewDialog.value = true;
};

// ---------- ADD ATHLETE DIALOG ----------
const openAddDialog = () => {
  selectedAthleteIDs.value = [];
  addDialog.value = true;
};

const saveAssignments = async () => {
  if (!currentCoachID.value || selectedAthleteIDs.value.length === 0) {
    return;
  }

  try {
    // create an assignment row for each selected athlete
    await Promise.all(
      selectedAthleteIDs.value.map((athleteID) =>
        CoachAthleteServices.create({
          coachID: currentCoachID.value,
          athleteID,
        })
      )
    );

    console.log(
      "Assigned athletes",
      selectedAthleteIDs.value,
      "to coach",
      currentCoachID.value
    );

    await fetchAssignments(); // refresh assignment list so table updates
    addDialog.value = false;
  } catch (err) {
    console.error("Assign athlete failed:", err);
  }
};
</script>

<template>
  <v-container class="athletes-container" fluid>
    <v-row justify="center" class="mt-10">
      <v-col cols="12">
        <!-- TOP CONTROLS -->
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center gap-4" style="width: 70%;">
            <!-- <v-select
              v-model="selectedSport"
              :items="sports"
              label="Sports"
              density="compact"
              variant="outlined"
              class="w-25 small-input"
            /> -->

            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search Athlete"
              density="compact"
              variant="outlined"
              hide-details
              class="flex-grow-1 small-input"
            />
          </div>

          <!-- ADD ATHLETE (ASSIGN) BUTTON -->
          <v-btn
            color="black"
            class="add-athlete-btn"
            prepend-icon="mdi-plus"
            rounded="lg"
            size="large"
            @click="openAddDialog"
          >
            ADD ATHLETE
          </v-btn>
        </div>

        <!-- ATHLETE TABLE -->
        <v-table class="athlete-table" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Athlete Name</th>
              <th class="text-left">Age</th>
              <th class="text-left">Height</th>
              <th class="text-left">Weight</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center py-6">
                <v-progress-circular indeterminate color="black" />
              </td>
            </tr>

            <tr
              v-else
              v-for="athlete in filteredAthletes"
              :key="athlete.id"
              class="table-row"
            >
              <td>{{ athlete.name }}</td>
              <td>{{ athlete.age }}</td>
              <td>{{ athlete.height }}</td>
              <td>{{ athlete.weight }}</td>

              <td class="text-right">
                <v-btn
                  icon="mdi-account-details-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="viewAthlete(athlete)"
                />
                <v-btn
                  icon="mdi-clipboard-check-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="goToGoals(athlete)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- ADD ATHLETE (ASSIGN) DIALOG -->
        <v-dialog v-model="addDialog" max-width="500">
          <v-card class="pa-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <h2 class="font-weight-bold text-h5">Assign Athletes to Me</h2>
              <v-btn icon="mdi-close" variant="text" @click="addDialog = false" />
            </div>

            <v-card-text>
              <v-autocomplete
                v-model="selectedAthleteIDs"
                :items="unassignedAthleteOptions"
                label="Select Athletes"
                multiple
                chips
                closable-chips
                density="compact"
                variant="outlined"
              />
              <div class="mt-2 text-caption text-grey-darken-1">
                Only athletes not already assigned to you are shown here.
              </div>
            </v-card-text>

            <v-card-actions class="justify-end">
              <v-btn color="grey" variant="outlined" @click="addDialog = false">
                Cancel
              </v-btn>
              <v-btn color="green" variant="elevated" @click="saveAssignments">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- VIEW ATHLETE DIALOG -->
        <v-dialog v-model="viewDialog" max-width="450">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Athlete Details
            </v-card-title>

            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <strong>Name:</strong> {{ athleteToView?.name }}
                </v-list-item>
                <v-list-item>
                  <strong>Email:</strong> {{ athleteToView?.email }}
                </v-list-item>
                <v-list-item>
                  <strong>Sport:</strong> {{ athleteToView?.sport }}
                </v-list-item>
                <v-list-item>
                  <strong>Age:</strong> {{ athleteToView?.age }}
                </v-list-item>
                <v-list-item>
                  <strong>Weight:</strong> {{ athleteToView?.weight }} kg
                </v-list-item>
                <v-list-item>
                  <strong>Height:</strong> {{ athleteToView?.height }} cm
                </v-list-item>
              </v-list>
            </v-card-text>

            <v-card-actions class="justify-end">
              <v-btn color="grey" variant="outlined" @click="viewDialog = false">
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.athletes-container {
  padding-top: 50px;
}

.athlete-table {
  background-color: #d9d9d9;
  border-radius: 12px;
  margin: 20px auto;
}

th {
  font-weight: 700;
  color: black;
  padding: 12px;
}

td {
  background-color: #d9d9d9;
  border-top: 1px solid #bdbdbd;
}

td.text-right {
  padding-right: 18px;
}

.add-athlete-btn {
  color: white !important;
  font-weight: 700;
  padding: 10px 22px;
  letter-spacing: 0.5px;
  box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.25);
}

.small-input {
  max-height: 36px;
  font-size: 0.85rem;
}

.small-input .v-field__input {
  padding: 4px 8px;
}

.gap-4 {
  gap: 16px;
}

.v-card {
  border-radius: 16px !important;
}
</style>
