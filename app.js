// --- Password Hashing ---
function hashPassword(password) {
    let hash = 0;
    if (password.length === 0) return hash.toString();
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// --- Password Validation ---
function validatePassword(password) {
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: 'Password strength: Good' };
}

// --- Username Validation ---
function validateUsername(username) {
    if (username.length < 3) {
        return { valid: false, message: 'Username must be at least 3 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { valid: false, message: 'Username can only contain letters, numbers, underscore, and dash' };
    }
    return { valid: true, message: 'Username is valid' };
}

// --- Storage ---
function getSafeStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        console.error("Storage error:", e);
        return [];
    }
}

const State = {
    users: getSafeStorage('users'),
    expenses: getSafeStorage('expenses'),
    chores: getSafeStorage('chores'),
    messages: getSafeStorage('messages'),
    activityLog: getSafeStorage('activityLog')
};

function saveState(key) {
    localStorage.setItem(key, JSON.stringify(State[key]));
    updateDashboard();
}

function logActivity(action, details) {
    const logEntry = {
        id: Date.now(),
        user: currentUser ? currentUser.username : 'System',
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    };
    State.activityLog.push(logEntry);
    localStorage.setItem('activityLog', JSON.stringify(State.activityLog));
}

let currentUser = null;

// --- Notifications ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showAuthError(message) {
    const authBox = document.querySelector('.auth-box');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    authBox.insertBefore(errorDiv, authBox.querySelector('form'));
}

// --- Authentication ---
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForm = document.getElementById('auth-form');
const switchAuthLink = document.getElementById('switch-auth');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');

let isLoginMode = true;

const sessionUser = sessionStorage.getItem('currentUser');
if (sessionUser) {
    currentUser = JSON.parse(sessionUser);
    showApp();
}

switchAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authSubtitle.textContent = 'Log in to manage your pad';
        authSubmitBtn.innerHTML = '<span>Access Application</span> <i class="fas fa-arrow-right"></i>';
        switchAuthLink.textContent = 'Create an account';
        switchAuthLink.parentElement.firstChild.textContent = 'New roommate? ';
        document.getElementById('password-strength-info').innerHTML = '';
    } else {
        authSubtitle.textContent = 'Create a new account';
        authSubmitBtn.innerHTML = '<span>Register Profile</span> <i class="fas fa-user-plus"></i>';
        switchAuthLink.textContent = 'Login here';
        switchAuthLink.parentElement.firstChild.textContent = 'Already registered? ';
    }
});

document.getElementById('auth-password').addEventListener('input', (e) => {
    const password = e.target.value;
    const strengthDiv = document.getElementById('password-strength-info');
    
    if (!isLoginMode && password.length > 0) {
        const validation = validatePassword(password);
        if (validation.valid) {
            strengthDiv.innerHTML = '<div class="password-strength strong"><i class="fas fa-check-circle"></i> Strong password</div>';
        } else {
            strengthDiv.innerHTML = `<div class="password-strength weak"><i class="fas fa-exclamation-circle"></i> ${validation.message}</div>`;
        }
    } else {
        strengthDiv.innerHTML = '';
    }
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    document.querySelectorAll('.auth-error').forEach(el => el.remove());

    if (!username || !password) {
        showAuthError('Please fill in all fields');
        return;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        showAuthError(usernameValidation.message);
        return;
    }

    if (isLoginMode) {
        const hashedPassword = hashPassword(password);
        const user = State.users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.passwordHash === hashedPassword
        );
        
        if (user) {
            currentUser = { username: user.username };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast(`Welcome back, ${currentUser.username}!`);
            showApp();
        } else {
            showAuthError('Invalid username or password');
        }
    } else {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            showAuthError(passwordValidation.message);
            return;
        }

        if (State.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            showAuthError('Username already taken!');
            return;
        }

        const newUser = { 
            username, 
            passwordHash: hashPassword(password),
            createdAt: new Date().toISOString()
        };
        State.users.push(newUser);
        saveState('users');
        
        currentUser = { username: newUser.username };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('Account created successfully!');
        showApp();
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    
    appSection.classList.add('hidden');
    appSection.classList.remove('fade-in-up');
    authSection.classList.remove('hidden');
    
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    showToast('Logged out successfully');
});

function showApp() {
    authSection.classList.add('fade-out');
    appSection.classList.remove('hidden');
    appSection.classList.add('fade-in-up');
    
    setTimeout(() => {
        authSection.classList.add('hidden');
        authSection.classList.remove('fade-out');
    }, 400);

    document.getElementById('current-user-display').innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.username}`;
    document.getElementById('welcome-message').textContent = `Welcome back, ${currentUser.username}!`;
    
    renderExpenses();
    renderChores();
    renderMessages();
    renderActivity();
    updateDashboard();
}

// --- Navigation ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        navigateTo(targetId);
    });
});

window.navigateTo = function(sectionId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.getAttribute('data-target') === sectionId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

// --- Dashboard ---
function updateDashboard() {
    if(!currentUser) return;
    
    const totalExp = State.expenses.reduce((sum, e) => sum + e.price, 0);
    document.getElementById('dash-expenses').textContent = `Rs ${totalExp.toFixed(0)}`;
    
    const pendingChores = State.chores.filter(c => c.partner.toLowerCase() === currentUser.username.toLowerCase() && !c.isDone).length;
    document.getElementById('dash-chores').textContent = pendingChores;
    
    document.getElementById('dash-messages').textContent = State.messages.length;
}

// --- Form Validation ---
function clearFormErrors(formId) {
    document.querySelectorAll(`#${formId} .form-error`).forEach(el => el.remove());
}

function showFormError(formId, fieldLabel, errorMsg) {
    const form = document.getElementById(formId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> <strong>${fieldLabel}:</strong> ${errorMsg}`;
    form.insertBefore(errorDiv, form.firstChild);
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function validateExpenseForm() {
    const item = document.getElementById('expense-item').value.trim();
    const price = parseFloat(document.getElementById('expense-price').value);
    
    clearFormErrors('expense-form');
    if (!item) {
        showFormError('expense-form', 'Item', 'Please enter the item');
        return false;
    }
    if (item.length > 100) {
        showFormError('expense-form', 'Item', 'Too long (max 100 characters)');
        return false;
    }
    if (isNaN(price) || price <= 0) {
        showFormError('expense-form', 'Price', 'Please enter a valid amount');
        return false;
    }
    if (price > 1000000) {
        showFormError('expense-form', 'Price', 'Too large (max 1,000,000)');
        return false;
    }
    return true;
}

function validateChoreForm() {
    const partner = document.getElementById('chore-partner').value.trim();
    const desc = document.getElementById('chore-desc').value.trim();
    const time = document.getElementById('chore-time').value;
    
    clearFormErrors('chore-form');
    if (!partner) {
        showFormError('chore-form', 'Partner', 'Please enter roommate name');
        return false;
    }
    if (partner.length > 50) {
        showFormError('chore-form', 'Partner', 'Name too long');
        return false;
    }
    if (!desc) {
        showFormError('chore-form', 'Description', 'Please describe the chore');
        return false;
    }
    if (desc.length > 200) {
        showFormError('chore-form', 'Description', 'Too long (max 200 characters)');
        return false;
    }
    if (!time) {
        showFormError('chore-form', 'Time', 'Please select a time');
        return false;
    }
    return true;
}

function validateChatForm() {
    const text = document.getElementById('chat-text').value.trim();
    
    clearFormErrors('chat-form');
    if (!text) {
        showFormError('chat-form', 'Message', 'Please type a message');
        return false;
    }
    if (text.length > 500) {
        showFormError('chat-form', 'Message', 'Too long (max 500 characters)');
        return false;
    }
    return true;
}

// --- Expenses ---
const expenseForm = document.getElementById('expense-form');
const expenseSummaries = document.getElementById('expense-summaries');

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser || !validateExpenseForm()) return;
    
    const partner = currentUser.username; 
    const item = document.getElementById('expense-item').value.trim();
    const price = parseFloat(document.getElementById('expense-price').value);

    State.expenses.push({ id: Date.now(), partner, item, price, createdBy: currentUser.username, createdAt: new Date().toISOString() });
    saveState('expenses');
    logActivity('expense_added', { item, price, partner });
    
    document.getElementById('expense-item').value = '';
    document.getElementById('expense-price').value = '';
    clearFormErrors('expense-form');
    
    showToast('Expense added successfully!');
    renderExpenses();
});

document.getElementById('settle-up-btn').addEventListener('click', () => {
    const settlements = calculateSettlement();
    
    if (settlements.length === 0) {
        showToast('No unsettled balances. Everyone is even!', 'success');
        return;
    }
    
    let settlementText = 'Settlement Details:\n\n';
    settlements.forEach(s => {
        settlementText += `${s.from} owes ${s.to}: Rs ${s.amount.toFixed(2)}\n`;
    });
    settlementText += '\n\nClick OK to clear all expenses after settlement.';
    
    if(confirm(settlementText)) {
        State.expenses = [];
        saveState('expenses');
        renderExpenses();
        showToast('All expenses cleared and settled!');
    }
});

function renderExpenses() {
    expenseSummaries.innerHTML = '';
    
    const grouped = State.expenses.reduce((acc, exp) => {
        if (!acc[exp.partner]) acc[exp.partner] = { total: 0, items: [] };
        acc[exp.partner].items.push(exp);
        acc[exp.partner].total += exp.price;
        return acc;
    }, {});

    if (Object.keys(grouped).length === 0) {
        expenseSummaries.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fas fa-box-open fa-3x" style="opacity:0.2; margin-bottom: 1rem; display:block;"></i> No expenses recorded yet.</div>';
        return;
    }

    let grandTotal = 0;

    for (const [partner, data] of Object.entries(grouped)) {
        grandTotal += data.total;
        const card = document.createElement('div');
        card.className = 'partner-card';
        
        let itemsHtml = data.items.map(exp => {
            const isOwner = exp.createdBy === currentUser.username || exp.partner === currentUser.username;
            const deleteBtn = isOwner ? `<button class="btn-delete" onclick="deleteExpense(${exp.id})" title="Remove"><i class="fas fa-times"></i></button>` : '';
            
            return `
                <li>
                    <span>${exp.item}</span>
                    <span style="display:flex; align-items:center; gap:10px;">
                        <strong>Rs ${exp.price.toFixed(2)}</strong>
                        ${deleteBtn}
                    </span>
                </li>
            `;
        }).join('');

        card.innerHTML = `
            <div class="partner-header">
                <h4><i class="fas fa-user-circle"></i> ${partner}</h4>
                <div class="total-amount">Rs ${data.total.toFixed(2)}</div>
            </div>
            <ul class="item-list">
                ${itemsHtml}
            </ul>
        `;
        expenseSummaries.appendChild(card);
    }

    const grandTotalCard = document.createElement('div');
    grandTotalCard.className = 'partner-card';
    grandTotalCard.style.background = 'linear-gradient(135deg, var(--blue), var(--primary))';
    grandTotalCard.style.color = 'white';
    grandTotalCard.style.border = 'none';
    grandTotalCard.style.marginTop = '1rem';
    grandTotalCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.25rem; font-weight: 800;">
            <span><i class="fas fa-calculator"></i> Grand Total</span>
            <span>Rs ${grandTotal.toFixed(2)}</span>
        </div>
    `;
    expenseSummaries.appendChild(grandTotalCard);
    
    const settlements = calculateSettlement();
    const settlementDiv = document.getElementById('settlement-summary');
    
    if (settlements.length > 0) {
        let settlementHtml = '<div class="settlement-card"><h3><i class="fas fa-handshake"></i> Settlement Needed</h3><ul style="list-style:none; padding:0;">';
        settlements.forEach(s => {
            settlementHtml += `<li style="padding:0.75rem 0; border-bottom:1px dashed var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                <span><strong>${s.from}</strong> → <strong>${s.to}</strong></span>
                <span style="background:var(--red); color:white; padding:0.35rem 0.75rem; border-radius:999px; font-weight:600;">Rs ${s.amount.toFixed(2)}</span>
            </li>`;
        });
        settlementHtml += '</ul></div>';
        settlementDiv.innerHTML = settlementHtml;
    } else {
        settlementDiv.innerHTML = State.expenses.length > 0 ? '<div style="text-align:center; padding:1rem; background:#DCFCE7; border-radius:1rem; color:var(--green);"><i class="fas fa-check-circle"></i> All settled! Everyone is even.</div>' : '';
    }
}

function calculateSettlement() {
    const balances = {};
    
    State.expenses.forEach(exp => {
        if (!balances[exp.partner]) balances[exp.partner] = 0;
        balances[exp.partner] += exp.price;
    });
    
    const peopleCount = Object.keys(balances).length;
    if (peopleCount === 0) return [];
    
    const totalExpenses = Object.values(balances).reduce((sum, b) => sum + b, 0);
    const fairShare = totalExpenses / peopleCount;
    
    const settlements = [];
    const debtors = [];
    const creditors = [];
    
    for (const [person, balance] of Object.entries(balances)) {
        const difference = balance - fairShare;
        if (difference > 0.01) {
            creditors.push({ person, amount: difference });
        } else if (difference < -0.01) {
            debtors.push({ person, amount: Math.abs(difference) });
        }
    }
    
    for (const debtor of debtors) {
        for (const creditor of creditors) {
            if (debtor.amount > 0.01 && creditor.amount > 0.01) {
                const settlement = Math.min(debtor.amount, creditor.amount);
                settlements.push({
                    from: debtor.person,
                    to: creditor.person,
                    amount: settlement
                });
                debtor.amount -= settlement;
                creditor.amount -= settlement;
            }
        }
    }
    
    return settlements;
}

window.deleteExpense = function(id) {
    const expense = State.expenses.find(e => e.id == id);
    State.expenses = State.expenses.filter(e => e.id != id);
    saveState('expenses');
    logActivity('expense_deleted', { item: expense.item, price: expense.price });
    showToast('Expense removed');
    renderExpenses();
}

window.calculateSettlement = calculateSettlement;

// --- Chores ---
const choreForm = document.getElementById('chore-form');
const choreList = document.getElementById('chore-list');
let editingChoreId = null;

choreForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser || !validateChoreForm()) return;

    const partner = document.getElementById('chore-partner').value.trim();
    const desc = document.getElementById('chore-desc').value.trim();
    const time = document.getElementById('chore-time').value;

    if (editingChoreId) {
        const index = State.chores.findIndex(c => c.id == editingChoreId);
        if (index !== -1) {
            State.chores[index] = { ...State.chores[index], partner, desc, time, updatedAt: new Date().toISOString() };
        }
        editingChoreId = null;
        document.querySelector('#chore-form button').innerHTML = 'Add to Roster';
        logActivity('chore_updated', { partner, desc, time });
        showToast('Chore updated successfully!');
    } else {
        State.chores.push({ id: Date.now(), partner, desc, time, createdBy: currentUser.username, isDone: false, createdAt: new Date().toISOString() });
        logActivity('chore_assigned', { partner, desc, time });
        showToast('Chore assigned!');
    }
    
    saveState('chores');
    clearFormErrors('chore-form');
    document.getElementById('chore-desc').value = '';
    renderChores();
});

function renderChores() {
    choreList.innerHTML = '';
    
    if (State.chores.length === 0) {
        choreList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-glass-cheers fa-2x" style="opacity:0.3; display:block; margin-bottom:1rem;"></i> All clear! No chores assigned.</td></tr>';
        return;
    }

    State.chores.forEach(chore => {
        const tr = document.createElement('tr');
        if(chore.isDone) tr.classList.add('done');
        
        const isOwner = chore.createdBy === currentUser.username;
        const isAssignee = chore.partner.toLowerCase() === currentUser.username.toLowerCase();
        
        const canCheck = isOwner || isAssignee;
        const checkAction = canCheck ? `<input type="checkbox" class="checkbox-custom" onchange="toggleChore(${chore.id})" ${chore.isDone ? 'checked' : ''}>` : `<i class="fas fa-lock" style="color:#ccc"></i>`;

        const actions = isOwner ? `
            <button class="btn-icon" onclick="editChore(${chore.id})" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" style="margin-left:5px;" onclick="deleteChore(${chore.id})" title="Delete"><i class="fas fa-trash"></i></button>
        ` : `<span style="font-size: 0.8rem; color: var(--text-muted)"><i class="fas fa-lock"></i> Locked</span>`;

        tr.innerHTML = `
            <td style="text-align:center;">${checkAction}</td>
            <td><span class="time-badge">${chore.time}</span></td>
            <td>${chore.desc}</td>
            <td><strong>${chore.partner}</strong></td>
            <td>${actions}</td>
        `;
        choreList.appendChild(tr);
    });
}

window.toggleChore = function(id) {
    const chore = State.chores.find(c => c.id == id);
    if(chore) {
        chore.isDone = !chore.isDone;
        saveState('chores');
        logActivity('chore_toggled', { desc: chore.desc, isDone: chore.isDone });
        renderChores();
        if(chore.isDone) showToast('Great job finishing your chore!');
    }
}

window.editChore = function(id) {
    const chore = State.chores.find(c => c.id == id);
    if (chore && chore.createdBy === currentUser.username) {
        document.getElementById('chore-partner').value = chore.partner;
        document.getElementById('chore-desc').value = chore.desc;
        document.getElementById('chore-time').value = chore.time;
        
        editingChoreId = id;
        document.querySelector('#chore-form button').innerHTML = '<i class="fas fa-save"></i> Update Chore';
        document.getElementById('chore-form').scrollIntoView({ behavior: 'smooth' });
    }
}

window.deleteChore = function(id) {
    const chore = State.chores.find(c => c.id == id);
    State.chores = State.chores.filter(c => c.id != id);
    saveState('chores');
    logActivity('chore_deleted', { desc: chore.desc });
    showToast('Chore deleted');
    
    if (editingChoreId == id) {
        editingChoreId = null;
        document.querySelector('#chore-form button').innerHTML = 'Add to Roster';
        choreForm.reset();
    }
    renderChores();
}

// --- Chat ---
const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser || !validateChatForm()) return;

    const text = document.getElementById('chat-text').value.trim();

    const msg = {
        id: Date.now(),
        sender: currentUser.username,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
    };
    State.messages.push(msg);
    saveState('messages');
    document.getElementById('chat-text').value = '';
    clearFormErrors('chat-form');
    renderMessages();
});

function renderMessages() {
    chatMessages.innerHTML = '';
    
    if (State.messages.length === 0) {
        chatMessages.innerHTML = '<div style="text-align:center; color: var(--text-muted); margin-top: auto; margin-bottom: auto;"><i class="fas fa-comments fa-3x" style="opacity:0.2; display:block; margin-bottom:1rem;"></i> Start the conversation!</div>';
        return;
    }

    const sortedMessages = [...State.messages].sort((a, b) => new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time));

    sortedMessages.forEach(msg => {
        const isSelf = currentUser && msg.sender === currentUser.username;
        const div = document.createElement('div');
        div.className = `message ${isSelf ? 'self' : ''}`;
        
        div.innerHTML = `
            <div class="message-sender">${msg.sender}</div>
            <div class="message-text">${msg.text}</div>
            <div class="message-time">${msg.time}</div>
        `;
        chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Activity ---
function renderActivity() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    const sortedActivities = [...State.activityLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedActivities.length === 0) {
        activityList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fas fa-inbox fa-3x" style="opacity:0.2; margin-bottom: 1rem; display:block;"></i> No activities yet.</div>';
        return;
    }
    
    const last100 = sortedActivities.slice(0, 100);
    last100.forEach(log => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        
        const actionLabel = {
            'expense_added': '💰 Added Expense',
            'expense_deleted': '💰 Deleted Expense',
            'chore_assigned': '✓ Assigned Chore',
            'chore_updated': '✓ Updated Chore',
            'chore_toggled': '✓ Completed Chore',
            'chore_deleted': '✓ Deleted Chore',
        };
        
        const time = new Date(log.timestamp).toLocaleString();
        
        let details = '';
        if (log.details) {
            const detailsList = Object.entries(log.details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
            details = `<div class="activity-details">${detailsList}</div>`;
        }
        
        div.innerHTML = `
            <div class="activity-header">
                <span class="activity-action">${actionLabel[log.action] || log.action}</span>
                <span class="activity-user">${log.user}</span>
                <span class="activity-time">${time}</span>
            </div>
            ${details}
        `;
        
        activityList.appendChild(div);
    });
}

window.renderActivity = renderActivity;

// --- Data Export ---
function exportAllData() {
    const backup = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: {
            users: State.users.map(u => ({ username: u.username, createdAt: u.createdAt })),
            expenses: State.expenses,
            chores: State.chores,
            messages: State.messages
        }
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `our-home-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Data backup downloaded successfully!');
}

window.exportAllData = exportAllData;

const backupBtn = document.getElementById('backup-btn');
if (backupBtn) {
    backupBtn.addEventListener('click', () => {
        exportAllData();
    });
}

// --- Reports ---
function generateMonthlyReport(monthStr) {
    const [year, month] = monthStr.split('-');
    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    
    const monthlyExpenses = State.expenses.filter(exp => {
        const expDate = new Date(exp.createdAt || exp.id);
        return expDate.getMonth() + 1 === targetMonth && expDate.getFullYear() === targetYear;
    });
    
    const summary = document.getElementById('report-summary');
    const breakdown = document.getElementById('report-breakdown');
    
    if (monthlyExpenses.length === 0) {
        summary.innerHTML = '<div style="padding: 2rem; text-align: center;"><i class="fas fa-inbox fa-3x" style="opacity:0.2; display:block; margin-bottom:1rem;"></i><p>No expenses in this month</p></div>';
        breakdown.innerHTML = '';
        return;
    }
    
    const totalAmount = monthlyExpenses.reduce((sum, exp) => sum + exp.price, 0);
    const byPerson = {};
    
    monthlyExpenses.forEach(exp => {
        if (!byPerson[exp.partner]) {
            byPerson[exp.partner] = { total: 0, count: 0, items: [] };
        }
        byPerson[exp.partner].total += exp.price;
        byPerson[exp.partner].count += 1;
        byPerson[exp.partner].items.push(exp);
    });
    
    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    summary.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">Rs ${totalAmount.toFixed(2)}</div>
            <div style="color: var(--text-muted); margin-bottom: 1rem;">Total Expenses - ${monthName}</div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">${monthlyExpenses.length} transactions</div>
        </div>
    `;
    
    breakdown.innerHTML = '';
    for (const [person, data] of Object.entries(byPerson)) {
        const card = document.createElement('div');
        card.className = 'partner-card';
        
        const itemsHtml = data.items.map(exp => `
            <li>
                <span>${exp.item}</span>
                <span style="display:flex; align-items:center; gap:10px;">
                    <strong>Rs ${exp.price.toFixed(2)}</strong>
                </span>
            </li>
        `).join('');
        
        card.innerHTML = `
            <div class="partner-header">
                <h4><i class="fas fa-user-circle"></i> ${person}</h4>
                <div class="total-amount">Rs ${data.total.toFixed(2)}</div>
            </div>
            <ul class="item-list">
                ${itemsHtml}
            </ul>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); font-size: 0.9rem; color: var(--text-muted);">
                Average per transaction: Rs ${(data.total / data.count).toFixed(2)}
            </div>
        `;
        breakdown.appendChild(card);
    }
}

window.generateMonthlyReport = generateMonthlyReport;

document.getElementById('report-month').valueAsDate = new Date();

document.getElementById('report-filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const month = document.getElementById('report-month').value;
    if (month) {
        generateMonthlyReport(month);
    }
});

// --- Dark Mode ---
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const savedTheme = localStorage.getItem('theme') || 'light';

if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
}

themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    themeToggleBtn.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    showToast(`Switched to ${isDarkMode ? 'dark' : 'light'} mode`);
});

// --- Profiles ---
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const saveProfileBtn = document.getElementById('save-profile-btn');

if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        const user = State.users.find(u => u.username === currentUser.username);
        const userActivities = State.activityLog.filter(log => log.user === currentUser.username).length;
        
        document.getElementById('profile-username').textContent = currentUser.username;
        document.getElementById('profile-joined').textContent = new Date(user.createdAt).toLocaleDateString();
        document.getElementById('profile-activities').textContent = userActivities;
        
        if (user.avatarColor) {
            document.getElementById('user-avatar').style.color = user.avatarColor;
            document.querySelectorAll('.avatar-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.color === user.avatarColor) {
                    btn.classList.add('selected');
                }
            });
        }
        
        profileModal.classList.remove('hidden');
    });
}

closeProfileModal.addEventListener('click', () => {
    profileModal.classList.add('hidden');
});

profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.classList.add('hidden');
    }
});

document.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('user-avatar').style.color = btn.dataset.color;
    });
});

saveProfileBtn.addEventListener('click', () => {
    const selectedColor = document.querySelector('.avatar-btn.selected')?.dataset.color;
    const user = State.users.find(u => u.username === currentUser.username);
    if (user && selectedColor) {
        user.avatarColor = selectedColor;
        saveState('users');
        
        document.getElementById('current-user-display').style.color = selectedColor;
        profileModal.classList.add('hidden');
        showToast('Profile updated successfully!');
    }
});

// Initialize
if (currentUser) {
    showApp();
}


// =====================================================
// === SHARED EXPENSES & BILLING SYSTEM ===
// =====================================================

// Add sharedExpenses to State
if (!State.sharedExpenses) {
    State.sharedExpenses = getSafeStorage('sharedExpenses');
}
if (!State.payments) {
    State.payments = getSafeStorage('payments');
}

// Receipt storage (base64)
let currentReceiptData = null;

function previewReceipt(input) {
    const preview = document.getElementById('receipt-preview');
    const previewImg = document.getElementById('receipt-img');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            currentReceiptData = e.target.result; // Store base64
        };
        
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
        currentReceiptData = null;
    }
}

// Add Shared Expense
const sharedExpenseForm = document.getElementById('shared-expense-form');
if (sharedExpenseForm) {
    sharedExpenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        
        const item = document.getElementById('shared-item').value.trim();
        const amount = parseFloat(document.getElementById('shared-amount').value);
        const category = document.getElementById('shared-category').value;
        const notes = document.getElementById('shared-notes').value.trim();
        
        if (!item || isNaN(amount) || amount <= 0) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const sharedExpense = {
            id: Date.now(),
            item,
            amount,
            category,
            notes,
            receipt: currentReceiptData,
            addedBy: currentUser.username,
            date: new Date().toISOString(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        };
        
        State.sharedExpenses.push(sharedExpense);
        saveState('sharedExpenses');
        logActivity('shared_expense_added', { item, amount, category });
        
        // Reset form
        sharedExpenseForm.reset();
        document.getElementById('receipt-preview').style.display = 'none';
        currentReceiptData = null;
        
        showToast('✅ Shared expense added successfully!');
        renderSharedExpenses();
        updateBillingSummary();
    });
}

// Render Shared Expenses Table
function renderSharedExpenses() {
    const list = document.getElementById('shared-expenses-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const filter = document.getElementById('expense-filter').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filtered = State.sharedExpenses.filter(exp => {
        const matchesSearch = exp.item.toLowerCase().includes(filter) || 
                             exp.notes.toLowerCase().includes(filter);
        const matchesCategory = !categoryFilter || exp.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No expenses found</td></tr>';
        return;
    }
    
    filtered.forEach(exp => {
        const date = new Date(exp.date).toLocaleDateString();
        const categoryEmoji = {
            'Groceries': '🛒',
            'Utilities': '⚡',
            'Rent': '🏠',
            'Internet': '📡',
            'Maintenance': '🔧',
            'Cleaning': '🧹',
            'Food': '🍜',
            'Other': '📝'
        };
        
        const canDelete = exp.addedBy === currentUser.username;
        const deleteBtn = canDelete ? `<button class="btn-delete" onclick="deleteSharedExpense(${exp.id})" title="Delete"><i class="fas fa-trash"></i></button>` : '';
        const receiptBtn = exp.receipt ? `<button class="receipt-download-btn" onclick="downloadReceipt(${exp.id})" title="Download Receipt"><i class="fas fa-image"></i> Receipt</button>` : '';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td><strong>${exp.item}</strong></td>
            <td>${categoryEmoji[exp.category] || '📝'} ${exp.category}</td>
            <td><strong style="color: var(--green);">Rs ${exp.amount.toFixed(2)}</strong></td>
            <td>${exp.addedBy}</td>
            <td>
                <button class="btn-icon" onclick="showExpenseDetails(${exp.id})" title="View Details"><i class="fas fa-eye"></i></button>
                ${receiptBtn}
                ${deleteBtn}
            </td>
        `;
        list.appendChild(tr);
    });
}

// Show Expense Details (with modal)
window.showExpenseDetails = function(id) {
    const exp = State.sharedExpenses.find(e => e.id == id);
    if (!exp) return;
    
    let content = `
        <strong>Item:</strong> ${exp.item}<br>
        <strong>Amount:</strong> Rs ${exp.amount.toFixed(2)}<br>
        <strong>Category:</strong> ${exp.category}<br>
        <strong>Added By:</strong> ${exp.addedBy}<br>
        <strong>Date:</strong> ${new Date(exp.date).toLocaleString()}<br>
    `;
    
    if (exp.notes) {
        content += `<strong>Notes:</strong> ${exp.notes}<br>`;
    }
    
    if (exp.receipt) {
        content += `<strong>Receipt:</strong><br><img src="${exp.receipt}" style="max-width: 200px; max-height: 200px; border-radius: 0.5rem; margin-top: 0.5rem;">`;
    }
    
    alert(content);
};

// Delete Shared Expense
window.deleteSharedExpense = function(id) {
    if (!confirm('Delete this expense?')) return;
    
    const exp = State.sharedExpenses.find(e => e.id == id);
    if (exp.addedBy !== currentUser.username) {
        showToast('You can only delete your own expenses', 'error');
        return;
    }
    
    State.sharedExpenses = State.sharedExpenses.filter(e => e.id != id);
    saveState('sharedExpenses');
    logActivity('shared_expense_deleted', { item: exp.item, amount: exp.amount });
    
    showToast('Expense deleted');
    renderSharedExpenses();
    updateBillingSummary();
};

// Download Receipt
window.downloadReceipt = function(id) {
    const exp = State.sharedExpenses.find(e => e.id == id);
    if (!exp || !exp.receipt) return;
    
    const link = document.createElement('a');
    link.href = exp.receipt;
    link.download = `Receipt_${exp.item}_${new Date(exp.date).toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Receipt downloaded');
};

// Calculate Billing Summary
function calculateBilling() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Get all users
    const allUsers = State.users.map(u => u.username);
    
    // Filter expenses for current month
    const monthlyExpenses = State.sharedExpenses.filter(exp => 
        exp.month === currentMonth && exp.year === currentYear
    );
    
    if (monthlyExpenses.length === 0) {
        return {
            totalExpense: 0,
            userBalances: {},
            settlements: [],
            userStats: {}
        };
    }
    
    const totalExpense = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const fairShare = totalExpense / allUsers.length;
    
    // Calculate per-user spending
    const userSpending = {};
    allUsers.forEach(user => {
        userSpending[user] = monthlyExpenses
            .filter(exp => exp.addedBy === user)
            .reduce((sum, exp) => sum + exp.amount, 0);
    });
    
    // Calculate balances
    const userBalances = {};
    const debtors = [];
    const creditors = [];
    
    for (const user of allUsers) {
        const spent = userSpending[user];
        const balance = spent - fairShare;
        userBalances[user] = balance;
        
        if (balance > 0.01) {
            creditors.push({ user, amount: balance });
        } else if (balance < -0.01) {
            debtors.push({ user, amount: Math.abs(balance) });
        }
    }
    
    // Calculate settlements
    const settlements = [];
    for (const debtor of debtors) {
        for (const creditor of creditors) {
            if (debtor.amount > 0.01 && creditor.amount > 0.01) {
                const amount = Math.min(debtor.amount, creditor.amount);
                settlements.push({
                    from: debtor.user,
                    to: creditor.user,
                    amount: amount,
                    status: 'pending'
                });
                debtor.amount -= amount;
                creditor.amount -= amount;
            }
        }
    }
    
    return {
        totalExpense,
        userBalances,
        settlements,
        userStats: userSpending,
        fairShare
    };
}

// Update Billing Summary UI
function updateBillingSummary() {
    const billing = calculateBilling();
    const summaryDiv = document.getElementById('billing-summary');
    const settlementsDiv = document.getElementById('settlement-cards');
    const statsDiv = document.getElementById('member-stats');
    
    if (!summaryDiv) return;
    
    // Update billing summary
    summaryDiv.innerHTML = `
        <div style="font-size: 2rem; font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">
            Rs ${billing.totalExpense.toFixed(2)}
        </div>
        <div style="color: var(--text-muted); margin-bottom: 0.5rem;">Total Shared Expenses (This Month)</div>
        <div style="font-size: 0.9rem; color: var(--text-muted);">Per person fair share: <strong>Rs ${billing.fairShare.toFixed(2)}</strong></div>
    `;
    
    // Update settlements
    settlementsDiv.innerHTML = '';
    
    const myBalance = billing.userBalances[currentUser.username] || 0;
    
    if (myBalance > 0.01) {
        settlementsDiv.innerHTML += `
            <div class="billing-card">
                <h4><i class="fas fa-arrow-down"></i> Others Owe You</h4>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--green);">Rs ${myBalance.toFixed(2)}</div>
            </div>
        `;
    } else if (myBalance < -0.01) {
        settlementsDiv.innerHTML += `
            <div class="billing-card settlement">
                <h4><i class="fas fa-arrow-up"></i> You Owe</h4>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--red);">Rs ${Math.abs(myBalance).toFixed(2)}</div>
            </div>
        `;
    } else {
        settlementsDiv.innerHTML += `
            <div class="billing-card">
                <h4><i class="fas fa-check-circle"></i> All Settled</h4>
                <div style="color: var(--green);">You are all squared up!</div>
            </div>
        `;
    }
    
    if (billing.settlements.length > 0) {
        settlementsDiv.innerHTML += `
            <div class="billing-card" style="margin-top: 1rem;">
                <h4><i class="fas fa-exchange-alt"></i> Settlement Details</h4>
                <div style="font-size: 0.85rem; margin-top: 1rem;">
                    ${billing.settlements.map(s => `
                        <div style="padding: 0.5rem; border-bottom: 1px dashed var(--border-color);">
                            <strong>${s.from}</strong> → <strong>${s.to}</strong>: <span style="color: var(--red); font-weight: 600;">Rs ${s.amount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Update member statistics
    statsDiv.innerHTML = '';
    const allUsers = State.users.map(u => u.username);
    
    allUsers.forEach(user => {
        const spent = billing.userStats[user] || 0;
        const balance = billing.userBalances[user] || 0;
        
        const avatarColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1'];
        const colorIndex = allUsers.indexOf(user) % avatarColors.length;
        const color = avatarColors[colorIndex];
        
        const card = document.createElement('div');
        card.className = 'member-stat-card';
        card.innerHTML = `
            <div class="stat-avatar" style="background: ${color};">${user.charAt(0).toUpperCase()}</div>
            <div class="stat-name">${user}</div>
            <div class="stat-amount ${balance > 0 ? 'credit' : 'owed'}">
                ${balance > 0 ? '✓ ' : ''}Rs ${Math.abs(balance).toFixed(2)}
            </div>
            <div class="stat-total-spent">Spent: Rs ${spent.toFixed(2)}</div>
        `;
        statsDiv.appendChild(card);
    });
}

// Download Monthly Bill as PDF/Invoice
window.downloadMonthlyBill = function() {
    const billing = calculateBilling();
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const expenses = State.sharedExpenses.filter(exp =>
        exp.month === currentDate.getMonth() + 1 && exp.year === currentDate.getFullYear()
    );
    
    let billHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Monthly Bill - ${month}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #4F46E5; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f5f5f5; font-weight: bold; }
            .summary { margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 5px; }
            .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
            .settlement { margin-top: 30px; padding: 20px; background: #FEF2F2; border-radius: 5px; border-left: 4px solid #EF4444; }
            .settlement h3 { color: #EF4444; margin-top: 0; }
            .total { font-weight: bold; font-size: 1.2em; color: #4F46E5; }
            .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏠 Our Home - Monthly Billing</h1>
            <p>${month}</p>
            <p>Generated on: ${currentDate.toLocaleString()}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Added By</th>
                    <th>Amount (Rs)</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(exp => `
                    <tr>
                        <td>${new Date(exp.date).toLocaleDateString()}</td>
                        <td>${exp.item}</td>
                        <td>${exp.category}</td>
                        <td>${exp.addedBy}</td>
                        <td>${exp.amount.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="summary">
            <div class="summary-item">
                <span>Total Expenses:</span>
                <span class="total">Rs ${billing.totalExpense.toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span>Number of Members:</span>
                <span>${State.users.length}</span>
            </div>
            <div class="summary-item">
                <span>Fair Share Per Member:</span>
                <span class="total">Rs ${billing.fairShare.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="settlement">
            <h3>Individual Settlement</h3>
            ${State.users.map(user => {
                const balance = billing.userBalances[user] || 0;
                const spent = billing.userStats[user] || 0;
                return `
                    <div class="summary-item">
                        <span>${user} (Spent: Rs ${spent.toFixed(2)})</span>
                        <span style="color: ${balance > 0 ? 'green' : 'red'}; font-weight: bold;">
                            ${balance > 0 ? '↓ Credit: Rs ' : '↑ Owes: Rs '}${Math.abs(balance).toFixed(2)}
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="footer">
            <p>This bill was generated from Our Home - Shared Expense Management System</p>
            <p>Keep this record for your personal accounts</p>
        </div>
    </body>
    </html>
    `;
    
    const blob = new Blob([billHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Monthly_Bill_${month.replace(' ', '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('✓ Monthly bill downloaded!');
};

// Payment System
let selectedPaymentMethod = null;

window.selectPaymentMethod = function(method) {
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.closest('.payment-method-btn').classList.add('selected');
    
    const form = document.getElementById('payment-form');
    const fieldsDiv = document.getElementById('payment-fields');
    const titleDiv = document.getElementById('payment-method-title');
    
    const methodNames = {
        'easypaisa': '📱 EasyPaisa Payment',
        'bank': '🏦 Bank Transfer',
        'jazz': '☎️ JazzCash Payment',
        'cash': '💵 Cash Payment'
    };
    
    titleDiv.textContent = methodNames[method] || 'Payment Details';
    
    const paymentFields = {
        'easypaisa': `
            <div class="form-group">
                <label>EasyPaisa Account Number *</label>
                <input type="tel" placeholder="03001234567" required pattern="03[0-9]{9}">
            </div>
            <div class="form-group">
                <label>Amount to Pay (Rs) *</label>
                <input type="number" id="payment-amount" required min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Reference Note</label>
                <textarea placeholder="e.g., Monthly bill payment for January" maxlength="100"></textarea>
            </div>
        `,
        'bank': `
            <div class="form-group">
                <label>Bank Name *</label>
                <select required>
                    <option>HBL - Habib Bank Limited</option>
                    <option>UBL - United Bank Limited</option>
                    <option>MCB - Muslim Commercial Bank</option>
                    <option>NBP - National Bank of Pakistan</option>
                    <option>Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Account Number / IBAN *</label>
                <input type="text" placeholder="Account Number" required>
            </div>
            <div class="form-group">
                <label>Amount to Pay (Rs) *</label>
                <input type="number" id="payment-amount" required min="0" step="0.01" placeholder="0.00">
            </div>
        `,
        'jazz': `
            <div class="form-group">
                <label>JazzCash Account Number *</label>
                <input type="tel" placeholder="03001234567" required pattern="03[0-9]{9}">
            </div>
            <div class="form-group">
                <label>Amount to Pay (Rs) *</label>
                <input type="number" id="payment-amount" required min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Payment PIN</label>
                <input type="password" placeholder="Your JazzCash PIN" maxlength="4">
            </div>
        `,
        'cash': `
            <div class="form-group">
                <label>Amount to Pay (Rs) *</label>
                <input type="number" id="payment-amount" required min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Recipient Name</label>
                <input type="text" placeholder="Who will receive the cash" required>
            </div>
            <div class="form-group">
                <label>Payment Date</label>
                <input type="date" required>
            </div>
        `
    };
    
    fieldsDiv.innerHTML = paymentFields[method] || '';
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
};

window.cancelPayment = function() {
    selectedPaymentMethod = null;
    document.getElementById('payment-form').style.display = 'none';
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('payment-method-title').textContent = 'Select Payment Method';
};

// Process Payment
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!selectedPaymentMethod) {
        showToast('Please select a payment method', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('payment-amount').value);
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    const payment = {
        id: Date.now(),
        from: currentUser.username,
        method: selectedPaymentMethod,
        amount: amount,
        date: new Date().toISOString(),
        status: 'pending',
        details: new FormData(document.getElementById('payment-form'))
    };
    
    State.payments.push(payment);
    saveState('payments');
    logActivity('payment_initiated', { method: selectedPaymentMethod, amount: amount });
    
    showToast(`✓ Payment recorded! Awaiting confirmation.`);
    cancelPayment();
    renderPaymentHistory();
    updateBillingSummary();
});

// Render Payment History
function renderPaymentHistory() {
    const historyDiv = document.getElementById('payment-history');
    
    if (!State.payments || State.payments.length === 0) {
        historyDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No payment history yet</div>';
        return;
    }
    
    historyDiv.innerHTML = '';
    
    const userPayments = State.payments.filter(p => p.from === currentUser.username)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (userPayments.length === 0) {
        historyDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No payment history</div>';
        return;
    }
    
    userPayments.forEach(payment => {
        const date = new Date(payment.date).toLocaleString();
        const methodNames = {
            'easypaisa': '📱 EasyPaisa',
            'bank': '🏦 Bank Transfer',
            'jazz': '☎️ JazzCash',
            'cash': '💵 Cash'
        };
        
        const historyItem = document.createElement('div');
        historyItem.className = `payment-history-item ${payment.status}`;
        historyItem.innerHTML = `
            <div class="payment-info">
                <h4>${methodNames[payment.method] || payment.method}</h4>
                <small>${date}</small>
            </div>
            <div style="text-align: right;">
                <div class="payment-amount">Rs ${payment.amount.toFixed(2)}</div>
                <span class="payment-method-badge" style="background: ${payment.status === 'completed' ? '#DCFCE7' : '#FEF2F2'}; color: ${payment.status === 'completed' ? '#10B981' : '#EF4444'};">
                    ${payment.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                </span>
            </div>
        `;
        historyDiv.appendChild(historyItem);
    });
}

// Update Your Balance Display
function updateYourBalance() {
    const billing = calculateBilling();
    const balance = billing.userBalances[currentUser.username] || 0;
    const balanceDiv = document.getElementById('your-balance');
    const statusDiv = document.getElementById('balance-status');
    
    if (!balanceDiv) return;
    
    if (balance > 0.01) {
        balanceDiv.style.color = '#10B981';
        balanceDiv.textContent = `Rs ${balance.toFixed(2)}`;
        statusDiv.textContent = '✓ Others owe you this amount';
    } else if (balance < -0.01) {
        balanceDiv.style.color = '#EF4444';
        balanceDiv.textContent = `Rs ${Math.abs(balance).toFixed(2)}`;
        statusDiv.textContent = '⚠ You owe this amount';
    } else {
        balanceDiv.style.color = '#10B981';
        balanceDiv.textContent = 'Rs 0.00';
        statusDiv.textContent = '✓ All settled up!';
    }
};

// Filter expenses
const expenseFilter = document.getElementById('expense-filter');
const categoryFilter = document.getElementById('category-filter');

if (expenseFilter) {
    expenseFilter.addEventListener('input', renderSharedExpenses);
}
if (categoryFilter) {
    categoryFilter.addEventListener('change', renderSharedExpenses);
}

// Initialize on app load
window.addEventListener('load', () => {
    setTimeout(() => {
        renderSharedExpenses();
        updateBillingSummary();
        renderPaymentHistory();
        updateYourBalance();
    }, 500);
});


// =====================================================
// === GSAP SCROLL ANIMATIONS - Premium Dashboard
// =====================================================

// Initialize GSAP animations
function initGSAPAnimations() {
    // Make sure GSAP is loaded
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded yet');
        setTimeout(initGSAPAnimations, 100);
        return;
    }

    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Animate dashboard cards on page load
    const cards = document.querySelectorAll('.dashboard-cards .card');
    if (cards.length > 0) {
        gsap.fromTo(cards, 
            {
                opacity: 0,
                y: 50,
                scale: 0.95
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: "back.out(1.5)"
            }
        );
    }

    // Animate hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        gsap.fromTo(hero,
            {
                opacity: 0,
                y: -40
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power3.out"
            }
        );
    }

    // Scroll-triggered animations for cards
    const dataCards = document.querySelectorAll('.data-panel, .form-panel');
    dataCards.forEach((card) => {
        gsap.fromTo(card,
            {
                opacity: 0,
                y: 60
            },
            {
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    end: "top 20%",
                    scrub: 0.5,
                    markers: false
                },
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out"
            }
        );
    });

    // Floating animation for card icons
    document.querySelectorAll('.card-icon').forEach((icon) => {
        gsap.to(icon, {
            y: -10,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    });

    // Section header animations
    document.querySelectorAll('.section-header').forEach((header) => {
        gsap.fromTo(header,
            {
                opacity: 0,
                x: -30
            },
            {
                scrollTrigger: {
                    trigger: header,
                    start: "top 90%"
                },
                opacity: 1,
                x: 0,
                duration: 0.6,
                ease: "power3.out"
            }
        );
    });

    // Partner cards staggered animation
    const partnerCards = document.querySelectorAll('.partner-card');
    if (partnerCards.length > 0) {
        gsap.fromTo(partnerCards,
            {
                opacity: 0,
                scale: 0.9
            },
            {
                opacity: 1,
                scale: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: '.expense-grid',
                    start: "top 80%"
                }
            }
        );
    }

    // Member stat cards animation
    const statCards = document.querySelectorAll('.member-stat-card');
    if (statCards.length > 0) {
        gsap.fromTo(statCards,
            {
                opacity: 0,
                rotationY: 90,
                x: 50
            },
            {
                opacity: 1,
                rotationY: 0,
                x: 0,
                duration: 0.8,
                stagger: 0.12,
                ease: "back.out(1.5)",
                scrollTrigger: {
                    trigger: '.member-stats-grid',
                    start: "top 75%"
                }
            }
        );
    }

    // Message animations
    const messages = document.querySelectorAll('.message');
    messages.forEach((msg) => {
        gsap.fromTo(msg,
            {
                opacity: 0,
                x: msg.classList.contains('self') ? 50 : -50
            },
            {
                opacity: 1,
                x: 0,
                duration: 0.4,
                ease: "power2.out"
            }
        );
    });
}

// Call animations after page is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initGSAPAnimations, 300);
});

// Re-initialize animations when switching sections
const originalNavigateTo = window.navigateTo;
window.navigateTo = function(sectionId) {
    originalNavigateTo(sectionId);
    setTimeout(initGSAPAnimations, 100);
};

// =====================================================
// === CHAT FILE UPLOAD FUNCTIONALITY
// =====================================================

// Handle chat file input change
document.getElementById('chat-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (file.size > maxSize) {
            showToast('File too large (max 5MB)', 'error');
            e.target.value = '';
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            showToast('File type not supported', 'error');
            e.target.value = '';
            return;
        }
        
        // Read file and show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            displayChatFilePreview(file.name, event.target.result, file.type);
        };
        reader.readAsDataURL(file);
    }
});

// Display file preview in chat
function displayChatFilePreview(fileName, fileData, fileType) {
    const preview = document.getElementById('chat-file-preview');
    const previewImg = document.getElementById('preview-image');
    const previewFilename = document.getElementById('preview-filename');
    
    // Store file data globally for sending
    window.currentChatFile = {
        name: fileName,
        data: fileData,
        type: fileType
    };
    
    if (fileType.startsWith('image/')) {
        previewImg.src = fileData;
        previewImg.style.display = 'block';
    } else {
        // For non-image files, show icon
        previewImg.style.display = 'none';
    }
    
    previewFilename.textContent = fileName;
    preview.classList.remove('hidden');
}

// Remove file preview
window.removeChatFilePreview = function() {
    document.getElementById('chat-file-preview').classList.add('hidden');
    document.getElementById('chat-file-input').value = '';
    window.currentChatFile = null;
};

// Open camera for chat
// Open camera for chat - REAL DEVICE CAMERA
window.openChatCamera = function() {
    // Create modal for camera
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-modal-content">
            <div class="camera-modal-header">
                <h3><i class="fas fa-camera"></i> Camera</h3>
                <button type="button" class="modal-close-btn" onclick="closeCamera()">✕</button>
            </div>
            <div class="camera-modal-body">
                <video id="camera-video" autoplay playsinline></video>
                <canvas id="camera-canvas" style="display: none;"></canvas>
            </div>
            <div class="camera-modal-controls">
                <button type="button" class="camera-btn photo-btn" onclick="takePhoto()">
                    <i class="fas fa-circle"></i> Take Photo
                </button>
                <button type="button" class="camera-btn video-btn" id="video-record-btn" onclick="toggleVideoRecording()">
                    <i class="fas fa-video"></i> Start Recording
                </button>
                <button type="button" class="camera-btn cancel-btn" onclick="closeCamera()">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Start camera stream
    startCameraStream();
};

// Global variables for camera
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// Start camera stream
function startCameraStream() {
    const constraints = {
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: true // For video recording
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            cameraStream = stream;
            const video = document.getElementById('camera-video');
            video.srcObject = stream;
            
            // Setup media recorder for video
            const options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const fileName = `video_${Date.now()}.webm`;
                displayChatFilePreview(fileName, url, 'video/webm');
                recordedChunks = [];
                closeCamera();
            };
        })
        .catch(err => {
            console.error('Camera error:', err);
            showToast('Unable to access camera. Check permissions.', 'error');
            closeCamera();
        });
}

// Take photo from camera
window.takePhoto = function() {
    const canvas = document.getElementById('camera-canvas');
    const video = document.getElementById('camera-video');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob and create preview
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const fileName = `photo_${Date.now()}.jpg`;
        displayChatFilePreview(fileName, url, 'image/jpeg');
        closeCamera();
        showToast('✓ Photo captured!');
    }, 'image/jpeg');
};

// Toggle video recording
window.toggleVideoRecording = function() {
    const btn = document.getElementById('video-record-btn');
    
    if (!isRecording) {
        recordedChunks = [];
        mediaRecorder.start();
        isRecording = true;
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop-circle"></i> Stop Recording';
        btn.style.background = '#EF4444';
    } else {
        mediaRecorder.stop();
        isRecording = false;
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-video"></i> Start Recording';
        btn.style.background = '';
    }
};

// Close camera modal
window.closeCamera = function() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    const modal = document.querySelector('.camera-modal');
    if (modal) {
        modal.remove();
    }
};

// Open gallery for chat
window.openChatGallery = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                displayChatFilePreview(file.name, event.target.result, file.type);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
};

// Override chat form submission to include file
const originalChatForm = document.getElementById('chat-form');
if (originalChatForm) {
    originalChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentUser) return;
        
        const text = document.getElementById('chat-text').value.trim();
        const hasFile = window.currentChatFile !== null;
        
        clearFormErrors('chat-form');
        
        if (!text && !hasFile) {
            showFormError('chat-form', 'Message', 'Please type a message or attach a file');
            return;
        }
        
        if (text && text.length > 500) {
            showFormError('chat-form', 'Message', 'Too long (max 500 characters)');
            return;
        }
        
        // Create message with file attachment
        const msg = {
            id: Date.now(),
            sender: currentUser.username,
            text: text || `📎 ${window.currentChatFile.name}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
            file: hasFile ? {
                name: window.currentChatFile.name,
                type: window.currentChatFile.type,
                data: window.currentChatFile.data
            } : null
        };
        
        State.messages.push(msg);
        saveState('messages');
        
        document.getElementById('chat-text').value = '';
        removeChatFilePreview();
        
        showToast('✓ Message sent!');
        renderMessages();
    }, true); // Use capture phase to override
}

// Enhanced renderMessages to show files
const originalRenderMessages = renderMessages;
window.renderMessages = function() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    if (State.messages.length === 0) {
        chatMessages.innerHTML = '<div style="text-align:center; color: var(--text-muted); margin-top: auto; margin-bottom: auto;"><i class="fas fa-comments fa-3x" style="opacity:0.2; display:block; margin-bottom:1rem;"></i> Start the conversation!</div>';
        return;
    }

    const sortedMessages = [...State.messages].sort((a, b) => new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time));

    sortedMessages.forEach(msg => {
        const isSelf = currentUser && msg.sender === currentUser.username;
        const div = document.createElement('div');
        div.className = `message ${isSelf ? 'self' : ''}`;
        
        let fileContent = '';
        if (msg.file) {
            if (msg.file.type.startsWith('image/')) {
                fileContent = `<img src="${msg.file.data}" style="max-width: 150px; max-height: 150px; border-radius: 0.5rem; margin: 0.5rem 0;">`;
            } else {
                fileContent = `<div style="padding: 0.75rem; background: ${isSelf ? 'rgba(255,255,255,0.2)' : '#f0f0f0'}; border-radius: 0.5rem; margin: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-file"></i> <span style="word-break: break-all;">${msg.file.name}</span>
                </div>`;
            }
        }
        
        div.innerHTML = `
            <div class="message-sender">${msg.sender}</div>
            ${fileContent}
            <div class="message-text">${msg.text}</div>
            <div class="message-time">${msg.time}</div>
        `;
        chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Update chat form submission override - fixed version
document.getElementById('chat-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const text = document.getElementById('chat-text').value.trim();
    const hasFile = window.currentChatFile !== null;
    
    clearFormErrors('chat-form');
    
    if (!text && !hasFile) {
        showFormError('chat-form', 'Message', 'Please type a message or attach a file');
        return;
    }
    
    if (text && text.length > 500) {
        showFormError('chat-form', 'Message', 'Too long (max 500 characters)');
        return;
    }
    
    // Create message with file attachment
    const msg = {
        id: Date.now(),
        sender: currentUser.username,
        text: text || (window.currentChatFile ? `📎 ${window.currentChatFile.name}` : ''),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        file: hasFile ? {
            name: window.currentChatFile.name,
            type: window.currentChatFile.type,
            data: window.currentChatFile.data
        } : null
    };
    
    State.messages.push(msg);
    saveState('messages');
    
    document.getElementById('chat-text').value = '';
    removeChatFilePreview();
    
    showToast('✓ Message sent!');
    renderMessages();
}, false);

// Initialize GSAP when home section is shown
window.addEventListener('load', () => {
    setTimeout(() => {
        initGSAPAnimations();
    }, 1000);
});

