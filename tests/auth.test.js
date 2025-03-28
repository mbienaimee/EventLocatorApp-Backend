// tests/auth.test.js
const request = require("supertest");
const app = require("../app");

describe("Auth API", () => {
  it("should register a new user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "password123",
        location: { lat: 40.7128, lng: -74.006 },
        preferences: ["music"],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("email", "test@example.com");
  });

  it("should login a user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "login@example.com",
        password: "password123",
        location: { lat: 40.7128, lng: -74.006 },
        preferences: ["sports"],
      });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "password123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should fail login with wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });
});
