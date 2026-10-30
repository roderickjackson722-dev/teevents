import { createServerFn } from '@tanstack/react-start';
import { partnerRequestSchema, partnerTeamSizes, validatePartnerAnswers } from './partnerRequests.schema';
export const submitPartnerRequest = createServerFn({method: 'POST'})
  .inputValidator((input: unknown) => partnerRequestSchema.parse(input))
  .handler(async ({data}) => {
    const secret = process.env['HCAPTCHA_SECRET_KEY'];
    const key = process.env['RESEND_API_KEY'];
    if (!secret || !key) throw new Error('Partner requests are temporarily unavailable. Please contact the organizer.');
    const verification = await fetch('https://api.hcaptcha.com/siteverify', {method:'POST', body:new URLSearchParams({secret,response:data.captchaToken}), signal:AbortSignal.timeout(15000)});
    const verified = await verification.json() as {success?: boolean};
    if (!verification.ok || !verified.success) throw new Error('Please complete CAPTCHA again.');
    const {supabaseAdmin: admin} = await import('@/integrations/supabase/client.server');
    const [{data: event}, {data: settings}, {data: fields, error: fieldError}] = await Promise.all([
      admin.from('tournaments').select('id,title,organization_id,registration_open,site_published,max_group_size,allowed_group_sizes,registration_auto_close_enabled,registration_close_at').eq('id',data.tournamentId).single(),
      admin.from('tournament_partner_settings').select('enabled').eq('tournament_id',data.tournamentId).maybeSingle(),
      admin.from('tournament_registration_fields').select('id,label,is_required,field_type,options').eq('tournament_id',data.tournamentId).eq('is_enabled',true),
    ]);
    if (!event?.site_published || !event.registration_open || !settings?.enabled || (event.registration_auto_close_enabled && event.registration_close_at && Date.parse(event.registration_close_at) <= Date.now())) throw new Error('Partner requests are not open for this event.');
    if (!partnerTeamSizes(event.max_group_size || 1, event.allowed_group_sizes as number[] | null).includes(data.teamSize)) throw new Error('Choose an allowed team size.');
    if (fieldError) throw new Error('Could not load player questions.');
    validatePartnerAnswers(fields || [], data.answers, data.phone);
    const {data: owners, error: ownerError} = await admin.from('org_members').select('user_id').eq('organization_id',event.organization_id).eq('role','owner');
    if (ownerError || owners?.length !== 1 || !owners[0]) throw new Error('Organizer notification recipient is unavailable.');
    const {data: owner} = await admin.auth.admin.getUserById(owners[0].user_id);
    const recipient = owner.user?.email;
    if (!recipient || !owner.user?.email_confirmed_at) throw new Error('Organizer notification recipient is unavailable.');
    const answers = Object.fromEntries((fields || []).map(f => [f.label, f.label.toLowerCase() === 'phone' ? data.phone : data.answers[f.id] || '']));
    const {data: request, error} = await admin.from('tournament_partner_requests').insert({tournament_id:data.tournamentId,first_name:data.firstName,last_name:data.lastName,email:data.email.toLowerCase(),phone:data.phone,team_size:data.teamSize,partners_needed:data.partnersNeeded,custom_answers:answers,message:data.message}).select('id').single();
    if (error || !request) throw new Error(error?.code === '23505' ? 'You already have an open partner request for this event. Contact the organizer to update it.' : 'Your request could not be saved. Please try again.');
    let notified = false;
    try {
      const response = await fetch('https://api.resend.com/emails', {method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`partner-${request.id}`},body:JSON.stringify({from:'TeeVents Golf Management <info@notifications.teevents.golf>',to:[recipient],reply_to:data.email,subject:`Partner request: ${event.title}`,text:[`${data.firstName} ${data.lastName} is looking for ${data.partnersNeeded} partner(s) for a team of ${data.teamSize}.`, `Event: ${event.title}`,`Email: ${data.email}`,`Phone: ${data.phone || 'Not provided'}`,...Object.entries(answers).map(([k,v])=>`${k}: ${v}`),`Message: ${data.message}`, '', 'This is a partner request only. No payment, roster entry or place reservation has been made.',`Review in Players or Registration Management for this event: https://www.teevents.golf/dashboard/players?tournament_id=${event.id}`].join('\n')}),signal:AbortSignal.timeout(15000)});
      notified = response.ok;
      if (!response.ok) console.error('Partner notification failed', response.status, await response.text());
    } catch { console.error('Partner notification unavailable'); }
    await admin.from('tournament_partner_requests').update({notification_status:notified ? 'sent':'failed'}).eq('id',request.id);
    return {received:true, notified};
  });
