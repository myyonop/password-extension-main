import { supabase } from './supabaseClient.js'

/* ─────────────────────────────────────────
   DOM 요소
───────────────────────────────────────── */
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')

const loginBtn = document.getElementById('login-btn')
const logoutBtn = document.getElementById('logout-btn')

const authSection = document.getElementById('auth-section')
const successSection = document.getElementById('success-section')

const userEmail = document.getElementById('user-email')
const statusMsg = document.getElementById('status-msg')

/* ─────────────────────────────────────────
   상태 메시지 출력
───────────────────────────────────────── */
function showStatus(msg, isError = false) {
  statusMsg.innerHTML = msg

  statusMsg.style.color = isError
    ? '#f55'
    : '#4f8ef7'
}

/* ─────────────────────────────────────────
   로그인 성공 화면
───────────────────────────────────────── */
function showSuccess(session) {
  authSection.style.display = 'none'

  successSection.style.display = 'block'

  userEmail.textContent = session.user.email

  showStatus('')
}

/* ─────────────────────────────────────────
   로그인 화면
───────────────────────────────────────── */
function showLogin() {
  authSection.style.display = 'block'

  successSection.style.display = 'none'

  showStatus('')
}

/* ─────────────────────────────────────────
   팝업 열릴 때 세션 확인
───────────────────────────────────────── */
chrome.storage.local.get(['session'], (result) => {
  if (result.session) {
    showSuccess(result.session)
  } else {
    showLogin()
  }
})

/* ─────────────────────────────────────────
   로그인
───────────────────────────────────────── */
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim()

  const password = passwordInput.value.trim()

  /* 입력값 체크 */
  if (!email || !password) {
    return showStatus(
      '이메일과 비밀번호를 입력해주세요.',
      true
    )
  }

  showStatus('로그인 중...')

  /* Supabase 로그인 */
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  /* 로그인 실패 */
  if (error) {
    console.error(error)

    /* 계정 없음 */
    if (
      error.message.includes(
        'Invalid login credentials'
      )
    ) {
      return showStatus(
        `
        계정이 존재하지 않습니다.
        <br><br>

        <a
          href="#"
          id="create-account"
          style="
            color:#10b981;
            text-decoration:none;
            font-weight:600;
          "
        >
          회원가입하기
        </a>
        `,
        true
      )
    }

    /* 이메일 인증 안 된 경우 */
    if (
      error.message.includes(
        'Email not confirmed'
      )
    ) {
      return showStatus(
        '이메일 인증 후 로그인해주세요.',
        true
      )
    }

    return showStatus(
      error.message,
      true
    )
  }

  /* 로그인 성공 */
  chrome.storage.local.set(
    { session: data.session },
    () => {
      showSuccess(data.session)
    }
  )
})

/* ─────────────────────────────────────────
   회원가입 링크 클릭
───────────────────────────────────────── */
document.addEventListener(
  'click',
  async (e) => {
    if (e.target.id === 'create-account') {
      e.preventDefault()

      const email =
        emailInput.value.trim()

      const password =
        passwordInput.value.trim()

      /* 입력값 체크 */
      if (!email || !password) {
        return showStatus(
          '이메일과 비밀번호를 입력해주세요.',
          true
        )
      }

      /* 비밀번호 길이 */
      if (password.length < 6) {
        return showStatus(
          '비밀번호는 6자 이상이어야 합니다.',
          true
        )
      }

      showStatus('회원가입 중...')

      /* Supabase 회원가입 */
      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,
        })

      /* 회원가입 실패 */
      if (error) {
        console.error(error)

        return showStatus(
          error.message,
          true
        )
      }

      /* 자동 로그인 */
      if (data.session) {
        chrome.storage.local.set(
          { session: data.session },
          () => {
            showSuccess(data.session)
          }
        )
      } else {
        /* 이메일 인증 필요한 경우 */
        showStatus(
          `
          회원가입 성공!
          <br>
          이메일 인증 후 로그인해주세요.
          `
        )
      }
    }
  }
)

/* ─────────────────────────────────────────
   로그아웃
───────────────────────────────────────── */
logoutBtn.addEventListener(
  'click',
  async () => {
    await supabase.auth.signOut()

    chrome.storage.local.remove(
      ['session'],
      () => {
        showLogin()
      }
    )
  }
)