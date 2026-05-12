import { supabase } from './supabaseClient.js'

/* ─────────────────────────────────────────
   DOM 요소
───────────────────────────────────────── */
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')

const loginBtn = document.getElementById('login-btn')
const logoutBtn = document.getElementById('logout-btn')
const resendBtn = document.getElementById('resend-btn')

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

  resendBtn.style.display = 'none'

  showStatus('')
}

/* ─────────────────────────────────────────
   팝업 열릴 때 세션 확인
───────────────────────────────────────── */
chrome.storage.local.get(
  ['session'],
  (result) => {
    if (result.session) {
      showSuccess(result.session)
    } else {
      showLogin()
    }
  }
)

/* ─────────────────────────────────────────
   로그인
───────────────────────────────────────── */
loginBtn.addEventListener(
  'click',
  async () => {
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

    resendBtn.style.display = 'none'

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

      /* 이메일 존재 여부 확인 */
      const {
        data: existingUser,
      } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      /* 이메일 존재 */
      if (existingUser) {
        return showStatus(
          '비밀번호가 올바르지 않습니다.',
          true
        )
      }

      /* 이메일 없음 */
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

    /* 이메일 인증 여부 */
    if (
      !data.user ||
      !data.user.email_confirmed_at
    ) {
      await supabase.auth.signOut()

      resendBtn.style.display = 'block'

      resendBtn.dataset.email =
        email

      return showStatus(
        `
        이메일 인증이 필요합니다.
        <br>
        받은 메일함을 확인해주세요.
        `,
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
  }
)

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

      resendBtn.style.display =
        'none'

      showStatus('회원가입 중...')

      /* 회원가입 */
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

      /* profiles 저장 */
      if (data.user) {
        const {
          error: insertError,
        } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
          })

        if (insertError) {
          console.error(insertError)
        }
      }

      /* 인증 메일 안내 */
      resendBtn.style.display =
        'block'

      resendBtn.dataset.email =
        email

      showStatus(
        `
        ✉️ 인증 메일을 발송했습니다.
        <br>
        이메일 인증 후 로그인해주세요.
        `
      )
    }
  }
)

/* ─────────────────────────────────────────
   인증 메일 재전송
───────────────────────────────────────── */
resendBtn.addEventListener(
  'click',
  async () => {
    const email =
      resendBtn.dataset.email ||
      emailInput.value.trim()

    if (!email) {
      return showStatus(
        '이메일을 입력해주세요.',
        true
      )
    }

    showStatus('재전송 중...')

    const { error } =
      await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

    if (error) {
      return showStatus(
        error.message,
        true
      )
    }

    showStatus(
      `
      ✉️ 인증 메일을 재전송했습니다.
      <br>
      메일함을 확인해주세요.
      `
    )
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