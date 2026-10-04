export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.status(200).json({
    publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||"",
    googleClientId:process.env.GOOGLE_CLIENT_ID||""
  });
}