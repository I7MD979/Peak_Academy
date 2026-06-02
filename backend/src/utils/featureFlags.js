function isEnabled(flagName) {
  const value = process.env[flagName];
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

module.exports = { isEnabled };
