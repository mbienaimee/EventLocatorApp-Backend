const { redisSubscriber } = require("../config/redis");
const { User } = require("../models");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "m.bienaimee@alustudent.com",
    pass: "gztl afyt qico geqp",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

redisSubscriber.on("connect", () => {
  console.log("Redis subscriber connected event fired");
  redisSubscriber.subscribe("event_notifications");
});

redisSubscriber.on("message", async (channel, message) => {
  console.log(`Raw message received from ${channel}:`, message);
  if (!message) {
    console.log("Received null message, skipping.");
    return;
  }

  try {
    const event = JSON.parse(message);
    console.log("Parsed event:", event);

    const eventDateTime = new Date(event.date_time);
    const now = new Date();
    const timeDiffHours = (eventDateTime - now) / (1000 * 60 * 60);
    console.log(`Time difference: ${timeDiffHours.toFixed(2)} hours`);

    console.log("Processing notification for email delivery");

    const users = await User.findAll({
      where: {
        preferences: { [Op.overlap]: event.preferences },
      },
    });
    console.log(
      "Found users:",
      users.map((u) => ({
        id: u.id,
        email: u.email,
        preferences: u.preferences,
      }))
    );

    if (users.length === 0) {
      console.log("No users with matching preferences found.");
      return;
    }

    const radius = 50000; // 50km for testing
    const nearbyUsers = await Promise.all(
      users.map(async (user) => {
        const query = `
          SELECT COUNT(*) > 0 AS is_nearby
          FROM "Users"
          WHERE id = ${user.id}
          AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${event.location.coordinates[0]}, ${event.location.coordinates[1]}), 4326),
            ${radius}
          );
        `;
        const [results] = await User.sequelize.query(query);
        console.log(
          `User ${user.email} is nearby (within ${radius}m): ${results[0].is_nearby}`
        );
        return results[0].is_nearby ? user : null;
      })
    ).then((results) => results.filter((u) => u !== null));

    if (nearbyUsers.length === 0) {
      console.log("No nearby users found within 50km.");
      return;
    }

    const formattedDateTime = eventDateTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      timeZoneName: "short",
    });

    const locationString =
      event.location.formattedAddress ||
      `${event.location.coordinates[0]}, ${event.location.coordinates[1]}`;

    await Promise.all(
      nearbyUsers.map((user) => {
        const subject = `Event Alert: ${event.title}`;
        const text = `Hello ${
          user.email.split("@")[0]
        },\n\nThe Event locator brings you news of an exciting event!\n\nEvent: ${
          event.title
        }\nDescription: ${
          event.description
        }\nLocation: ${locationString}\nWhen: ${formattedDateTime}\n\nEnjoy the event!\n\nBest regards,\nThe Event Locator Team`;
        const html = `
          <h2>Event locator Alert</h2>
          <p>Hello ${user.email.split("@")[0]},</p>
          <p>The Event locator brings you news of an exciting event!</p>
          <ul>
            <li><strong>Event:</strong> ${event.title}</li>
            <li><strong>Description:</strong> ${event.description}</li>
            <li><strong>Location:</strong> ${locationString}</li>
            <li><strong>When:</strong> ${formattedDateTime}</li>
          </ul>
          <p>Enjoy the event!</p>
          <p>Best regards,<br>The Event Locator Team</p>
        `;

        return transporter
          .sendMail({
            from: `"Event Locator" <m.bienaimee@alustudent.com>`,
            to: user.email,
            subject: subject,
            text: text,
            html: html,
          })
          .then((info) => {
            console.log(`Email sent to ${user.email}: ${info.messageId}`);
          })
          .catch((err) => {
            console.error(
              `Failed to send email to ${user.email}:`,
              err.message
            );
          });
      })
    );
  } catch (err) {
    console.error("Notification processing error:", err.message);
  }
});

redisSubscriber.on("subscribe", (channel, count) => {
  console.log(`Subscribed to ${channel} with ${count} subscribers`);
});

redisSubscriber.on("error", (err) => {
  console.error("Redis subscriber error:", err.message);
});

redisSubscriber.on("end", () => {
  console.log("Redis subscriber connection ended");
});

redisSubscriber.on("reconnecting", () => {
  console.log("Redis subscriber reconnecting");
});
