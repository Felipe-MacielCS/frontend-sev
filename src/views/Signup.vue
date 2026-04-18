<script setup>
import SocialLogin from "../components/SocialLogin.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const goToLogin = () => {
  router.push("/login");
};
</script>

<template>
  <v-container fluid class="signup-shell pa-4 pa-md-8">
    <v-row class="fill-height" align="center" justify="center">
      <v-col cols="12" sm="10" md="8" lg="6" xl="5">
        <v-card class="signup-card pa-6 pa-md-8" elevation="6">
          <div class="text-overline signup-kicker mb-3">Eagles at Work</div>
          <h1 class="text-h4 text-md-h3 font-weight-bold mb-8">Welcome to Eagles at Work</h1>

          <SocialLogin />

          <v-divider class="my-8" />

          <div class="text-body-2 text-medium-emphasis mb-3">
            This uses the same school Google sign-in flow.
          </div>

          <v-btn
            color="#72151A"
            variant="tonal"
            size="large"
            class="text-none signup-secondary-btn"
            @click="goToLogin"
          >
            Back To Login
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.signup-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at bottom right, rgba(114, 21, 26, 0.12), transparent 28%),
    linear-gradient(145deg, #f8f5f3 0%, #efe8e4 100%);
}

.fill-height {
  min-height: calc(100vh - 32px);
}

.signup-card {
  border-radius: 28px;
  background: rgba(255, 250, 248, 0.96);
  border: 1px solid rgba(114, 21, 26, 0.08);
}

.signup-secondary-btn {
  min-width: 210px;
}

.signup-kicker {
  letter-spacing: 0.14em;
  color: #8b1e1e;
}
</style>
