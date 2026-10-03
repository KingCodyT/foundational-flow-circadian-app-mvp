import type { NextApiRequest, NextApiResponse } from "next";
import { planMealNotifications } from "@/lib/personalization/meal-notifications";
import { redisCommand, getServerPushSchedule } from "@/lib/personalization/server-push-store";
import { scheduleReminder, withPushLock, saveLifecycle, activeKey, reminderAction } from "@/lib/personalization/push-lifecycle";
import { missingPushConfiguration, pushFailure } from "@/lib/personalization/push-configuration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["POST", "DELETE"].includes(req.method || "")) return res.status(405).end();
  const {clientId, profile} = req.body || {};
  if (typeof clientId !== "string" || clientId.length < 8 || clientId.length > 200) return res.status(400).json({error:"invalid_client_id"});
  if (missingPushConfiguration(req.method === "DELETE").length) return res.status(503).json(pushFailure(null, req.method === "DELETE"));
  try {
    if (req.method === "POST" && ["skip","later"].includes(req.body.action)) {
      const {dateKey,action,remindAt}=req.body;
      if(typeof dateKey!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey))return res.status(400).json({error:"invalid_date"});
      const id=await redisCommand<string|null>(["GET",activeKey(clientId,"meal_suggestion",dateKey)]);
      const record=id?await getServerPushSchedule(clientId,id):null;
      if(record)await reminderAction(clientId,record.notificationId,record.actionToken,action,remindAt);
      return res.status(200).json({ok:true});
    }
    const notifications = req.method === "DELETE" ? [] : planMealNotifications(profile, new Date());
    const result = await withPushLock(`${clientId}:meal-config`, async () => {
      const key = `ff:push:meal-list:${clientId}`;
      const prior = JSON.parse(await redisCommand<string|null>(["GET",key]) || "[]") as string[];
      const ids = notifications.map(n=>n.id);
      // Keep failed batches discoverable so retry/off can cancel every accepted job.
      await redisCommand(["SET",key,JSON.stringify([...new Set([...prior,...ids])]),"EX",864000]);
      for (const id of prior.filter(id=>!ids.includes(id))) await withPushLock(clientId, async()=>{
        const old = await getServerPushSchedule(clientId,id);
        if (old && old.notification.eventId === "meal_suggestion") {old.state="suppressed";old.reason="Meal notification preference or schedule changed";await saveLifecycle(old);}
      });
      for (const notification of notifications) await scheduleReminder(clientId,notification);
      await redisCommand(["SET",key,JSON.stringify(ids),"EX",864000]);
      return {scheduled:notifications.length, through:notifications.at(-1)?.scheduledFor || null};
    });
    if(req.method === "POST" && !notifications.length)return res.status(400).json({error:"No valid meal schedule. Previous meal reminders were cancelled."});
    res.setHeader("Cache-Control","no-store");return res.status(200).json(result);
  } catch(error) {return res.status(503).json(pushFailure(error));}
}
