export const dynamic='force-dynamic';
export async function GET(){return Response.json({now:Date.now(),timeZone:'America/Port-au-Prince'},{headers:{'Cache-Control':'no-store, max-age=0'}})}
