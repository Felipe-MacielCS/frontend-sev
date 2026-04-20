<script setup>
import SocialLogin from "../components/SocialLogin.vue";
</script>

<template>
  <v-container fluid class="auth-shell pa-4 pa-md-8">
    <v-row class="fill-height" align="center" justify="center">
      <v-col cols="12" sm="10" md="8" lg="6" xl="5">
        <v-card class="auth-card pa-6 pa-md-8" elevation="6">
          <div class="text-center auth-header">
            <div class="text-overline auth-kicker mb-3">Eagles at Work</div>
            <h1 class="text-h4 text-md-h3 font-weight-bold">Welcome to Eagles at Work</h1>
          </div>

          <div class="auth-login-wrap">
            <SocialLogin />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(114, 21, 26, 0.12), transparent 28%),
    linear-gradient(135deg, #f8f5f3 0%, #efe8e4 100%);
}

.fill-height {
  min-height: calc(100vh - 32px);
}

.auth-card {
  border-radius: 28px;
  background: rgba(255, 250, 248, 0.96);
  border: 1px solid rgba(114, 21, 26, 0.08);
}

.auth-header {
  margin-bottom: 56px;
}

.auth-login-wrap {
  margin-top: 24px;
  margin-bottom: 24px;
}

.auth-kicker {
  letter-spacing: 0.14em;
  color: #8b1e1e;
}
</style>
