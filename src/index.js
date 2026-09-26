import{handleHealth}from"./api/health.js";
import{handleMeal}from"./api/meal.js";
import{handleTimetable}from"./api/timetable.js";

const SECURITY_HEADERS={
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"strict-origin-when-cross-origin",
  "Permissions-Policy":"geolocation=(), microphone=(), camera=()"
};

function withHeaders(res){const headers=new Headers(res.headers);Object.entries(SECURITY_HEADERS).forEach(([key,value])=>headers.set(key,value));return new Response(res.body,{status:res.status,statusText:res.statusText,headers})}

export default{async fetch(request,env,ctx){const url=new URL(request.url);let response;
  if(url.pathname==="/api/health")response=handleHealth(env);
  else if(url.pathname==="/api/meal")response=await handleMeal(request,env);
  else if(url.pathname==="/api/timetable")response=await handleTimetable(request,env);
  else if(url.pathname.startsWith("/api/"))response=new Response(JSON.stringify({ok:false,message:"Not found."}),{status:404,headers:{"Content-Type":"application/json; charset=UTF-8"}});
  else response=await env.ASSETS.fetch(request);
  return withHeaders(response);
}};