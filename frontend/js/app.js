const API_BASE = window.location.origin + '/api';

const Auth = {
  getToken() {
    return localStorage.getItem('token');
  },
  getUser() {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  },
  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  redirectByRole(role) {
    const pages = {
      siswa: 'dashboard-siswa.html',
      guru_bk: 'dashboard-guru.html',
      admin: 'dashboard-admin.html',
    };
    window.location.href = pages[role] || 'index.html';
  },
  requireRole(...roles) {
    const user = this.getUser();
    if (!user || !this.isLoggedIn()) {
      window.location.href = 'index.html';
      return null;
    }
    if (roles.length && !roles.includes(user.role)) {
      this.redirectByRole(user.role);
      return null;
    }
    return user;
  },
  logout() {
    this.clear();
    window.location.href = 'index.html';
  },
};

async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/pdf')) {
    if (!res.ok) throw new Error('Gagal mengunduh PDF');
    return res.blob();
  }

  const data = contentType.includes('json') ? await res.json() : null;

  if (res.status === 401) {
    Auth.clear();
    window.location.href = 'index.html';
    throw new Error('Sesi berakhir');
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Terjadi kesalahan');
  }

  return data;
}

function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function statusBadge(status) {
  const labels = {
    menunggu: 'Menunggu',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    dipanggil: 'Dipanggil',
    selesai: 'Selesai',
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function initNavbar(user) {
  const el = document.getElementById('navbar-user');
  if (!el || !user) return;
  const roleLabels = { siswa: 'Siswa', guru_bk: 'Guru BK', admin: 'Admin' };
  el.innerHTML = `
    <span class="role-badge">${roleLabels[user.role]}</span>
    <span>${user.name}</span>
    <button class="btn btn-sm btn-outline" style="border-color:#fff;color:#fff" onclick="Auth.logout()">Keluar</button>
  `;
}

function openModal(id) {
  document.getElementById(id)?.classList.add('show');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

/* ========== LOGIN ========== */
async function initLogin() {
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    Auth.redirectByRole(user.role);
    return;
  }

  const form = document.getElementById('login-form');
  const alertEl = document.getElementById('login-alert');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      Auth.setSession(data.token, data.user);
      Auth.redirectByRole(data.user.role);
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

/* ========== SISWA DASHBOARD ========== */
async function initSiswaDashboard() {
  const user = Auth.requireRole('siswa');
  if (!user) return;
  initNavbar(user);

  const alertEl = document.getElementById('alert');
  const tableBody = document.getElementById('pertemuan-table');
  const form = document.getElementById('ajuan-form');
  const guruSelect = document.getElementById('guru_bk_id');
  const kategoriSelect = document.getElementById('kategori_id');

  async function loadPertemuan() {
    try {
      const data = await api('/pertemuan');
      document.getElementById('stat-total').textContent = data.length;
      document.getElementById('stat-menunggu').textContent = data.filter(p => p.status === 'menunggu').length;
      document.getElementById('stat-selesai').textContent = data.filter(p => p.status === 'selesai').length;

      if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada pertemuan</td></tr>`;
        return;
      }

      tableBody.innerHTML = data.map(p => `
        <tr>
          <td>${formatDate(p.tanggal)}</td>
          <td>${p.nama_guru || '-'}</td>
          <td>${p.kategori_nama || '-'}</td>
          <td>${p.keperluan}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${p.isi_catatan ? `<small>${p.isi_catatan}</small>` : '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  async function loadFormOptions() {
    try {
      const [guru, kategori] = await Promise.all([api('/guru'), api('/kategori')]);
      guruSelect.innerHTML = guru.map(g => `<option value="${g.id}">${g.name} (NIP: ${g.nip})</option>`).join('');
      kategoriSelect.innerHTML = kategori.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      guru_bk_id: parseInt(form.guru_bk_id.value),
      kategori_id: parseInt(form.kategori_id.value),
      jenis: form.jenis.value,
      tanggal: form.tanggal.value,
      keperluan: form.keperluan.value.trim(),
    };
    try {
      await api('/pertemuan', { method: 'POST', body: JSON.stringify(body) });
      showAlert(alertEl, 'Pengajuan berhasil dikirim!', 'success');
      form.reset();
      closeModal('modal-ajuan');
      loadPertemuan();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });

  document.getElementById('btn-ajuan')?.addEventListener('click', () => openModal('modal-ajuan'));

  await loadFormOptions();
  await loadPertemuan();
}

/* ========== GURU DASHBOARD ========== */
async function initGuruDashboard() {
  const user = Auth.requireRole('guru_bk');
  if (!user) return;
  initNavbar(user);

  const alertEl = document.getElementById('alert');
  const tableBody = document.getElementById('pertemuan-table');
  let pertemuanList = [];

  async function loadPertemuan() {
    try {
      const data = await api('/pertemuan');
      pertemuanList = data;
      document.getElementById('stat-total').textContent = data.length;
      document.getElementById('stat-menunggu').textContent = data.filter(p => p.status === 'menunggu').length;
      document.getElementById('stat-selesai').textContent = data.filter(p => p.status === 'selesai').length;

      if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada pertemuan</td></tr>`;
        return;
      }

      tableBody.innerHTML = data.map(p => {
        let actions = '';
        if (p.status === 'menunggu') {
          actions = `
            <button class="btn btn-sm btn-success" onclick="guruSetujui(${p.id})">Setujui</button>
            <button class="btn btn-sm btn-danger" onclick="guruTolak(${p.id})">Tolak</button>
          `;
        } else if (p.status === 'disetujui') {
          actions = `
            <button class="btn btn-sm btn-primary" onclick="guruPanggil(${p.id})">Panggil Siswa</button>
            <button class="btn btn-sm btn-primary" onclick="guruSelesai(${p.id})">Selesaikan</button>
          `;
        } else if (p.status === 'dipanggil') {
          actions = `<button class="btn btn-sm btn-primary" onclick="guruSelesai(${p.id})">Selesaikan</button>`;
        }

        return `
          <tr>
            <td>${p.nama_siswa}<br><small>${p.kelas}</small></td>
            <td>${formatDate(p.tanggal)}</td>
            <td>${p.kategori_nama || '-'}</td>
            <td>${p.keperluan}</td>
            <td>${statusBadge(p.status)}</td>
            <td><div class="btn-group">${actions || '-'}</div></td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  window.guruSetujui = async (id) => {
    try {
      await api(`/pertemuan/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'disetujui' }) });
      showAlert(alertEl, 'Pertemuan disetujui', 'success');
      loadPertemuan();
    } catch (err) { showAlert(alertEl, err.message); }
  };

  window.guruTolak = async (id) => {
    if (!confirm('Tolak pengajuan ini?')) return;
    try {
      await api(`/pertemuan/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ditolak' }) });
      showAlert(alertEl, 'Pertemuan ditolak', 'success');
      loadPertemuan();
    } catch (err) { showAlert(alertEl, err.message); }
  };

  window.guruPanggil = async (id) => {
    try {
      await api(`/pertemuan/${id}/panggil`, { method: 'PATCH' });
      showAlert(alertEl, 'Siswa dipanggil ke ruang BK', 'success');
      loadPertemuan();
    } catch (err) { showAlert(alertEl, err.message); }
  };

  window.guruSelesai = (id) => {
    document.getElementById('selesai-pertemuan-id').value = id;
    document.getElementById('form-selesai').reset();
    openModal('modal-selesai');
  };

  document.getElementById('form-selesai')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('selesai-pertemuan-id').value;
    const form = e.target;
    try {
      await api(`/pertemuan/${id}/selesai`, {
        method: 'POST',
        body: JSON.stringify({
          isi_catatan: form.isi_catatan.value.trim(),
          tindak_lanjut: form.tindak_lanjut.value.trim(),
        }),
      });
      showAlert(alertEl, 'Pertemuan selesai, catatan tersimpan', 'success');
      closeModal('modal-selesai');
      loadPertemuan();
    } catch (err) { showAlert(alertEl, err.message); }
  });

  document.getElementById('btn-export')?.addEventListener('click', async () => {
    const dari = document.getElementById('filter-dari')?.value || '';
    const sampai = document.getElementById('filter-sampai')?.value || '';
    let url = `/laporan/pdf`;
    const params = [];
    if (dari) params.push(`dari=${dari}`);
    if (sampai) params.push(`sampai=${sampai}`);
    if (params.length) url += '?' + params.join('&');

    try {
      const blob = await api(url);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'laporan-konseling.pdf';
      a.click();
    } catch (err) { showAlert(alertEl, err.message); }
  });

  await loadPertemuan();
}

/* ========== ADMIN DASHBOARD ========== */
async function initAdminDashboard() {
  const user = Auth.requireRole('admin');
  if (!user) return;
  initNavbar(user);

  const alertEl = document.getElementById('alert');
  const tableBody = document.getElementById('users-table');
  let editingId = null;

  let activeRole = 'siswa';

  function switchTab(role) {
    activeRole = role;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
    document.getElementById('th-id').textContent = role === 'siswa' ? 'NIS' : 'NIP';
    document.getElementById('th-detail').textContent = role === 'siswa' ? 'Kelas / Jurusan' : 'Peran';
    loadUsers(role);
  }

  async function loadUsers(role) {
    try {
      const data = await api(`/users?role=${role}`);
      const countEl = document.getElementById(`stat-${role === 'siswa' ? 'siswa' : 'guru'}`);
      if (countEl) countEl.textContent = data.length;

      const otherRole = role === 'siswa' ? 'guru_bk' : 'siswa';
      const otherData = await api(`/users?role=${otherRole}`);
      const otherCount = document.getElementById(`stat-${otherRole === 'siswa' ? 'siswa' : 'guru'}`);
      if (otherCount) otherCount.textContent = otherData.length;

      if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada data</td></tr>`;
        return;
      }

      tableBody.innerHTML = data.map(u => `
        <tr>
          <td>${u.name}</td>
          <td>${u.username}</td>
          <td>${role === 'siswa' ? u.nis : u.nip}</td>
          <td>${role === 'siswa' ? `${u.kelas} / ${u.jurusan}` : 'Guru BK'}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>
            <div class="btn-group">
              <button class="btn btn-sm btn-primary" onclick="adminEdit(${u.id}, '${role}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="adminDelete(${u.id})">Hapus</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  window.adminEdit = async (id, role) => {
    editingId = id;
    const data = await api(`/users?role=${role}`);
    const u = data.find(x => x.id === id);
    if (!u) return;

    document.getElementById('modal-title').textContent = 'Edit User';
    document.getElementById('form-user').name.value = u.name;
    document.getElementById('form-user').username.value = u.username;
    document.getElementById('form-user').password.value = '';
    document.getElementById('form-user').role.value = u.role;
    toggleRoleFields(u.role);
    if (u.role === 'siswa') {
      document.getElementById('form-user').nis.value = u.nis;
      document.getElementById('form-user').kelas.value = u.kelas;
      document.getElementById('form-user').jurusan.value = u.jurusan;
    } else {
      document.getElementById('form-user').nip.value = u.nip;
    }
    openModal('modal-user');
  };

  window.adminDelete = async (id) => {
    if (!confirm('Hapus user ini?')) return;
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      showAlert(alertEl, 'User dihapus', 'success');
      loadUsers(activeRole);
    } catch (err) { showAlert(alertEl, err.message); }
  };

  function toggleRoleFields(role) {
    document.getElementById('fields-siswa').classList.toggle('hidden', role !== 'siswa');
    document.getElementById('fields-guru').classList.toggle('hidden', role !== 'guru_bk');
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.role));
  });

  document.getElementById('form-user')?.role?.addEventListener('change', (e) => {
    toggleRoleFields(e.target.value);
  });

  document.getElementById('btn-tambah')?.addEventListener('click', () => {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Tambah User';
    document.getElementById('form-user').reset();
    document.getElementById('form-user').role.value = activeRole;
    toggleRoleFields(activeRole);
    openModal('modal-user');
  });

  document.getElementById('form-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      name: form.name.value.trim(),
      username: form.username.value.trim(),
      password: form.password.value,
      role: form.role.value,
    };
    if (body.role === 'siswa') {
      body.nis = form.nis.value.trim();
      body.kelas = form.kelas.value.trim();
      body.jurusan = form.jurusan.value.trim();
    } else {
      body.nip = form.nip.value.trim();
    }

    try {
      if (editingId) {
        if (!body.password) delete body.password;
        await api(`/users/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
        showAlert(alertEl, 'User diperbarui', 'success');
      } else {
        if (!body.password) {
          showAlert(alertEl, 'Password wajib diisi');
          return;
        }
        await api('/users', { method: 'POST', body: JSON.stringify(body) });
        showAlert(alertEl, 'User ditambahkan', 'success');
      }
      closeModal('modal-user');
      loadUsers(body.role);
    } catch (err) { showAlert(alertEl, err.message); }
  });

  switchTab('siswa');
}
