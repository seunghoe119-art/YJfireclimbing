// 수신 이메일 또는 이메일 인증 후 FormSubmit이 제공하는 토큰을 입력하세요.
// 이 파일은 공개됩니다. Publishable key만 입력하고 비밀번호나 secret/service_role 키는 넣지 마세요.
window.APP_CONFIG = Object.freeze({
  recipient: "sj240324@outlook.kr",
  recipientLabel: "현장 접수 담당자",
  subject: "[YJfireclimbing] 현장 사진 및 위치정보 접수",
  supabaseUrl: "https://rebjcoazabhkcobjjzkj.supabase.co", // Supabase Project URL
  supabaseAnonKey: "sb_publishable_56dLyg6nM0RWsDsHy08kPA_cMQHPt1J" // Publishable (anon) key only; never place a service-role key here
});
