export const buildParentReport = (payload) => {
  return {
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload, null, 2))
  };
};
