export default async function handler(req,res){
  res.status(200).json({
    publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||"",
    googleClientId:process.env.GOOGLE_CLIENT_ID||""
  });
}