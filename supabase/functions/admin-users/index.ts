import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST,DELETE,OPTIONS'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})

Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
  try{
    const auth=req.headers.get('Authorization')
    if(!auth) return json({error:'Unauthorized'},401)
    const url=Deno.env.get('SUPABASE_URL')!
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}})
    const {data:{user},error:ue}=await userClient.auth.getUser()
    if(ue||!user) return json({error:'Unauthorized'},401)
    const adminClient=createClient(url,service)
    const {data:actor}=await adminClient.from('profiles').select('id,active,permissions').eq('id',user.id).single()
    if(!actor?.active || actor.permissions?.manage_admins!==true) return json({error:'دسترسی مدیریت مدیران ندارید.'},403)

    if(req.method==='POST'){
      const body=await req.json()
      const username=String(body.username||'').trim().toLowerCase()
      const display_name=String(body.display_name||'').trim()
      const password=String(body.password||'')
      const permissions=body.permissions||{}
      const id=body.id||null
      if(!/^[a-z0-9._-]{3,32}$/.test(username)) return json({error:'نام کاربری باید ۳ تا ۳۲ کاراکتر و فقط شامل حروف انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.'},400)
      if(!id && password.length<8) return json({error:'رمز عبور حداقل ۸ کاراکتر باشد.'},400)
      if(id){
        const update:any={user_metadata:{username,display_name}}
        if(password) update.password=password
        const {error}=await adminClient.auth.admin.updateUserById(id,update)
        if(error) return json({error:error.message},400)
        const {error:pe}=await adminClient.from('profiles').update({username,display_name,permissions}).eq('id',id)
        if(pe) return json({error:pe.message},400)
        return json({ok:true})
      }
      const login_email=`${username}@internal.pc-inventory.local`
      const {data:created,error}=await adminClient.auth.admin.createUser({email:login_email,password,email_confirm:true,user_metadata:{username,display_name}})
      if(error||!created.user) return json({error:error?.message||'ساخت کاربر ناموفق بود.'},400)
      const {error:pe}=await adminClient.from('profiles').insert({id:created.user.id,username,display_name,login_email,permissions,active:true})
      if(pe){await adminClient.auth.admin.deleteUser(created.user.id);return json({error:pe.message},400)}
      return json({ok:true,id:created.user.id})
    }

    if(req.method==='DELETE'){
      const {id}=await req.json()
      if(!id||id===user.id) return json({error:'این حساب قابل حذف نیست.'},400)
      const {error}=await adminClient.auth.admin.deleteUser(id)
      if(error) return json({error:error.message},400)
      return json({ok:true})
    }
    return json({error:'Method not allowed'},405)
  }catch(e){return json({error:e instanceof Error?e.message:'Server error'},500)}
})
