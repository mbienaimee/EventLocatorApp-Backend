const request = require("supertest");
const app = require("../app");
const { sequelize } = require("../models");

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests
});

afterAll(async () => {
  await sequelize.close(); // Close database connection after tests
});

describe("Auth API", () => {
  beforeEach(async () => {
    await sequelize.truncate({ cascade: true }); // Clean database between tests
  });

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "password123",
        location: "New York, NY", // Changed to match controller expectation
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
        location: "New York, NY",
        preferences: ["sports"],
      });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "password123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should fail login with wrong password", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "login@example.com",
        password: "password123",
        location: "New York, NY",
        preferences: ["sports"],
      });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error", "Invalid credentials");
  });
});
