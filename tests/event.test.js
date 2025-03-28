// tests/event.test.js
const request = require("supertest");
const app = require("../app");

describe("Event API", () => {
  let token, eventId;

  beforeAll(async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "event@example.com",
        password: "password123",
        location: { lat: 40.7128, lng: -74.006 },
        preferences: ["music"],
      });
    const res = await request(app).post("/auth/login").send({
      email: "event@example.com",
      password: "password123",
    });
    token = res.body.token;
  });

  it("should create an event", async () => {
    const res = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Event",
        description: "A test event",
        location: { lat: 40.7128, lng: -74.006 },
        date_time: "2025-04-01T12:00:00Z",
        categories: ["music"],
      });
    eventId = res.body.event.id;
    expect(res.statusCode).toBe(201);
    expect(res.body.event.title).toBe("Test Event");
  });

  it("should get all events", async () => {
    const res = await request(app).get("/events");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get event by ID", async () => {
    const res = await request(app).get(`/events/${eventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(eventId);
  });

  it("should update an event", async () => {
    const res = await request(app)
      .put(`/events/${eventId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Updated Event",
        description: "Updated",
        location: { lat: 40.7128, lng: -74.006 },
        date_time: "2025-04-01T12:00:00Z",
        categories: ["music"],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.event.title).toBe("Updated Event");
  });

  it("should search events", async () => {
    const res = await request(app).get(
      "/events/search?radius=1000&lat=40.7128&lng=-74.0060&categories=music"
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should rate an event", async () => {
    const res = await request(app)
      .post(`/events/${eventId}/rate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 4, review: "Great event!" });
    expect(res.statusCode).toBe(200);
    expect(res.body.rating.rating).toBe(4);
  });

  it("should favorite an event", async () => {
    const res = await request(app)
      .post(`/events/${eventId}/favorite`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  it("should get favorite events", async () => {
    const res = await request(app)
      .get("/events/favorites")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should delete an event", async () => {
    const res = await request(app)
      .delete(`/events/${eventId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
});
