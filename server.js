const app = require("./src/app");
const config = require("./src/config/config");

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`);
});
