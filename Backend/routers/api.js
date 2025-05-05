const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const forge = require("node-forge");
const redisClient = require("../redisClient");

let privateKeyStore = {};
let publicKeyStore = {};

router.post("/generate-key", async (req, res) => {
  const uuid = uuidv4();

  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  privateKeyStore[uuid] = privateKeyPem;
  publicKeyStore[uuid] = publicKeyPem;

  await redisClient.del(`set:${uuid}`); // Reset for new UUID

  res.json({ uuid, publicKey: publicKeyPem });
});

router.post("/submit/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const { encrypted } = req.body;

  if (!publicKeyStore[uuid]) {
    return res.status(400).json({ error: "Invalid UUID" });
  }

  const isMember = await redisClient.sIsMember(`set:${uuid}`, encrypted);
  if (isMember) {
    return res.json({ unique: false, message: "Duplicate detected" });
  }

  await redisClient.sAdd(`set:${uuid}`, encrypted);

  const count = await redisClient.sCard(`set:${uuid}`);
  let sorted = [];

  if (count == 15) {
    const privateKeyPem = privateKeyStore[uuid];
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const allEncrypted = await redisClient.sMembers(`set:${uuid}`);
    const decrypted = allEncrypted.map((enc) => {
      const encryptedBytes = forge.util.decode64(enc);
      const decryptedText = privateKey.decrypt(encryptedBytes, "RSA-OAEP");
      return parseFloat(decryptedText);
    });

    sorted = decrypted.sort((a, b) => b - a);
  }

  res.json({
    unique: true,
    totalUnique: count,
    sorted: sorted.length ? sorted : null,
  });
});

module.exports = router;
