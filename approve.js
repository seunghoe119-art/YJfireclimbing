'use strict';
(async () => {
  const $ = id => document.getElementById(id);
  const status = $('approvalStatus'), button = $('approveButton'), consent = $('approvalConsent');
  const id = new URLSearchParams(location.search).get('id');
  const config = window.APP_CONFIG || {};
  const adminEmail = 'sj240324@outlook.kr';
  let busy = false;
  const say = text => { status.textContent = text; };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
    say('접수 메일에 있는 영구 등록 승인 링크로 접속해 주세요.'); return;
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') || !config.supabaseAnonKey) {
    say('승인 서버 설정을 확인할 수 없습니다.'); return;
  }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    // The email scanner's GET request only displays this page; approval requires an authenticated POST.
    const result = await client.from('temporary_reports')
      .select('id,latitude,longitude,accuracy_m,submitted_at,expires_at,approved_at').eq('id', id).maybeSingle();
    if (result.error) { say('승인 기능 설정을 확인할 수 없습니다. 담당자에게 문의해 주세요.'); return; }
    const point = result.data;
    if (!point) { say('임시 위치가 만료되었거나 취소되었습니다.'); return; }
    $('approvalCoordinates').textContent = point.latitude.toFixed(5) + ', ' + point.longitude.toFixed(5) + ' · GPS 오차 약 ' + point.accuracy_m + 'm';
    $('approvalMapLink').href = 'https://www.google.com/maps?q=' + point.latitude + ',' + point.longitude;
    $('approvalSubmitted').textContent = new Date(point.submitted_at).toLocaleString('ko-KR');
    $('approvalDetails').hidden = false;
    if (point.approved_at) { say('이미 영구 등록된 지점입니다. 지도에서 빨간 점으로 확인할 수 있습니다.'); return; }
    const expiry = new Date(point.expires_at).getTime();
    if (!Number.isFinite(expiry) || expiry <= Date.now()) { say('임시 위치의 승인 기간이 만료되었습니다.'); return; }
    const sessionResult = await client.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const session = sessionResult.data.session;
    if (!session) {
      $('approvalLogin').hidden = false;
      say('담당자 계정 확인이 필요합니다. 로그인 메일을 받아 한 번 로그인하면 이 기기에서 계속 승인할 수 있습니다.');
      $('approvalLoginButton').addEventListener('click', async () => {
        const loginButton = $('approvalLoginButton');
        if (busy) return;
        busy = true; loginButton.disabled = true;
        say('담당자에게 로그인 링크를 보내고 있습니다…');
        try {
          const redirect = new URL('approve.html', location.href);
          redirect.searchParams.set('id', id);
          const authResult = await client.auth.signInWithOtp({
            email: adminEmail,
            options: { emailRedirectTo: redirect.href, shouldCreateUser: true }
          });
          if (authResult.error) throw authResult.error;
          say('담당자 메일로 로그인 링크를 보냈습니다. 메일의 링크를 열면 이 지점 승인 화면으로 돌아옵니다.');
        } catch (error) {
          console.error('approval login failed', error);
          say('로그인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally { busy = false; loginButton.disabled = false; }
      });
      return;
    }
    if ((session.user.email || '').toLowerCase() !== adminEmail) {
      say('이 계정에는 등록 승인 권한이 없습니다. 담당자 이메일 계정으로 로그인해 주세요.');
      $('approvalLogout').hidden = false;
      $('approvalLogout').addEventListener('click', async () => { await client.auth.signOut(); location.reload(); });
      return;
    }
    $('approvalConsentWrap').hidden = false; button.hidden = false;
    say('담당자 계정을 확인했습니다. 위치를 확인한 뒤 영구 등록을 승인해 주세요.');
    consent.addEventListener('change', () => { button.disabled = busy || !consent.checked; });
    button.addEventListener('click', async () => {
      if (busy || !consent.checked) return;
      busy = true; button.disabled = true; say('영구 등록 중…');
      try {
        const approved = await client.rpc('approve_temporary_report', { p_id: id });
        if (approved.error) throw approved.error;
        if (approved.data !== true) { say('이미 승인되었거나 임시 위치가 만료·취소되었습니다.'); return; }
        say('영구 등록했습니다. 지도에서 빨간 점으로 확인할 수 있습니다.');
        $('approvalConsentWrap').hidden = true; button.hidden = true;
      } catch (error) {
        console.error('approval failed', error);
        say('승인하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
      } finally { busy = false; button.disabled = !consent.checked; }
    });
  } catch (error) {
    console.error('approval setup failed', error);
    say('승인 정보를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
  }
})();
