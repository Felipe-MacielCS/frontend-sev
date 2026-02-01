<script setup>
import { useRouter } from "vue-router";
import barbell from "../assets/cado-barbell.png";
import dumbbells from "../assets/cado-dumbbells.png";
import clipboard from "../assets/cado-clipboard.png";


const router = useRouter();

// Each card’s data
const cards = [
  {
    title: "Manage Athletes",
    image: barbell,
    route: "/coach/athletes",
  },
  {
    title: "Manage Exercises",
    image: dumbbells,
    route: "/coach/exercises",
  },
  {
    title: "Manage Exercise Plans",
    image: clipboard,
    route: "/coach/exerciseplans",
  },
];

// Navigate to selected section
const goTo = (path) => {
  router.push(path);
};
</script>

<template>
  <v-container class="dashboard-container" fluid>
    <h2 class="text-center mb-10 font-weight-bold">Welcome Coach</h2>

    <!-- Cards grid -->
    <v-row justify="center" align="center" class="gap-8">
      <v-col
        v-for="card in cards"
        :key="card.title"
        cols="12"
        sm="6"
        md="3"
        class="d-flex justify-center"
      >
        <v-card
          class="dashboard-card d-flex flex-column align-center justify-space-between"
          elevation="4"
          @click="goTo(card.route)"
        >
          <div class="text-center">
            <h3 class="mt-4 mb-2 font-weight-bold">{{ card.title }}</h3>
            <img :src="card.image" class="dash-image" />
            

          </div>

          <v-btn
            color="grey-lighten-2"
            class="mb-4 px-6 text-black font-weight-medium"
            variant="elevated"
          >
            View
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.dashboard-container {
  padding-top: 120px;
  padding-bottom: 50px;
}

.dash-image {
  width: 100%;
  max-width: 180px;     /* prevents huge images */
  max-height: 150px;    /* keeps tall images contained */
  object-fit: contain;  /* keeps full image visible */
  margin-top: 20px;
}

/* Card styling — Bigger and more balanced */
.dashboard-card {
  width: 300px;              /* wider */
  height: 420px;             /* taller */
  background-color: #9BBDCD;
  border-radius: 16px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  padding: 24px 0;           /* more breathing space */
}

/* Hover effect */
.dashboard-card:hover {
  transform: translateY(-8px);
  box-shadow: 0px 8px 18px rgba(0, 0, 0, 0.25);
}

.dash-image {
  width: 100%;
  max-width: 180px;     /* prevents huge images */
  max-height: 150px;    /* keeps tall images contained */
  object-fit: contain;  /* keeps full image visible */
  margin-top: 20px;
}

/* Card text and icon */
h3 {
  font-size: 1.3rem;
  color: #000;
  margin-bottom: 16px;
}

.v-icon {
  margin-top: 20px;
  font-size: 110px;          /* bigger icon */
}

/* View button */
.v-btn {
  text-transform: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  background-color: #cfcfcf !important;
  color: #000 !important;
  width: 110px;
  height: 42px;
}

.v-btn:hover {
  background-color: #bdbdbd !important;
}
</style>
