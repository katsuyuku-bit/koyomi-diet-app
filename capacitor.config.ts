import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.koyomidiet",
  appName: "きみとダイエット",
  webDir: "out",
  server: {
    url: "https://koyomi-diet-app.vercel.app",
    cleartext: false,
  },
};

export default config;