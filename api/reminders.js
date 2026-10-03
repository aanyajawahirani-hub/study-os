const {Redis}=require("@upstash/redis");
module.exports=async function(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const redis=Redis.fromEnv();
    const times=(req.body&&req.body.times)||[];
    const labels=(req.body&&req.body.labels)||[];
    const reminders=[];
    times.slice(0,10).forEach(function(time,i){
      if(!/^\d{2}:\d{2}$/.test(time))return;
      reminders.push({id:"start-"+i,time,enabled:true,message:(labels[i]||"Your next study block")+" is ready. Open StudyOS and start now."});
      const [h,m]=time.split(":").map(Number);
      const check=(h*60+m+10)%(24*60);
      reminders.push({id:"check-"+i,time:String(Math.floor(check/60)).padStart(2,"0")+":"+String(check%60).padStart(2,"0"),enabled:true,message:"Did you start yet? Open StudyOS and check in. Your study block is waiting."});
    });
    await redis.set("studyos:reminders",reminders);
    return res.status(200).json({ok:true,count:reminders.length});
  }catch(e){return res.status(503).json({error:"Reminder storage is not configured yet"})}
};