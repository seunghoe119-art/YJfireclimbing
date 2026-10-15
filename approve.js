'use strict';
(async()=>{
  const $=id=>document.getElementById(id), status=$('approvalStatus'), button=$('approveButton'), consent=$('approvalConsent');
  const params=new URLSearchParams(location.search), id=params.get('id'), token=params.get('token');
  const config=window.APP_CONFIG||{};
  const validId=/^[0-9a-f-]{36}$/i.test(id||'')&&/^[0-9a-f]{64}$/i.test(token||'');
  if(!validId){status.textContent='승인 링크가 올바르지 않거나 만료되었습니다.';return;}
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl||'')||!config.supabaseAnonKey){status.textContent='승인 서버 설정을 확인할 수 없습니다.';return;}
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    const client=createClient(config.supabaseUrl,config.supabaseAnonKey);
    const {data,error}=await client.from('temporary_reports').select('id,latitude,longitude,accuracy_m,submitted_at,expires_at,approved_at').eq('id',id).maybeSingle();
    if(error||!data){status.textContent='접수 위치가 이미 만료되었거나 승인 링크를 확인할 수 없습니다.';return;}\n    if(data.approved_at){status.textContent='이 지점은 이미 영구 등록되었습니다.';return;}\n    if(Number.isFinite(new Date(data.expires_at).getTime())&&new Date(data.expires_at)<new Date()){status.textContent='접수 위치가 이미 만료되었거나 승인 링크를 확인할 수 없습니다.';return;}
    $('approvalCoordinates').textContent=data.latitude.toFixed(5)+', '+data.longitude.toFixed(5)+' · GPS 오차 약 '+data.accuracy_m+'m';
    $('approvalMapLink').href='https://www.google.com/maps?q='+data.latitude+','+data.longitude;
    $('approvalSubmitted').textContent=new Date(data.submitted_at).toLocaleString('ko-KR');
    $('approvalDetails').hidden=false;$('approvalConsentWrap').hidden=false;button.hidden=false;
    status.textContent='위치 정보를 확인했습니다. 영구 등록하려면 아래 확인란을 선택하고 승인 버튼을 누르세요.';
    consent.addEventListener('change',()=>button.disabled=!consent.checked);
    button.addEventListener('click',async()=>{
      if(!consent.checked)return;
      button.disabled=true;status.textContent='영구 등록 중…';
      const result=await client.rpc('approve_temporary_report',{p_id:id,p_token:token});
      if(result.error||result.data!==true){status.textContent='승인되지 않았습니다. 링크가 만료되었거나 이미 사용되었습니다.';button.disabled=false;return;}
      status.textContent='영구 등록되었습니다. 지도에서 빨간 점으로 확인할 수 있습니다.';
      $('approvalConsentWrap').hidden=true;button.hidden=true;
      history.replaceState(null,'',location.pathname);
    });
  }catch(error){console.error('approval failed',error);status.textContent='승인 정보를 불러오지 못했습니다. 네트워크를 확인해 주세요.';}
})();