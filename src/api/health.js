import{response}from"../lib/neis.js";
export function handleHealth(env){return response({ok:true,service:"YGMhelper",neisConfigured:Boolean(env?.NEIS_API_KEY)})}