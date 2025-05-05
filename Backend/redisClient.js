const { createClient } = require("redis");

const client = createClient({
  url: "redis://default:aY0ddyca6ng3BVF3v8TYGfszusPC8MBQ@redis-17337.c305.ap-south-1-1.ec2.redns.redis-cloud.com:17337",
});

client.on("error", (err) => console.error("Redis Client Error", err));

client
  .connect()
  .then(() => console.log("Connected to Redis"))
  .catch((err) => console.error("Error connecting to Redis", err));

module.exports = client;
