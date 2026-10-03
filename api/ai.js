export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const apiKey=process.env.OPENAI_API_KEY||process.env.GROQ_API_KEY;
  if(!apiKey)return res.status(503).json({error:"Planner AI is not configured. Add OPENAI_API_KEY to the server environment."});

  const body=req.body||{};
  const message=typeof body.message==="string"?body.message.slice(0,4000):"";
  const context=body.context||{};
  const attachment=body.attachment||null;

  let baseURL=process.env.OPENAI_BASE_URL||"https://api.groq.com/openai/v1";
  baseURL=baseURL.replace(/\/$/,"");
  if(baseURL==="https://groq.com"||baseURL==="https://api.groq.com"){
    baseURL="https://api.groq.com/openai/v1";
  }else if(baseURL==="https://api.groq.com/openai"){
    baseURL="https://api.groq.com/openai/v1";
  }

  let model=process.env.AI_MODEL||process.env.STUDYOS_AI_MODEL||"openai/gpt-oss-20b";
  if(model==="llama-3.3-70b-versatile")model="openai/gpt-oss-20b";
  if(attachment&&attachment.type==="image")model="qwen/qwen3.8-27b";

  const system=`You are StudyOS, an action-taking student scheduling assistant. You are not a generic chatbot. Your job is to change the user's planner state when they ask.

Current state:
${JSON.stringify(context)}

Rules:
- Return ONLY valid JSON.
- Reply must be short and concrete.
- If the user gives a deadline, add or update a deadline action.
- If the user gives available study hours, add availability actions. day uses 0=Sunday through 6=Saturday.
- If the user says they are on vacation, travelling, unavailable, or cannot study on dates, add set_vacation actions.
- If the user changes a previous fact, use remove_deadline, remove_availability, remove_activity, or remove_extra before adding the corrected fact when needed.
- Never invent a schedule, deadline, free time, exam date, or required study duration that the user did not provide.
- If a schedule image is attached, extract classes, tuition, activities, and explicit free/study windows. Treat fixed commitments as unavailable and only create study availability when the image or user's text clearly indicates free/study time.
- If the user mentions a fixed appointment, class, tuition session, meeting, family commitment, trip event, or other one-off commitment, use add_activity. Use scope=school, tuition, class, personal, or other. with {title,date,start,end,location}. These are protected from study scheduling.
- If the user mentions a recurring club, sport, robotics session, music class, competition practice, or other weekly commitment, use add_extra. Use scope=club, sport, robotics, competition, or other. with {title,day,start,end,note}. day uses 0=Sunday through 6=Saturday. These are protected from study scheduling.
- If the user asks to remove or cancel an activity or recurring commitment, use remove_activity or remove_extra with a distinctive match.
- If the user asks to "plan", "replan", "move", "change", "remove", or "cancel", make the state-changing actions needed. The client will regenerate the plan after applying them.
- For a vacation, do not add individual fake study blocks. Use a protected date range.
- Use ISO dates YYYY-MM-DD. Today is ${new Date().toISOString().slice(0,10)}.
- Actions allowed: add_deadline {subject,title,due,minutes,priority}, remove_deadline {match}, set_availability {day,start,end}, remove_availability {day}, add_activity {title,scope,date,start,end,location}, remove_activity {match}, add_extra {title,scope,day,start,end,note}, remove_extra {match}, set_vacation {start,end}, clear_vacations {}, clear_plan {}, add_exam {subject,date,syllabusHours,pyqCount,pyqMinutes,sampleCount,sampleMinutes,errorMinutes,finalDays,finalMinutes}, remove_exam {match}.
- For an exam, understand the user's requested PYQ count, sample-paper count, and final-revision time. Do not invent those quantities when the user has explicitly specified them.
JSON shape:
{"reply":"string","actions":[{"type":"..."}]}`;

  let content;
  if(attachment&&attachment.type==="image"){
    content=[
      {type:"text",text:message||"Read this schedule and update my StudyOS planner from it."},
      {type:"image_url",image_url:{url:attachment.data}}
    ];
  }else{
    content=message+(attachment&&attachment.data?"\n\nUploaded schedule text:\n"+String(attachment.data).slice(0,50000):"");
  }

  try{
    const r=await fetch(baseURL+"/chat/completions",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer "+apiKey
      },
      body:JSON.stringify({
        model,
        messages:[{role:"system",content:system},{role:"user",content}],
        temperature:.1,
        max_completion_tokens:1800,
        response_format:{type:"json_object"}
      })
    });

    const data=await r.json();
    if(!r.ok)return res.status(502).json({error:"Planner AI provider error"});

    let parsed;
    try{
      parsed=JSON.parse(data.choices?.[0]?.message?.content||"{}");
    }catch(e){
      return res.status(502).json({error:"Planner AI returned invalid data"});
    }

    if(!Array.isArray(parsed.actions))parsed.actions=[];
    return res.status(200).json({
      reply:String(parsed.reply||"I updated the planner.").slice(0,1000),
      actions:parsed.actions.slice(0,20)
    });
  }catch(e){
    return res.status(500).json({error:"Planner AI request failed"});
  }
}
