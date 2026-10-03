const { Redis } = require("@upstash/redis");
const webpush = require("web-push");

module.exports = async function (req, res) {
  try {
    const expected = process.env.STUDYOS_CRON_SECRET;
    if (expected && req.headers.authorization !== `Bearer ${expected}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const redis = Redis.fromEnv();
    const sub = await redis.get("studyos:subscription");
    if (!sub) return res.status(200).json({ ok: true, sent: 0 });

    const reminders = (await redis.get("studyos:reminders")) || [];
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour").value);
    const minute = Number(parts.find((p) => p.type === "minute").value);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const nowMinutes = hour * 60 + minute;

    webpush.setVapidDetails(
      "mailto:" + process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    let sent = 0;

    for (const reminder of reminders) {
      if (!reminder.enabled || !/^\d{2}:\d{2}$/.test(reminder.time)) continue;

      const [rh, rm] = reminder.time.split(":").map(Number);
      const scheduledMinutes = rh * 60 + rm;
      const elapsed = nowMinutes - scheduledMinutes;

      if (elapsed < 0 || elapsed > 15) continue;

      const sentKey = `studyos:sent:${today}:${reminder.id}`;
      if (await redis.get(sentKey)) continue;

      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "StudyOS ✦",
          body: reminder.message || "Your next study block is waiting.",
          url: "/",
        })
      );

      await redis.set(sentKey, "1", { ex: 172800 });
      sent++;
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
