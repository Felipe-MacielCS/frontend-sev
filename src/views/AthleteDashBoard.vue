<template>
  <v-container fluid class="pa-0" style="background-color: #e6f3fa; min-height: 100vh;">

    <v-container class="py-10" style="max-width: 1200px;">
     
       <v-container class="dashboard-container" fluid>
          <h2 class="text-center mb-10 font-weight-bold"></h2>
      </v-container>
      <h1 class="dashboard-container font-weight-bold">Welcome {{ athleteName }}!</h1>
      <p class="text-subtitle-1 mb-6">Pick an exercise plan and let's get started!</p>

      <v-row class="mb-8" align="center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="selectedDateString"
            label="Select Date"
            prepend-icon="mdi-calendar"
            type="date"
            variant="outlined"
            density="comfortable"
            @update:model-value="handleDateChange"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row justify="center" align="start" no-gutters>

        <v-col cols="12" md="4" class="pa-2">
          <v-card color="#bcd1dc" class="pa-6 rounded-lg" elevation="2">
            <h3 class="text-h6 font-weight-bold mb-4">Result from that date:</h3>

            <div
              v-for="(item, idx) in results"
              :key="idx"
              class="d-flex justify-space-between my-3 text-body-1"
            >
              <span>{{ item.exercise }}</span>
              <span class="font-weight-bold">{{ item.value }} LB</span>
            </div>

          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="pa-2 text-center">
          <v-btn color="black" icon class="mb-4" @click="handlePlay">
            <v-icon>mdi-play-circle</v-icon>
          </v-btn>

          <v-select
            v-model="selectedPlan"
            :items="exercisePlans"
            item-title="name"
            item-value="id"
            label="Exercise Plan"
            variant="outlined"
            class="mb-6"
            :loading="loadingPlans"
          />

          <img
            :src="logo"
            width="160"
            alt="mascot"
          />
        </v-col>

        <v-col cols="12" md="4" class="pa-2">
          <v-card color="#bcd1dc" class="pa-6 rounded-lg" elevation="2">
            <h3 class="text-h6 font-weight-bold mb-4">Top 5 Goals:</h3>

            <div
              v-for="(item, idx) in goals"
              :key="idx"
              class="d-flex justify-space-between my-3 text-body-1"
            >
              <span>{{ item.exercise }}</span>
              <span class="font-weight-bold">{{ item.value }} LB</span>
            </div>

          </v-card>
        </v-col>

      </v-row>

      <v-dialog v-model="playDialog" max-width="600">
        <v-card>
          <v-card-title class="font-weight-bold">
            Exercises in {{ selectedPlanName }}
          </v-card-title>

          <v-card-text>
            <div v-if="!selectedPlan">
              Please select an exercise plan first.
            </div>
            <div v-else>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th class="text-center">Sets</th>
                    <th class="text-center">Reps</th>
                    <th class="text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="planExercises.length === 0">
                    <td colspan="3" class="text-center py-4">
                      No exercises in this plan.
                    </td>
                  </tr>
                  <tr
                    v-for="(entry, idx) in planExercises"
                    :key="idx"
                  >
                    <td>{{ entry.exerciseName }}</td>
                    <td class="text-center">{{ entry.sets }}</td>

                    <td class="text-center">{{ entry.repetitions }}</td>

                    <td class="text-center" style="width:120px;">
                      <v-text-field
                        v-model="resultInputs[entry.exerciseID]"
                        type="number"
                        hide-details
                        density="compact"
                        placeholder="LB"
                        style="max-width:90px;"
                      />
                    </td>

                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card-text>

          <v-card-actions class="justify-end">

            <v-btn color="primary" @click="saveAllResults">
              Save All Results
            </v-btn>
            <v-btn variant="text" @click="playDialog = false">
              Close
            </v-btn>

          </v-card-actions>
        </v-card>
      </v-dialog>

    </v-container>

  </v-container>
</template>


<script setup>
import { ref, onMounted, watch, computed } from "vue";
import Utils from "../config/utils.js";
import logo from "../assets/cado-barbell.png";

import AthleteServices from "../services/athleteServices.js";
import ExercisePlanServices from "../services/exerciseplanServices.js";
import GoalServices from "../services/goalServices.js";
import ResultServices from "../services/resultServices.js";
import ExercisePoolServices from "../services/exercisepoolServices.js";
import ExerciseServices from "../services/exerciseServices.js"; 
import PlanAssignmentServices from "../services/planAssignmentServices.js";

const athleteId = ref(null);
const athleteName = ref("Athlete");
const resultInputs = ref({});
const selectedDate = ref(new Date());
const selectedDateString = ref(new Date().toISOString().split('T')[0]);

const storedUser = Utils.getStore("user") || null;

const currentDate = new Date().toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const handleDateChange = (newDate) => {
  if (newDate) {
    selectedDate.value = new Date(newDate);
  }
};

const allGoalsRaw = ref([]);    
const allResultsRaw = ref([]);  
const poolEntries = ref([]);    
const exercises = ref([]);      

const results = ref([{ exercise: "No data", value: "--" }]);
const goals = ref([{ exercise: "No goals found", value: "--" }]);

const exercisePlans = ref([]);
const selectedPlan = ref(null);
const loadingPlans = ref(true);

const playDialog = ref(false);

const selectedPlanName = computed(() => {
  const p = exercisePlans.value.find((p) => p.id === selectedPlan.value);
  return p?.name || "Selected Plan";
});

const planExercises = computed(() => {
  if (!selectedPlan.value || !poolEntries.value.length) return [];

  const selectedId = Number(selectedPlan.value);

  return poolEntries.value
    .filter((pe) => pe.planID === selectedId)
    .map((pe) => {
      const ex = exercises.value.find((e) => e.exerciseID === pe.exerciseID);
      return {
        exerciseID: pe.exerciseID,
        sets: pe.sets,
        repetitions: pe.repetitions,
        exerciseName: ex?.name || `Exercise #${pe.exerciseID}`,
      };
    });
});

const loadAthlete = async () => {
  const user = Utils.getStore("user");

  if (!user) {
    console.error("No logged-in user found in local storage.");
    return;
  }

  const res = await AthleteServices.getAll();
  const list = res.data ?? res;

  const athlete = (list || []).find((a) => a.userID === user.userID);

  if (athlete) {
    athleteId.value = athlete.athleteID;
    athleteName.value = athlete.user?.name || user.name || "Athlete";
  } else {
    console.warn("Could not find athlete record for userID:", user.userID);
  }
};

const fetchAllPlans = async () => {
  loadingPlans.value = true;

  try {
    if (!athleteId.value) {
      console.warn("fetchAllPlans called before athleteId is set.");
      exercisePlans.value = [];
      return;
    }

    const [plansRes, assignmentsRes] = await Promise.all([
      ExercisePlanServices.getAll(),
      PlanAssignmentServices.getAll(),
    ]);

    const plansData = plansRes.data ?? plansRes;
    const assignmentsData = assignmentsRes.data ?? assignmentsRes;

    const myPlanIds = new Set(
      (assignmentsData || [])
        .filter((row) => row.athleteID === athleteId.value)
        .map((row) => row.planID)
    );

    exercisePlans.value = (plansData || [])
      .filter((p) => myPlanIds.has(p.planID || p.id))
      .map((p) => ({
        id: p.planID || p.id,
        name: p.name || "Untitled Plan",
      }));

    console.log("Loaded assigned plans for athlete:", exercisePlans.value);
  } catch (err) {
    console.error("Error loading assigned exercise plans:", err);
    exercisePlans.value = [];
  } finally {
    loadingPlans.value = false;
  }
};

const loadGoals = async () => {
  if (!athleteId.value) return;
  try {
    const res = await GoalServices.getAll();
    const data = res.data ?? res;

    allGoalsRaw.value = (data || []).filter(
      (g) => g.athleteID === athleteId.value
    );

    console.log("All goals for athlete:", allGoalsRaw.value);
    applyFilters();
  } catch (err) {
    console.error("Error loading goals:", err);
    allGoalsRaw.value = [];
    applyFilters();
  }
};

const loadResults = async () => {
  try {
    const res = await ResultServices.getAll();
    const data = res.data ?? res;

    allResultsRaw.value = data || [];
    console.log("All results (raw):", allResultsRaw.value);
    applyFilters();
  } catch (err) {
    console.error("Error loading results:", err);
    allResultsRaw.value = [];
    applyFilters();
  }
};

const loadPoolEntries = async () => {
  try {
    const res = await ExercisePoolServices.getAll();
    const data = res.data ?? res;
    poolEntries.value = data || [];
    console.log("Loaded pool entries:", poolEntries.value);
    applyFilters();
  } catch (err) {
    console.error("Error loading exercise pool entries:", err);
    poolEntries.value = [];
    applyFilters();
  }
};

const saveAllResults = async () => {
  try {
    const selectedId = Number(selectedPlan.value);

    const exercisesInPlan = poolEntries.value.filter(
      p => p.planID === selectedId
    );

    const goalByExercise = {};
    allGoalsRaw.value.forEach(g => {
      goalByExercise[g.exerciseID] = g.goalID;
    });

    for (const entry of exercisesInPlan) {
      const exerciseID = entry.exerciseID;
      const goalID = goalByExercise[exerciseID];

      if (!resultInputs.value[exerciseID]) continue;

      if (!goalID) {
        console.warn("No goal for exercise:", exerciseID);
        continue;
      }

      const payload = {
        goalID,
        recordDate: selectedDateString.value,
        value: Number(resultInputs.value[exerciseID]),
        notes: null,
      };

      await ResultServices.create(payload);
    }

    alert("Results saved!");
    await loadResults();
    playDialog.value = false;

  } catch (err) {
    console.error("Error saving results:", err);
    alert("Could not save results.");
  }
};


const loadExercises = async () => {
  try {
    const res = await ExerciseServices.getAll();
    const data = res.data ?? res;
    exercises.value = data || [];
    console.log("Loaded exercises:", exercises.value);
  } catch (err) {
    console.error("Error loading exercises:", err);
    exercises.value = [];
  }
};

const applyFilters = () => {
  let exerciseIdsForPlan = null;
  if (selectedPlan.value && poolEntries.value.length) {
    const selectedId = Number(selectedPlan.value);
    exerciseIdsForPlan = new Set(
      poolEntries.value
        .filter((pe) => pe.planID === selectedId)
        .map((pe) => pe.exerciseID)
    );
  }

  if (!allGoalsRaw.value.length) {
    goals.value = [{ exercise: "No goals found", value: "--" }];
  } else {
    let gList = allGoalsRaw.value;

    if (exerciseIdsForPlan) {
      gList = gList.filter(
        (g) => g.exerciseID && exerciseIdsForPlan.has(g.exerciseID)
      );
    }

    if (!gList.length) {
      goals.value = [{ exercise: "No goals for this plan", value: "--" }];
    } else {
      goals.value = gList.slice(0, 5).map((g) => ({
        exercise: g.type || g.exerciseName || "Goal",
        value: g.target ?? "--",
      }));
    }
  }

  if (!allResultsRaw.value.length) {
    results.value = [{ exercise: "No data", value: "--" }];
    return;
  }

  const goalMap = new Map();
  allGoalsRaw.value.forEach((g) => {
    if (g.goalID != null) goalMap.set(g.goalID, g);
  });

  let rList = allResultsRaw.value.filter((r) => {
    if (r.goalID != null && goalMap.has(r.goalID)) return true;
    if (r.athleteID != null && athleteId.value != null) {
      return r.athleteID === athleteId.value;
    }
    return false;
  });

  rList = rList.map((r) => {
    const g = goalMap.get(r.goalID);
    const exerciseID = g?.exerciseID || r.exerciseID;
    const exerciseName =
      g?.exerciseName ||
      g?.type ||
      r.exerciseName ||
      r.exercise ||
      "Exercise";
    return {
      ...r,
      exerciseID,
      exerciseName,
    };
  });

  if (exerciseIdsForPlan) {
    rList = rList.filter(
      (r) => r.exerciseID && exerciseIdsForPlan.has(r.exerciseID)
    );
  }

  if (selectedDate.value) {
    const selectedDateObj = new Date(selectedDate.value);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    rList = rList.filter((r) => {
      if (!r.recordDate) return false;
      const resultDate = new Date(r.recordDate);
      resultDate.setHours(0, 0, 0, 0);
      return resultDate.getTime() === selectedDateObj.getTime();
    });
  }

  if (!rList.length) {
    results.value = [{ exercise: "No results for this date", value: "--" }];
  } else {
    results.value = rList.map((r) => ({
      exercise: r.exerciseName,
      value: r.value ?? r.weight ?? "--",
    }));
  }
};

watch(selectedPlan, () => {
  applyFilters();
});

watch(selectedDate, () => {
  applyFilters();
});

const handlePlay = () => {
  if (!selectedPlan.value) {
    alert("Please select an exercise plan first.");
    return;
  }
  playDialog.value = true;
};

onMounted(async () => {
  try {
    await loadAthlete();

    if (!athleteId.value) {
      console.error("Athlete ID still missing after loadAthlete.");
      return;
    }

      await fetchAllPlans();

    await Promise.all([
      loadGoals(),
      loadResults(),
      loadPoolEntries(),
      loadExercises(), 
    ]);
  } catch (err) {
    console.error("Error loading athlete dashboard:", err);
  }
});
</script>