import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.koyomidiet",
  appName: "きみとダイエット",
  webDir: "out",
  server: {
    url: "https://あなたの-vercel-url.vercel.app",
    cleartext: false,
  },
};

export default config;