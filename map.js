'use strict';
(async () => {
  const status = document.getElementById('mapStatus');
  if (!window.L) { status.textContent = '지도를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.'; return; }
  const offices = [
  {
    "name": "영종소방서",
    "address": "인천 영종구 제2터미널대로 268",
    "latitude": 37.4868652,
    "longitude": 126.4155086,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050100"
  },
  {
    "name": "북도119지역대",
    "address": "인천 옹진군 북도면 신도로 164",
    "latitude": 37.5230695,
    "longitude": 126.4337603,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050200"
  },
  {
    "name": "장봉119지역대",
    "address": "인천 옹진군 북도면 장봉로 566",
    "latitude": 37.5346423,
    "longitude": 126.3369198,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050300"
  },
  {
    "name": "운서119안전센터",
    "address": "인천 영종구 흰바위로27번길 16",
    "latitude": 37.4937194,
    "longitude": 126.4884046,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050400"
  },
  {
    "name": "운남119안전센터",
    "address": "인천 영종구 운남로 116",
    "latitude": 37.4880379,
    "longitude": 126.5332961,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050500"
  },
  {
    "name": "용유119안전센터",
    "address": "인천 영종구 용유서로128번길 1",
    "latitude": 37.4485363,
    "longitude": 126.3939507,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050600"
  },
  {
    "name": "무의119지역대",
    "address": "인천 영종구 대무의로 310-11",
    "latitude": 37.3896135,
    "longitude": 126.4255873,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050700"
  },
  {
    "name": "영종119구조대",
    "address": "인천 영종구 인천대교고속도로 3-1",
    "latitude": 37.4717478,
    "longitude": 126.5127597,
    "source": "https://www.incheon.go.kr/119yeongjong/119yeongjong050800"
  }
];
  const station = [offices[0].latitude,offices[0].longitude];
  const map = L.map('installationMap').setView(station,13);
  const tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tile.on('tileerror',()=>{status.textContent='지도 배경을 불러오지 못했습니다. 연결 상태를 확인해 주세요. 설치 목록은 아래에서 볼 수 있습니다.';});
  const officePoints = [];
  for (const office of offices) {
    const coordinate = [office.latitude,office.longitude]; officePoints.push(coordinate);
    const popup = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = office.name; popup.append(title);
    const address = document.createElement('p'); address.textContent = office.address; popup.append(address);
    if (office.name === '영종소방서') { const info = document.createElement('p'); info.textContent='공항119안전센터와 같은 주소'; popup.append(info); }
    const link = document.createElement('a'); link.href = office.source; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='공식 주소 안내 ↗'; popup.append(link);
    const icon = L.divIcon({className:'fire-marker',html:'<span>119</span>',iconSize:[38,42],iconAnchor:[19,42],popupAnchor:[0,-42]});
    const marker = L.marker(coordinate,{icon,title:office.name,alt:office.name,bubblingMouseEvents:false}).addTo(map).bindPopup(popup).bindTooltip(office.name,{direction:'top',offset:[0,-38]});
    const button=document.createElement('button');button.type='button';button.className='point-item';button.textContent='119 · '+office.name;
    const small=document.createElement('small');small.textContent=office.address;button.append(small);
    button.onclick=()=>{map.setView(coordinate,16);marker.openPopup();document.getElementById('installationMap').scrollIntoView({behavior:'smooth',block:'center'});};
    document.getElementById('officeList').append(button);
  }
  map.fitBounds(officePoints,{padding:[42,42],maxZoom:12});
  // Leaflet circles use geographic meters, independent of zoom level.
  const radii = [100,200,300,500];
  let radiusIndex = -1, measurementCenter = null, measurementCircle = null, measurementMarker = null;
  const rulerButton = document.getElementById('rulerButton');
  const measureHelp = document.getElementById('measureHelp');
  function renderMeasurement() {
    const radius = radii[radiusIndex];
    if (!measurementCenter) {
      measureHelp.textContent = `반경 ${radius}m · 지도에서 중심점을 선택하세요. 직선거리 기준입니다.`;
      return;
    }
    if (!measurementCircle) {
      measurementCircle = L.circle(measurementCenter,{radius,color:'#247cc2',weight:2,fillColor:'#3698ea',fillOpacity:0.22,interactive:false}).addTo(map);
      measurementMarker = L.circleMarker(measurementCenter,{radius:5,color:'#fff',weight:2,fillColor:'#176bb0',fillOpacity:1,interactive:false}).addTo(map);
    } else {
      measurementCircle.setLatLng(measurementCenter).setRadius(radius);
      measurementMarker.setLatLng(measurementCenter);
    }
    measureHelp.textContent = `선택한 중심에서 반경 ${radius}m (지름 ${radius*2}m) · 지도에서 다른 곳을 누르면 중심이 이동합니다. 등산로를 따라 이동한 거리와는 다릅니다.`;
  }
  rulerButton.addEventListener('click',()=>{
    radiusIndex = (radiusIndex+1)%radii.length;
    rulerButton.textContent = `📏 ${radii[radiusIndex]}m`;
    rulerButton.setAttribute('aria-pressed','true');
    document.getElementById('installationMap').style.cursor='crosshair';
    renderMeasurement();
  });
  map.on('click',event=>{
    if(radiusIndex<0)return;
    measurementCenter=event.latlng;
    renderMeasurement();
  });
  L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
  const points = [...officePoints];
  let count=0;
  document.getElementById('stationView').onclick=()=>map.setView(station,16);
  document.getElementById('allView').onclick=()=>points.length>1?map.fitBounds(points,{padding:[32,32],maxZoom:16}):map.setView(station,13);
  try {
    const response=await fetch('locations.json',{cache:'no-cache'});if(!response.ok)throw new Error('load');
    const data=await response.json();if(!Array.isArray(data))throw new Error('format');
    let invalid=0;
    for(const point of data){
      if(!point || typeof point.latitude!=='number'||typeof point.longitude!=='number'||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180){invalid++;continue;}
      const location=[point.latitude,point.longitude];points.push(location);count++;
      const content=document.createElement('div');const heading=document.createElement('strong');heading.textContent=point.name||`설치 지점 ${count}`;content.append(heading);
      for(const value of [point.type,point.installedAt,point.note]){if(value){const p=document.createElement('p');p.textContent=String(value);content.append(p);}}
      const coords=document.createElement('p');coords.textContent=`${point.latitude}, ${point.longitude}`;content.append(coords);
      const link=document.createElement('a');link.textContent='Google 지도에서 보기 ↗';link.href=`https://www.google.com/maps?q=${point.latitude},${point.longitude}`;link.target='_blank';link.rel='noopener noreferrer';content.append(link);
      if(point.photo){const url=new URL(String(point.photo),window.location.href);if(url.origin===window.location.origin){const img=document.createElement('img');img.src=url.href;img.alt=heading.textContent+' 설치 사진';img.loading='lazy';content.append(document.createElement('br'),img);}}
      const marker=L.circleMarker(location,{radius:8,color:'#fff',weight:2,fillColor:'#d92536',fillOpacity:1}).addTo(map).bindPopup(content);
      const button=document.createElement('button');button.className='point-item';button.type='button';button.textContent=heading.textContent;
      const small=document.createElement('small');small.textContent=[point.type,point.installedAt].filter(Boolean).join(' · ');button.append(small);
      button.onclick=()=>{map.setView(location,17);marker.openPopup();document.getElementById('installationMap').scrollIntoView({behavior:'smooth',block:'center'});};document.getElementById('pointList').append(button);
    }
    document.getElementById('pointCount').textContent=String(count);document.getElementById('emptyPoints').hidden=count>0;
    status.textContent=`등록된 설치 지점 ${count}곳${invalid?' · 좌표 오류 '+invalid+'건 제외':''}`;
  }catch {status.textContent='설치 위치 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';document.getElementById('emptyPoints').textContent='설치 목록을 확인할 수 없습니다.';}
  const staticCount=count;
  const permanentPoints=[...points];
  const cfg=window.APP_CONFIG||{};
  if(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl||'') && cfg.supabaseAnonKey){
    try{
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
      const client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
      let tempLayers=[],tempItems=[],firstLoad=true;
      const loadTemporary=async()=>{
        const result=await client.from('temporary_reports').select('id,latitude,longitude,accuracy_m,submitted_at,expires_at').gt('expires_at',new Date().toISOString()).order('submitted_at',{ascending:false});
        if(result.error)throw result.error;
        for(const item of tempLayers)map.removeLayer(item);
        for(const item of tempItems)item.remove();
        tempLayers=[];tempItems=[];
        for(const point of result.data||[]){
          const location=[point.latitude,point.longitude];
          const popup=document.createElement('div');const title=document.createElement('strong');title.textContent='최근 접수 위치 · 7일 임시 표시';popup.append(title);
          const date=document.createElement('p');date.textContent='접수 '+new Date(point.submitted_at).toLocaleString('ko-KR')+' · GPS 오차 약 '+point.accuracy_m+'m';popup.append(date);
          const link=document.createElement('a');link.href='https://www.google.com/maps?q='+point.latitude+','+point.longitude;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Google 지도에서 보기 ↗';popup.append(link);
          let cancelEntries=[];
          try { cancelEntries=JSON.parse(localStorage.getItem('yjfireclimbing.cancelTokens.v1')||'[]'); } catch {}
          const cancelEntry=cancelEntries.find(entry=>entry.id===point.id && entry.expiresAt>Date.now());
          if(cancelEntry){
            const cancelButton=document.createElement('button');cancelButton.type='button';cancelButton.className='point-cancel';cancelButton.textContent='이 요청 취소 · 지도에서 삭제';
            cancelButton.style.cssText='display:block;margin-top:10px;padding:8px 12px;border:1px solid #b83232;border-radius:8px;background:#fff5f5;color:#a22222;font:inherit;font-weight:700;cursor:pointer';
            cancelButton.addEventListener('click',async()=>{
              if(!window.confirm('이 기기에서 보낸 임시 위치 요청을 취소하고 지도에서 삭제할까요?'))return;
              cancelButton.disabled=true;cancelButton.textContent='요청을 취소하고 있습니다…';
              const cancelled=await client.rpc('cancel_temporary_report',{p_id:point.id,p_token:cancelEntry.token});
              if(cancelled.error||cancelled.data!==true){cancelButton.disabled=false;cancelButton.textContent='취소 기능 설정을 확인해 주세요';console.error('temporary report cancellation failed',cancelled.error);return;}
              try { localStorage.setItem('yjfireclimbing.cancelTokens.v1',JSON.stringify(cancelEntries.filter(entry=>entry.id!==point.id))); } catch {}
              await loadTemporary();
              status.textContent='임시 위치 요청을 취소했습니다.';
            });
            popup.append(cancelButton);
          }
          const marker=L.circleMarker(location,{radius:9,color:'#fff',weight:3,fillColor:'#1683c4',fillOpacity:1}).addTo(map).bindPopup(popup);tempLayers.push(marker);
          const button=document.createElement('button');button.className='point-item';button.type='button';button.textContent='최근 접수 위치 · 7일 임시';const small=document.createElement('small');small.textContent=new Date(point.submitted_at).toLocaleString('ko-KR')+' · '+point.latitude.toFixed(5)+', '+point.longitude.toFixed(5);button.append(small);button.onclick=()=>{map.setView(location,17);marker.openPopup();document.getElementById('installationMap').scrollIntoView({behavior:'smooth',block:'center'});};document.getElementById('pointList').append(button);tempItems.push(button);
        }
        const livePoints=(result.data||[]).map(point=>[point.latitude,point.longitude]);points.splice(0,points.length,...permanentPoints,...livePoints);
        const total=staticCount+livePoints.length;document.getElementById('pointCount').textContent=String(total);document.getElementById('emptyPoints').hidden=total>0;
        if(firstLoad&&livePoints.length){map.fitBounds(points,{padding:[32,32],maxZoom:15});firstLoad=false;}
        status.textContent='최근 접수 '+(result.data||[]).length+'곳 · 영구 등록 '+staticCount+'곳';
      };
      await loadTemporary();
      client.channel('temporary-map-locations').on('postgres_changes',{event:'*',schema:'public',table:'temporary_reports'},()=>loadTemporary()).subscribe();
      window.setInterval(()=>loadTemporary().catch(error=>{status.textContent='최근 접수 위치를 새로고침하지 못했습니다.';console.error(error);}),60000);
    }catch(error){status.textContent='Supabase 임시 위치를 불러오지 못했습니다. GPS 접수는 계속 이메일로 받을 수 있습니다.';console.error('temporary location map failed',error);}
  } else {status.textContent='Supabase 연결 후 최근 접수 위치가 7일간 표시됩니다.';}
})();
