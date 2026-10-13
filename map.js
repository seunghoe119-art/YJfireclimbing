'use strict';
(async () => {
  const status = document.getElementById('mapStatus');
  if (!window.L) { status.textContent = '지도를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.'; return; }
  const station = [37.4883291,126.4160458];
  const map = L.map('installationMap').setView(station,13);
  const tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tile.on('tileerror',()=>{status.textContent='지도 배경을 불러오지 못했습니다. 연결 상태를 확인해 주세요. 설치 목록은 아래에서 볼 수 있습니다.';});
  const popup = document.createElement('div');
  const title = document.createElement('strong');title.textContent='영종소방서 인근';popup.append(title);
  const address = document.createElement('p');address.textContent='제2터미널대로 268 · 인근 정류장 기준 좌표입니다. 정확한 건물 위치는 위치 검색에서 확인하세요.';popup.append(address);
  L.circleMarker(station,{radius:10,color:'#fff',weight:3,fillColor:'#284f75',fillOpacity:1}).addTo(map).bindPopup(popup);
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
  const points = [station];
  document.getElementById('stationView').onclick=()=>map.setView(station,16);
  document.getElementById('allView').onclick=()=>points.length>1?map.fitBounds(points,{padding:[32,32],maxZoom:16}):map.setView(station,13);
  try {
    const response=await fetch('locations.json',{cache:'no-cache'});if(!response.ok)throw new Error('load');
    const data=await response.json();if(!Array.isArray(data))throw new Error('format');
    let count=0,invalid=0;
    for(const point of data){
      if(!point || typeof point.latitude!=='number'||typeof point.longitude!=='number'||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180){invalid++;continue;}
      const location=[point.latitude,point.longitude];points.push(location);count++;
      const content=document.createElement('div');const heading=document.createElement('strong');heading.textContent=point.name||`설치 지점 ${count}`;content.append(heading);
      for(const value of [point.type,point.installedAt,point.note]){if(value){const p=document.createElement('p');p.textContent=String(value);content.append(p);}}
      const coords=document.createElement('p');coords.textContent=`${point.latitude}, ${point.longitude}`;content.append(coords);
      const link=document.createElement('a');link.textContent='Google 지도에서 보기 ↗';link.href=`https://www.google.com/maps?q=${point.latitude},${point.longitude}`;link.target='_blank';link.rel='noopener noreferrer';content.append(link);
      if(point.photo){const url=new URL(String(point.photo),window.location.href);if(url.origin===window.location.origin){const img=document.createElement('img');img.src=url.href;img.alt=heading.textContent+' 설치 사진';img.loading='lazy';content.append(document.createElement('br'),img);}}
      const marker=L.circleMarker(location,{radius:8,color:'#fff',weight:2,fillColor:'#467a2e',fillOpacity:1}).addTo(map).bindPopup(content);
      const button=document.createElement('button');button.className='point-item';button.type='button';button.textContent=heading.textContent;
      const small=document.createElement('small');small.textContent=[point.type,point.installedAt].filter(Boolean).join(' · ');button.append(small);
      button.onclick=()=>{map.setView(location,17);marker.openPopup();document.getElementById('installationMap').scrollIntoView({behavior:'smooth',block:'center'});};document.getElementById('pointList').append(button);
    }
    document.getElementById('pointCount').textContent=String(count);document.getElementById('emptyPoints').hidden=count>0;
    status.textContent=`등록된 설치 지점 ${count}곳${invalid?' · 좌표 오류 '+invalid+'건 제외':''}`;
  }catch {status.textContent='설치 위치 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';document.getElementById('emptyPoints').textContent='설치 목록을 확인할 수 없습니다.';}
})();
