// 🔐 سیستم ورود ادمین - Supabase Auth

let currentProfile = null;

function openLoginModal() {
  if (isAdmin) {
    logoutAdmin();
    return;
  }

  document.getElementById('login-modal').classList.remove('hidden');

  setTimeout(() => {
    document.getElementById('admin-username-input')?.focus();
  }, 50);
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');

  const passwordInput =
    document.getElementById('admin-pass-input');

  if (passwordInput) {
    passwordInput.value = '';
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();

  const usernameOrEmail =
    document.getElementById('admin-username-input').value.trim();

  const password =
    document.getElementById('admin-pass-input').value;

  if (!usernameOrEmail || !password) {
    alert('نام کاربری و رمز عبور را وارد کنید.');
    return;
  }

  const button =
    document.getElementById('admin-login-btn');

  button.disabled = true;
  button.innerText = 'در حال ورود...';

  try {

    let loginEmail = usernameOrEmail;

    /*
     * اگر کاربر نام کاربری وارد کرده باشد،
     * ابتدا login_email را از profiles پیدا می کنیم.
     */
    if (!usernameOrEmail.includes('@')) {

      const { data: profile, error } =
        await _supabase
          .from('profiles')
          .select('login_email')
          .eq('username', usernameOrEmail.toLowerCase())
          .eq('active', true)
          .single();

      if (error || !profile) {
        throw new Error('نام کاربری یا رمز عبور نادرست است.');
      }

      loginEmail = profile.login_email;
    }

    /*
     * ورود واقعی از طریق Supabase Auth
     */
    const { data, error } =
      await _supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });

    if (error || !data.user) {
      console.error('Supabase Login Error:', error);
      throw new Error('نام کاربری یا رمز عبور نادرست است.');
    }

    /*
     * دریافت پروفایل مدیر
     */
    const { data: profile, error: profileError } =
      await _supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          login_email,
          permissions,
          active
        `)
        .eq('id', data.user.id)
        .single();

    if (profileError || !profile) {

      await _supabase.auth.signOut();

      throw new Error(
        'برای این حساب، پروفایل مدیر پیدا نشد.'
      );
    }

    if (!profile.active) {

      await _supabase.auth.signOut();

      throw new Error(
        'این حساب مدیر غیرفعال است.'
      );
    }

    /*
     * ورود موفق
     */
    currentProfile = profile;

    isAdmin = true;

    document.body.classList.add('is-admin');

    const displayName =
      profile.display_name ||
      profile.username ||
      'مدیر';

    const statusBox =
      document.getElementById('user-status-box');

    if (statusBox) {
      statusBox.innerHTML =
        `وضعیت: <strong style="color:#16a34a;">
          ${displayName} (مدیر سیستم)
        </strong>`;
    }

    const authButton =
      document.getElementById('auth-action-btn');

    if (authButton) {
      authButton.innerText =
        '🚪 خروج از پنل مدیریت';
    }

    closeLoginModal();

    renderTable();

  } catch (error) {

    console.error(
      'Admin Login Failed:',
      error
    );

    alert(
      error.message ||
      'ورود ناموفق بود.'
    );

  } finally {

    button.disabled = false;

    button.innerText =
      'ورود و فعال سازی';
  }
}


async function restoreAdminSession() {

  const {
    data: { session }
  } = await _supabase.auth.getSession();

  if (!session?.user) {
    return;
  }

  const { data: profile } =
    await _supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        login_email,
        permissions,
        active
      `)
      .eq('id', session.user.id)
      .single();

  if (!profile || !profile.active) {

    await _supabase.auth.signOut();

    return;
  }

  currentProfile = profile;

  isAdmin = true;

  document.body.classList.add('is-admin');

  const displayName =
    profile.display_name ||
    profile.username ||
    'مدیر';

  const statusBox =
    document.getElementById('user-status-box');

  if (statusBox) {
    statusBox.innerHTML =
      `وضعیت: <strong style="color:#16a34a;">
        ${displayName} (مدیر سیستم)
      </strong>`;
  }

  const authButton =
    document.getElementById('auth-action-btn');

  if (authButton) {
    authButton.innerText =
      '🚪 خروج از پنل مدیریت';
  }

  renderTable();
}


async function logoutAdmin() {

  await _supabase.auth.signOut();

  currentProfile = null;

  isAdmin = false;

  document.body.classList.remove('is-admin');

  const statusBox =
    document.getElementById('user-status-box');

  if (statusBox) {
    statusBox.innerHTML =
      'وضعیت: <strong>کاربر عادی (فقط مشاهده)</strong>';
  }

  const authButton =
    document.getElementById('auth-action-btn');

  if (authButton) {
    authButton.innerText =
      '🔒 ورود به پنل مدیریت';
  }

  renderTable();
}