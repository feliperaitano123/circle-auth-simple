let currentEmail = '';
let currentStep = 'email';

const steps = {
    email: document.getElementById('step-email'),
    code: document.getElementById('step-code'),
    success: document.getElementById('step-success')
};

const forms = {
    email: document.getElementById('email-form'),
    code: document.getElementById('code-form')
};

const inputs = {
    email: document.getElementById('email-input'),
    codeInputs: document.querySelectorAll('.code-input')
};

const buttons = {
    sendCode: document.getElementById('send-code-btn'),
    verifyCode: document.getElementById('verify-code-btn'),
    changeEmail: document.getElementById('change-email-btn'),
    resend: document.getElementById('resend-btn'),
    copyToken: document.getElementById('copy-token-btn'),
    themeToggle: document.getElementById('theme-toggle')
};

const displays = {
    email: document.getElementById('email-display'),
    token: document.getElementById('token-display')
};

const errors = {
    email: document.getElementById('email-error'),
    code: document.getElementById('code-error')
};

function showStep(step) {
    Object.values(steps).forEach(s => s.classList.remove('active'));
    steps[step].classList.add('active');
    currentStep = step;
}

function showError(type, message) {
    const error = errors[type];
    error.textContent = message;
    error.classList.add('show');
    setTimeout(() => error.classList.remove('show'), 5000);
}

function hideError(type) {
    errors[type].classList.remove('show');
}

function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

function setupCodeInputs() {
    inputs.codeInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            if (value.length === 1) {
                input.classList.add('filled');
                if (index < inputs.codeInputs.length - 1) {
                    inputs.codeInputs[index + 1].focus();
                }
            } else {
                input.classList.remove('filled');
            }
            
            const code = getCode();
            if (code.length === 6) {
                forms.code.dispatchEvent(new Event('submit'));
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs.codeInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = e.clipboardData.getData('text').replace(/\D/g, '');
            const chars = paste.split('').slice(0, 6);
            
            chars.forEach((char, i) => {
                if (inputs.codeInputs[i]) {
                    inputs.codeInputs[i].value = char;
                    inputs.codeInputs[i].classList.add('filled');
                }
            });
            
            if (chars.length === 6) {
                forms.code.dispatchEvent(new Event('submit'));
            }
        });
    });
}

function getCode() {
    return Array.from(inputs.codeInputs).map(i => i.value).join('');
}

function clearCode() {
    inputs.codeInputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
    inputs.codeInputs[0].focus();
}

async function sendCode(email) {
    const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
    }
    
    return data;
}

async function verifyCode(email, code) {
    const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
    }
    
    return data;
}

forms.email.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('email');
    
    const email = inputs.email.value.trim();
    if (!email) return;
    
    setLoading(buttons.sendCode, true);
    
    try {
        await sendCode(email);
        currentEmail = email;
        displays.email.textContent = email;
        showStep('code');
        clearCode();
    } catch (error) {
        showError('email', error.message);
    } finally {
        setLoading(buttons.sendCode, false);
    }
});

forms.code.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('code');
    
    const code = getCode();
    if (code.length !== 6) {
        showError('code', 'Digite o código completo');
        return;
    }
    
    setLoading(buttons.verifyCode, true);
    
    try {
        const { token } = await verifyCode(currentEmail, code);
        displays.token.textContent = token;
        showStep('success');
    } catch (error) {
        showError('code', error.message);
        clearCode();
    } finally {
        setLoading(buttons.verifyCode, false);
    }
});

buttons.changeEmail.addEventListener('click', () => {
    showStep('email');
    inputs.email.value = currentEmail;
    inputs.email.focus();
});

buttons.resend.addEventListener('click', async () => {
    hideError('code');
    setLoading(buttons.resend, true);
    
    try {
        await sendCode(currentEmail);
        clearCode();
        showError('code', '✓ Código reenviado');
        errors.code.style.background = '#d1fae5';
        errors.code.style.borderColor = '#6ee7b7';
        errors.code.style.color = '#065f46';
        setTimeout(() => {
            errors.code.style.background = '';
            errors.code.style.borderColor = '';
            errors.code.style.color = '';
        }, 3000);
    } catch (error) {
        showError('code', error.message);
    } finally {
        setLoading(buttons.resend, false);
    }
});

buttons.copyToken.addEventListener('click', async () => {
    const token = displays.token.textContent;
    
    try {
        await navigator.clipboard.writeText(token);
        buttons.copyToken.classList.add('copied');
        buttons.copyToken.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copiado!
        `;
        
        setTimeout(() => {
            buttons.copyToken.classList.remove('copied');
            buttons.copyToken.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copiar
            `;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
});

// Theme toggle functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateLogos(isDark);
}

function updateLogos(isDark) {
    const logoImgs = document.querySelectorAll('.logo-img');
    const logoSrc = isDark ? 'Logo Icon White.png' : 'Logo Icon Main.png';
    
    logoImgs.forEach(img => {
        img.src = logoSrc;
    });
}

buttons.themeToggle.addEventListener('click', toggleTheme);

// Initialize theme
initTheme();
// Update logos for initial theme
updateLogos(document.documentElement.classList.contains('dark'));

setupCodeInputs();
inputs.email.focus();

window.addEventListener('popstate', () => {
    if (currentStep === 'code') {
        showStep('email');
    }
});