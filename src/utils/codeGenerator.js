async function isCodeExist(code, db) {
  const [rows] = await db.execute(
    "SELECT id FROM teams WHERE code = ? LIMIT 1",
    [code]
  );
  return rows.length > 0;
}

async function generateUniqueCode(db) {
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    let randomPart = Math.random().toString(36).substring(2, 8);
    code = randomPart
      .split("")
      .map((char) =>
        Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase()
      )
      .join("");

    attempts++;
    if (attempts > maxAttempts) {
      throw new Error(
        "Failed to generate a unique code after several attempts."
      );
    }
  } while (await isCodeExist(code, db));

  return code;
}

module.exports = {
  generateUniqueCode,
};
