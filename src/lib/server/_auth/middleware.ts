import { redirect } from '@sveltejs/kit';
import { getServerSupabase, getServiceClient } from '$lib/supabase/server';
import { roleRoutes, isRole, type Role } from '$lib/auth';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
  COOKIE_USER_TTL_SECONDS, COOKIE_USER_NAME, COOKIE_ROLE_NAME,
  ROUTE_LOGIN, PUBLIC_ROUTES, CONTENT_SECURITY_POLICY, TENANT_ID,
} from '$lib/config';
import { HealthChecker } from '$lib/health';
import { metricsCollector } from '$lib/monitoring';

const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL ?? '';
const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const REQUIRED_ENV_VARS = [[PUBLIC_SUPABASE_URL,'PUBLIC_SUPABASE_URL','Supabase project URL'],[PUBLIC_SUPABASE_ANON_KEY,'PUBLIC_SUPABASE_ANON_KEY','Supabase anonymous key'],[SUPABASE_SERVICE_ROLE_KEY,'SUPABASE_SERVICE_ROLE_KEY','Supabase service role key (bypasses RLS)']] as const;
const ROLE_CACHE_TTL_MS=120_000;
const roleCache=new Map<string,{rows:Role[];ts:number}>();
export function invalidateRoleCache(userId:string){roleCache.delete(userId)}
export function validateEnv(){for(const [value,key,label] of REQUIRED_ENV_VARS)if(!value)throw new Error(`Missing ${key} (${label}). Check your .env file.`)}
export async function healthCheck(event: Parameters<Handle>[0]['event']): Promise<Response|null>{const {pathname}=event.url;if(pathname==='/api/health'||pathname==='/api/health/quick'){const h=new HealthChecker(event.locals.srv);try{const healthResult=pathname.endsWith('/quick')?await h.runQuickHealthCheck():await h.runFullHealthCheck();return new Response(JSON.stringify(healthResult,null,2),{status:healthResult.status==='healthy'?200:healthResult.status==='degraded'?206:503,headers:{'Content-Type':'application/json','X-Health-Status':healthResult.status,'Cache-Control':'no-cache, no-store, must-revalidate'}})}catch(error){return new Response(JSON.stringify({error:'Health check failed',details:error instanceof Error?error.message:'Unknown error'}),{status:503,headers:{'Content-Type':'application/json'}})}}return null}
export function initClients(event: Parameters<Handle>[0]['event']):void{event.locals.supabase=getServerSupabase(event.cookies);event.locals.srv=getServiceClient();event.locals.adminSrv=event.locals.srv;event.locals.session=null;event.locals.user=null;event.locals.role=null;event.locals.roles=null;event.locals.tenantId=TENANT_ID}
export async function resolveSession(event: Parameters<Handle>[0]['event']):Promise<void>{let user=null;try{const {data:{user:u},error}=await event.locals.supabase.auth.getUser();if(!error&&u)user=u}catch{user=null}if(!user){event.locals.user=null;event.cookies.delete(COOKIE_USER_NAME,{path:'/'});event.cookies.delete(COOKIE_ROLE_NAME,{path:'/'});return}event.locals.user=user;event.cookies.set(COOKIE_USER_NAME,JSON.stringify({name:user.user_metadata?.full_name??user.email??'User',email:user.email??''}),{maxAge:COOKIE_USER_TTL_SECONDS,path:'/',httpOnly:true,secure:true,sameSite:'lax'});const cookieRole=event.cookies.get(COOKIE_ROLE_NAME);const cached=roleCache.get(user.id);let rows:Role[];if(cached&&Date.now()-cached.ts<ROLE_CACHE_TTL_MS)rows=cached.rows;else{const {data:roleRows}=await event.locals.supabase.from('user_roles').select('role').eq('user_id',user.id).order('created_at',{ascending:true});rows=(roleRows??[]).map((r:{role:string})=>r.role).filter((r):r is Role=>isRole(r));roleCache.set(user.id,{rows,ts:Date.now()})}event.locals.roles=rows;event.locals.role=cookieRole&&rows.includes(cookieRole as Role)?cookieRole as Role:rows[0]??null}
export function correlationId(event: Parameters<Handle>[0]['event']):void{const id=crypto.randomUUID();event.locals.requestId=id;event.setHeaders({'X-Request-Id':id})}
export function securityHeaders(event: Parameters<Handle>[0]['event']):void{const headers:Record<string,string>={'X-Content-Type-Options':'nosniff','Strict-Transport-Security':'max-age=31536000; includeSubDomains','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':CONTENT_SECURITY_POLICY,'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Cross-Origin-Opener-Policy':'same-origin'};const {pathname}=event.url;if(['/admin','/teacher','/parent','/principal','/bursar'].some(p=>pathname.startsWith(p)))headers['Cache-Control']='private, max-age=30, stale-while-revalidate=60';event.setHeaders(headers)}
export function routeGuard(event: Parameters<Handle>[0]['event']):void{const {pathname}=event.url;const {user,role}=event.locals;if(pathname==='/'||pathname===ROUTE_LOGIN){if(user&&role)redirect(303,pathname==='/'?roleRoutes[role]:'/');return}if(!user||!role)redirect(303,ROUTE_LOGIN);if(PUBLIC_ROUTES.some(p=>pathname===p||pathname.startsWith(p+'/')))return;if('/'+pathname.split('/')[1]!==roleRoutes[role])redirect(303,roleRoutes[role])}
