const ADMINS = [
    { username: 'nullkotek', password: 'garte454', rank: 'Гл.Админ' },
    { username: 'kisyna123', password: 'ks%43', rank: 'Мл.Админ' },
    { username: 'hazbi0002', password: 'hz2@a', rank: 'Мл.Админ' }
];

let currentUser = null;
let questions = JSON.parse(localStorage.getItem('cristalhills_questions')) || [];
let users = JSON.parse(localStorage.getItem('cristalhills_users')) || [];

let servers = JSON.parse(localStorage.getItem('cristalhills_servers')) || [
    {
        name: 'Cristalhills',
        status: 'online',
        description: 'Cristalhills это проект, со своим сюжетом и квестами, где есть много игроков, с которыми вы можете подружиться и играть вместе, наш проект развивается и уже как год доступен для всех пользователей из разных стран, ждём вас на нашем сервере, скопируйте айпи ниже и установите сборку, так же по кнопке снизу, удачной вам игры.',
        version: '1.20.4',
        ips: [{ name: 'Основной', ip: 'play.cristalhills.net' }],
        builds: [{ name: 'Сборка', url: 'https://example.com/build.zip' }]
    }
];

let currentServerIndex = parseInt(localStorage.getItem('cristalhills_current_server')) || 0;

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    setupNavigation();
    setupForms();
    updateUI();
    loadServer(currentServerIndex);
    renderServersPage();
});

function loadServer(idx) {
    currentServerIndex = idx;
    localStorage.setItem('cristalhills_current_server', String(idx));
    const server = servers[idx];
    
    document.getElementById('current-server-name').textContent = server.name;
    const heroName = document.getElementById('hero-server-name');
    if (heroName) {
        const parts = server.name.match(/([a-zA-Z]+)([a-zA-Z]+)/);
        heroName.innerHTML = parts ? parts[1] + '<span class="highlight">' + parts[2] + '</span>' : server.name;
    }
    
    const statusEl = document.getElementById('server-status');
    const statusText = document.getElementById('status-text');
    if (statusEl && statusText) {
        statusEl.className = 'server-status ' + server.status;
        const statusMap = { online: 'Сервер онлайн', maintenance: 'Обслуживание', offline: 'Оффлайн' };
        statusText.textContent = statusMap[server.status] || 'Сервер онлайн';
    }
    
    if (document.getElementById('hero-description')) document.getElementById('hero-description').textContent = server.description;
    if (document.getElementById('mc-version')) document.getElementById('mc-version').textContent = server.version;
    
    const ipContainer = document.getElementById('ip-buttons');
    if (ipContainer) {
        ipContainer.innerHTML = '';
        server.ips.forEach((item) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-lg';
            btn.innerHTML = '<span class="btn-main">📋 ' + escapeHtml(item.ip) + '</span><span class="btn-sub">' + escapeHtml(item.name) + '</span>';
            btn.onclick = () => copyIP(item.ip);
            ipContainer.appendChild(btn);
        });
        server.builds.forEach((item) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-lg';
            btn.innerHTML = '<span class="btn-main">📥 ' + escapeHtml(item.name) + '</span><span class="btn-sub">Скачать</span>';
            btn.onclick = () => downloadBuild(item.url);
            ipContainer.appendChild(btn);
        });
    }
    
    renderServersPage();
}

function renderServersPage() {
    const grid = document.getElementById('servers-page-grid');
    if (!grid) return;
    grid.innerHTML = '';
    servers.forEach((server, idx) => {
        const card = document.createElement('div');
        card.className = 'server-page-card' + (idx === currentServerIndex ? ' active' : '');
        card.onclick = () => { loadServer(idx); navigateTo('home'); };
        const statusIcon = server.status === 'online' ? '🟢' : server.status === 'maintenance' ? '🟠' : '🔴';
        card.innerHTML = '<div class="server-page-header"><span class="server-page-icon">🌐</span><div class="server-page-name">' + escapeHtml(server.name) + '</div></div><div class="server-page-status">' + statusIcon + ' ' + (server.status === 'online' ? 'Онлайн' : server.status === 'maintenance' ? 'Обслуживание' : 'Оффлайн') + '</div><button class="btn btn-primary server-page-btn">Выбрать</button>';
        grid.appendChild(card);
    });
}

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page === 'auth') navigateTo(currentUser ? 'profile' : 'auth');
            else if (page === 'admin' && currentUser && currentUser.isAdmin) navigateTo('admin');
            else if (page === 'servers-list') { renderServersPage(); navigateTo('servers-list'); }
            else navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(page + '-page').classList.add('active');
    const activeLink = document.querySelector('.nav-link[data-page="' + page + '"]');
    if (activeLink) activeLink.classList.add('active');
    if (page === 'support') renderQuestions();
    if (page === 'profile') updateProfile();
    if (page === 'admin' && currentUser && currentUser.isAdmin) {
        renderServersList();
        loadAdminSettings();
        renderUsersList();
        renderAdminAllQuestions();
    }
}

function setupForms() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('question-form').addEventListener('submit', handleQuestionSubmit);
    document.getElementById('forgot-form').addEventListener('submit', handleForgotPassword);
    document.getElementById('promote-form').addEventListener('submit', handlePromote);
    document.getElementById('add-server-form').addEventListener('submit', handleAddServer);
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    const admin = ADMINS.find(a => a.username === username && a.password === password);
    const user = users.find(u => u.username === username && u.password === password);
    if (admin) currentUser = { ...admin, isAdmin: true, email: admin.username + '@admin.net', regDate: new Date().toLocaleDateString(), lastLogin: new Date().toLocaleString() };
    else if (user) currentUser = { ...user, isAdmin: false };
    else { errorEl.textContent = '❌ Неверно'; return; }
    localStorage.setItem('cristalhills_current', JSON.stringify(currentUser));
    loadCurrentUser();
    updateUI();
    navigateTo('profile');
    e.target.reset();
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    errorEl.textContent = '';
    successEl.textContent = '';
    if (password !== confirm) { errorEl.textContent = '❌ Пароли не совпадают'; return; }
    if (password.length < 4) { errorEl.textContent = '❌ Минимум 4 символа'; return; }
    const allUsernames = ADMINS.map(a => a.username).concat(users.map(u => u.username));
    if (allUsernames.indexOf(username) !== -1) { errorEl.textContent = '❌ Ник занят'; return; }
    const allEmails = ADMINS.map(a => a.email).concat(users.map(u => u.email));
    if (allEmails.indexOf(email) !== -1) { errorEl.textContent = '❌ Email занят'; return; }
    users.push({ username: username, email: email, password: password, rank: 'Игрок', regDate: new Date().toLocaleDateString(), lastLogin: new Date().toLocaleString() });
    localStorage.setItem('cristalhills_users', JSON.stringify(users));
    successEl.textContent = '✅ Создан! Войдите.';
    e.target.reset();
    setTimeout(function() { showLogin(); successEl.textContent = ''; }, 2000);
}

function handleForgotPassword(e) {
    e.preventDefault();
    const username = document.getElementById('forgot-username').value.trim();
    const email = document.getElementById('forgot-email').value.trim();
    const errorEl = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');
    errorEl.textContent = '';
    successEl.textContent = '';
    const user = users.find(function(u) { return u.username === username && u.email === email; });
    if (!user) { errorEl.textContent = '❌ Не найден'; return; }
    questions.push({ id: Date.now(), author: username, title: '🔴 ВОССТАНОВЛЕНИЕ: ' + username, category: 'password', text: 'Пароль: ' + user.password, date: new Date().toLocaleString(), answer: null, answerBy: null, answers: [], isUrgent: true, closed: false });
    localStorage.setItem('cristalhills_questions', JSON.stringify(questions));
    successEl.textContent = '✅ Отправлен!';
    e.target.reset();
    setTimeout(function() { showLogin(); successEl.textContent = ''; }, 3000);
}

function handlePromote(e) {
    e.preventDefault();
    const username = document.getElementById('promote-username').value;
    const newRank = document.getElementById('promote-rank').value;
    const idx = users.findIndex(function(u) { return u.username === username; });
    if (idx === -1) { alert('❌'); return; }
    users[idx].rank = newRank;
    localStorage.setItem('cristalhills_users', JSON.stringify(users));
    closePromoteModal();
    renderUsersList();
}

function handleAddServer(e) {
    e.preventDefault();
    const name = document.getElementById('new-server-name').value.trim();
    if (!name) return;
    servers.push({ name: name, status: 'online', description: 'Сервер ' + name, version: '1.20.4', ips: [{ name: 'IP', ip: 'play.' + name.toLowerCase().replace(/\s/g, '') + '.net' }], builds: [{ name: 'Сборка', url: 'https://example.com/build.zip' }] });
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    closeAddServerModal();
    renderServersList();
    renderServersPage();
    alert('✅ Создано: ' + name);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('cristalhills_current');
    updateUI();
    navigateTo('home');
}

function loadCurrentUser() {
    const saved = localStorage.getItem('cristalhills_current');
    if (saved) currentUser = JSON.parse(saved);
}

function updateUI() {
    const authLink = document.getElementById('auth-link');
    const adminLink = document.getElementById('admin-panel-link');
    const deleteBtn = document.getElementById('delete-account-btn');
    if (currentUser) {
        authLink.innerHTML = '<span class="nav-icon">👤</span>' + currentUser.username;
        authLink.dataset.page = 'profile';
        authLink.style.pointerEvents = 'none';
        if (currentUser.isAdmin) { adminLink.style.display = 'flex'; if (deleteBtn) deleteBtn.style.display = 'none'; }
        else { adminLink.style.display = 'none'; if (deleteBtn) deleteBtn.style.display = 'inline-flex'; }
    } else {
        authLink.innerHTML = '<span class="nav-icon">🔑</span>Войти';
        authLink.dataset.page = 'auth';
        authLink.style.pointerEvents = 'auto';
        adminLink.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    }
}

function updateProfile() {
    if (!currentUser) return;
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-rank').textContent = currentUser.rank || 'Игрок';
    document.getElementById('profile-avatar-letter').textContent = currentUser.username[0].toUpperCase();
    document.getElementById('profile-email').textContent = currentUser.email || 'не указан';
    document.getElementById('profile-reg-date').textContent = currentUser.regDate || '-';
    document.getElementById('profile-last-login').textContent = currentUser.lastLogin || '-';
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.admin-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById('admin-tab-' + tabName).classList.add('active');
    document.querySelector('.admin-tab-btn[onclick="switchAdminTab(\'' + tabName + '\')"]').classList.add('active');
    if (tabName === 'servers') renderServersList();
    if (tabName === 'settings') loadAdminSettings();
    if (tabName === 'users') renderUsersList();
    if (tabName === 'questions') renderAdminAllQuestions();
}

function renderServersList() {
    const container = document.getElementById('servers-list');
    if (!container) return;
    container.innerHTML = '';
    servers.forEach(function(server, idx) {
        const card = document.createElement('div');
        card.className = 'server-card' + (idx === currentServerIndex ? ' active' : '');
        const statusIcon = server.status === 'online' ? '🟢' : server.status === 'maintenance' ? '🟠' : '🔴';
        card.innerHTML = '<div class="server-info"><span class="server-icon">🌐</span><div><div class="server-name">' + escapeHtml(server.name) + '</div><div class="server-status-text">' + statusIcon + ' ' + server.status + '</div></div></div><div class="server-actions"><button class="btn btn-primary btn-sm" onclick="switchToServer(' + idx + ')">OK</button>' + (idx === 0 ? '' : '<button class="btn btn-danger btn-sm" onclick="deleteServer(' + idx + ')">🗑️</button>') + '</div>';
        container.appendChild(card);
    });
}

function switchToServer(idx) { loadServer(idx); renderServersList(); }

function deleteServer(idx) {
    if (servers.length <= 1) { alert('⚠️ 1+ ветка'); return; }
    if (!confirm('⚠️ Удалить?')) return;
    servers.splice(idx, 1);
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    if (currentServerIndex >= servers.length) currentServerIndex = 0;
    loadServer(currentServerIndex);
    renderServersList();
    renderServersPage();
}

function loadAdminSettings() {
    const server = servers[currentServerIndex];
    document.getElementById('admin-status').value = server.status;
    document.getElementById('admin-description').value = server.description;
    document.getElementById('admin-version').value = server.version;
    renderAdminIps();
    renderAdminBuilds();
}

function renderAdminIps() {
    const container = document.getElementById('admin-ips-list');
    if (!container) return;
    container.innerHTML = '';
    const server = servers[currentServerIndex];
    server.ips.forEach(function(item, idx) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.marginBottom = '10px';
        div.innerHTML = '<input type="text" class="form-input" value="' + escapeHtml(item.name) + '" data-idx="' + idx + '" data-field="name" style="flex:1;"><input type="text" class="form-input" value="' + escapeHtml(item.ip) + '" data-idx="' + idx + '" data-field="ip" style="flex:1;"><button class="btn btn-danger" onclick="removeIp(' + idx + ')">🗑️</button>';
        container.appendChild(div);
    });
}

function renderAdminBuilds() {
    const container = document.getElementById('admin-builds-list');
    if (!container) return;
    container.innerHTML = '';
    const server = servers[currentServerIndex];
    server.builds.forEach(function(item, idx) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.marginBottom = '10px';
        div.innerHTML = '<input type="text" class="form-input" value="' + escapeHtml(item.name) + '" data-idx="' + idx + '" data-field="name" style="flex:1;"><input type="text" class="form-input" value="' + escapeHtml(item.url) + '" data-idx="' + idx + '" data-field="url" style="flex:1;"><button class="btn btn-danger" onclick="removeBuild(' + idx + ')">🗑️</button>';
        container.appendChild(div);
    });
}

function addNewIpField() {
    servers[currentServerIndex].ips.push({ name: 'IP', ip: 'play.example.com' });
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    renderAdminIps();
}

function addNewBuildField() {
    servers[currentServerIndex].builds.push({ name: 'Сборка', url: 'https://example.com/build.zip' });
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    renderAdminBuilds();
}

function removeIp(idx) {
    const server = servers[currentServerIndex];
    if (server.ips.length <= 1) { alert('⚠️ 1+ IP'); return; }
    server.ips.splice(idx, 1);
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    renderAdminIps();
}

function removeBuild(idx) {
    const server = servers[currentServerIndex];
    if (server.builds.length <= 1) { alert('⚠️ 1+ сборка'); return; }
    server.builds.splice(idx, 1);
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    renderAdminBuilds();
}

function saveAdminSettings() {
    const server = servers[currentServerIndex];
    server.status = document.getElementById('admin-status').value;
    server.description = document.getElementById('admin-description').value.trim();
    server.version = document.getElementById('admin-version').value.trim();
    
    const ipInputs = document.querySelectorAll('#admin-ips-list input');
    const newIps = [];
    for (let i = 0; i < ipInputs.length; i += 2) {
        const nameInput = ipInputs[i];
        const ipInput = ipInputs[i + 1];
        if (nameInput && ipInput) {
            newIps.push({ name: nameInput.value, ip: ipInput.value });
        }
    }
    server.ips = newIps;
    
    const buildInputs = document.querySelectorAll('#admin-builds-list input');
    const newBuilds = [];
    for (let i = 0; i < buildInputs.length; i += 2) {
        const nameInput = buildInputs[i];
        const urlInput = buildInputs[i + 1];
        if (nameInput && urlInput) {
            newBuilds.push({ name: nameInput.value, url: urlInput.value });
        }
    }
    server.builds = newBuilds;
    
    localStorage.setItem('cristalhills_servers', JSON.stringify(servers));
    loadServer(currentServerIndex);
    
    const msgEl = document.getElementById('admin-save-msg');
    msgEl.textContent = '✅ Сохранено!';
    setTimeout(function() { msgEl.textContent = ''; }, 3000);
}

function renderUsersList() {
    const container = document.getElementById('users-list');
    if (!container) return;
    container.innerHTML = '';
    ADMINS.concat(users).forEach(function(u) {
        const isAdmin = ADMINS.find(function(a) { return a.username === u.username; });
        const isCurrentUser = currentUser && currentUser.username === u.username;
        const card = document.createElement('div');
        card.className = 'user-card' + (isAdmin ? ' admin' : '');
        card.dataset.username = u.username.toLowerCase();
        let actionsHtml = '';
        if (!isAdmin && !isCurrentUser) actionsHtml = '<div class="user-actions"><button class="btn btn-primary btn-sm" onclick="openPromoteModal(\'' + escapeHtml(u.username) + '\')">👑</button></div>';
        else if (isAdmin && u.rank !== 'Гл.Админ' && currentUser && currentUser.username !== u.username) actionsHtml = '<div class="user-actions"><button class="btn btn-danger btn-sm" onclick="demoteUser(\'' + escapeHtml(u.username) + '\')">⬇️</button></div>';
        card.innerHTML = '<div class="user-row"><span class="user-label">👤</span><span class="user-value">' + escapeHtml(u.username) + '</span></div><div class="user-row"><span class="user-label">🔑</span><span class="user-value">' + escapeHtml(u.password) + '</span></div><div class="user-row"><span class="user-label">📧</span><span class="user-value">' + escapeHtml(u.email || '-') + '</span></div><div class="user-row"><span class="user-label">🏷️</span><span class="user-value">' + (isAdmin ? u.rank : 'Игрок') + '</span></div>' + actionsHtml;
        container.appendChild(card);
    });
}

function demoteUser(username) {
    const idx = users.findIndex(function(u) { return u.username === username; });
    if (idx === -1) return;
    users[idx].rank = 'Игрок';
    localStorage.setItem('cristalhills_users', JSON.stringify(users));
    renderUsersList();
}

function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    document.querySelectorAll('.user-card').forEach(function(card) { card.style.display = card.dataset.username.indexOf(search) !== -1 ? 'grid' : 'none'; });
}

function openPromoteModal(username) { document.getElementById('promote-username').value = username; document.getElementById('promote-modal').classList.add('show'); }
function closePromoteModal() { document.getElementById('promote-modal').classList.remove('show'); }
function showAddServerModal() { document.getElementById('add-server-modal').classList.add('show'); }
function closeAddServerModal() { document.getElementById('add-server-modal').classList.remove('show'); document.getElementById('add-server-form').reset(); }

function renderAdminAllQuestions() {
    const container = document.getElementById('admin-all-questions');
    if (!container) return;
    container.innerHTML = '';
    const allQuestions = questions.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    if (allQuestions.length === 0) { container.innerHTML = '<div class="question-item placeholder"><p>Нет вопросов</p></div>'; return; }
    allQuestions.forEach(function(q) { container.appendChild(createQuestionCard(q)); });
}

function downloadBuild(url) { if (url) window.open(url, '_blank'); }

function renderQuestions() {
    const list = document.getElementById('questions-list');
    const adminList = document.getElementById('admin-questions-list');
    if (!list || !adminList) return;
    const myQuestions = currentUser ? questions.filter(function(q) { return q.author === currentUser.username; }) : [];
    const allQuestions = questions.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    list.innerHTML = myQuestions.length ? '' : '<div class="question-item placeholder"><p>📭</p></div>';
    adminList.innerHTML = allQuestions.length ? '' : '<div class="question-item placeholder"><p>📥</p></div>';
    myQuestions.forEach(function(q) { if (!q.closed) list.appendChild(createQuestionCard(q)); });
    if (currentUser && currentUser.isAdmin) allQuestions.filter(function(q) { return !q.closed; }).forEach(function(q) { adminList.appendChild(createQuestionCard(q)); });
}

function createQuestionCard(q) {
    const card = document.createElement('div');
    card.className = 'question-item';
    if (q.isUrgent) card.classList.add('urgent');
    if (q.closed) card.classList.add('closed');
    const statusClass = q.closed ? 'status-closed' : (q.answer || (q.answers && q.answers.length > 0) ? 'status-answered' : 'status-open');
    const statusText = q.closed ? '✅' : (q.answer || (q.answers && q.answers.length > 0) ? '💬' : '⏳');
    card.innerHTML = '<div class="question-row"><div class="question-title">' + escapeHtml(q.title) + '</div><span class="status ' + statusClass + '">' + statusText + '</span></div><div class="question-details">' + escapeHtml(q.author) + ' • ' + q.date + '</div>';
    card.onclick = function() { openQuestionView(q.id); };
    return card;
}

function showNewQuestionModal() { if (!currentUser) { alert('⚠️ Войдите'); navigateTo('auth'); return; } document.getElementById('new-question-modal').classList.add('show'); }
function closeModal() { document.getElementById('new-question-modal').classList.remove('show'); }

function handleQuestionSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('question-title').value.trim();
    const category = document.getElementById('question-category').value;
    const text = document.getElementById('question-text').value.trim();
    if (!currentUser) return;
    questions.push({ id: Date.now(), author: currentUser.username, title: title, category: category, text: text, date: new Date().toLocaleString(), answer: null, answerBy: null, answers: [], isUrgent: category === 'password', closed: false });
    localStorage.setItem('cristalhills_questions', JSON.stringify(questions));
    closeModal();
    renderQuestions();
}

function openQuestionView(id) {
    const q = questions.find(function(x) { return x.id === id; });
    if (!q) return;
    document.getElementById('view-question-title').textContent = q.title;
    document.getElementById('view-question-author').textContent = q.author;
    document.getElementById('view-question-date').textContent = q.date;
    document.getElementById('view-question-category').textContent = getCategoryName(q.category);
    document.getElementById('view-question-text').textContent = q.text;
    document.getElementById('view-question-status-badge').classList.toggle('show', q.isUrgent);
    const answersList = document.getElementById('view-question-answers');
    answersList.innerHTML = '';
    if (q.answers && q.answers.length > 0) {
        q.answers.forEach(function(ans) {
            const div = document.createElement('div');
            div.className = 'answer-item';
            div.innerHTML = '<div class="answer-meta">' + escapeHtml(ans.by) + '</div><div>' + escapeHtml(ans.text) + '</div>';
            answersList.appendChild(div);
        });
    } else if (q.answer) {
        const div = document.createElement('div');
        div.className = 'answer-item';
        div.innerHTML = '<div class="answer-meta">' + escapeHtml(q.answerBy || 'Админ') + '</div><div>' + escapeHtml(q.answer) + '</div>';
        answersList.appendChild(div);
    } else {
        answersList.innerHTML = '<p class="no-answer">⏳</p>';
    }
    const answerForm = document.getElementById('admin-answer-form');
    const playerComplete = document.getElementById('player-complete-section');
    if (currentUser && currentUser.isAdmin) { answerForm.style.display = 'block'; playerComplete.style.display = 'none'; }
    else if (currentUser && q.author === currentUser.username && !q.closed) { answerForm.style.display = 'none'; playerComplete.style.display = 'block'; }
    else { answerForm.style.display = 'none'; playerComplete.style.display = 'none'; }
    document.getElementById('view-question-modal').classList.add('show');
    window.currentViewQuestionId = id;
}

function closeViewModal() { document.getElementById('view-question-modal').classList.remove('show'); renderQuestions(); }

function submitAnswer() {
    const text = document.getElementById('answer-text').value.trim();
    const id = window.currentViewQuestionId;
    if (!text || !id) return;
    const q = questions.find(function(x) { return x.id === id; });
    if (!q) return;
    if (!q.answers) q.answers = [];
    q.answers.push({ text: text, by: currentUser.username, date: new Date().toLocaleString() });
    localStorage.setItem('cristalhills_questions', JSON.stringify(questions));
    document.getElementById('answer-text').value = '';
    openQuestionView(id);
}

function completeQuestion() { const id = window.currentViewQuestionId; if (!id) return; const q = questions.find(function(x) { return x.id === id; }); if (!q) return; q.closed = true; localStorage.setItem('cristalhills_questions', JSON.stringify(questions)); closeViewModal(); }
function playerCompleteQuestion() { const id = window.currentViewQuestionId; if (!id) return; const q = questions.find(function(x) { return x.id === id; }); if (!q || q.author !== currentUser.username) return; q.closed = true; localStorage.setItem('cristalhills_questions', JSON.stringify(questions)); closeViewModal(); }

function showForgotPassword() { document.getElementById('forgot-card').style.display = 'block'; document.querySelector('#auth-page .auth-card:first-of-type').style.display = 'none'; document.getElementById('register-card').style.display = 'none'; }
function showRegister() { document.getElementById('register-card').style.display = 'block'; document.querySelector('#auth-page .auth-card:first-of-type').style.display = 'none'; document.getElementById('forgot-card').style.display = 'none'; }
function showLogin() { document.getElementById('register-card').style.display = 'none'; document.getElementById('forgot-card').style.display = 'none'; document.querySelector('#auth-page .auth-card:first-of-type').style.display = 'block'; }

function changePassword() {
    if (!currentUser) return;
    const newPass = prompt('🔑 Новый пароль:');
    if (!newPass || newPass.length < 4) return;
    const idx = users.findIndex(function(u) { return u.username === currentUser.username; });
    if (idx !== -1) { users[idx].password = newPass; currentUser.password = newPass; localStorage.setItem('cristalhills_users', JSON.stringify(users)); localStorage.setItem('cristalhills_current', JSON.stringify(currentUser)); alert('✅'); }
}

function deleteAccount() { if (!currentUser || currentUser.isAdmin) return; if (!confirm('⚠️')) return; users = users.filter(function(u) { return u.username !== currentUser.username; }); localStorage.setItem('cristalhills_users', JSON.stringify(users)); logout(); }

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function getCategoryName(cat) { const map = { technical: '🔧', gameplay: '🎮', donation: '💎', other: '❓', password: '🔑' }; return map[cat] || cat; }

function copyIP(ip) {
    navigator.clipboard.writeText(ip).then(function() {
        const msg = document.getElementById('ip-copy-msg');
        msg.textContent = '✅ IP скопирован: ' + ip;
        setTimeout(function() { msg.textContent = ''; }, 4000);
    });
}