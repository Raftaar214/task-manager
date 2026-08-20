const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const errorMsg = document.getElementById('errorMsg');
const welcomeText = document.getElementById('welcomeText');
const viewLogin = document.getElementById('login-view');

// If already logged in, skip straight to the right dashboard.
fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(user => {
  if (user) window.location.href = user.role === 'manager' ? 'manager.html' : 'employee.html';
});

let isUserValid = false;
let isPassValid = false;

function updateProgress() {
    let validCount = (isUserValid ? 1 : 0) + (isPassValid ? 1 : 0);
    if (validCount === 0) {
        welcomeText.textContent = "Welcome back. Two fields stand between you and the dashboard.";
    } else if (validCount === 1) {
        welcomeText.textContent = "Halfway there. Just one more field.";
    } else {
        welcomeText.textContent = "Form is complete. The button yields.";
    }
}

usernameInput.addEventListener("input", () => {
    isUserValid = usernameInput.value.trim().length >= 3;
    updateProgress();
});

passwordInput.addEventListener("input", () => {
    isPassValid = passwordInput.value.length >= 6;
    updateProgress();
});

// Runaway specific physics vars
let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;
let mouseX = -1000, mouseY = -1000;

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function runawayLoop() {
    if (viewLogin.classList.contains('active')) {
        let validCount = (isUserValid ? 1 : 0) + (isPassValid ? 1 : 0);
        let threshold = validCount === 0 ? 120 : (validCount === 1 ? 60 : 0);

        if (threshold > 0) {
            const rect = loginButton.getBoundingClientRect();
            const baseCenterX = rect.left - currentX + rect.width / 2;
            const baseCenterY = rect.top - currentY + rect.height / 2;

            const distX = baseCenterX + currentX - mouseX;
            const distY = baseCenterY + currentY - mouseY;
            const distance = Math.sqrt(distX * distX + distY * distY);

            if (distance < threshold) {
                const push = threshold - distance;
                const angle = Math.atan2(distY, distX);
                targetX += Math.cos(angle) * push * 0.3;
                targetY += Math.sin(angle) * push * 0.3;

                const maxTravel = 150;
                targetX = Math.max(-maxTravel, Math.min(maxTravel, targetX));
                targetY = Math.max(-maxTravel, Math.min(maxTravel, targetY));
            } else {
                targetX *= 0.9; targetY *= 0.9;
            }
        } else {
            targetX *= 0.8; targetY *= 0.8;
        }

        currentX += (targetX - currentX) * 0.15;
        currentY += (targetY - currentY) * 0.15;
        let currentRot = currentX * 0.04;

        loginButton.style.setProperty('--x', `${currentX}px`);
        loginButton.style.setProperty('--y', `${currentY}px`);
        loginButton.style.setProperty('--rot', `${currentRot}deg`);
    }
    requestAnimationFrame(runawayLoop);
}
requestAnimationFrame(runawayLoop);

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role = document.querySelector('input[name="role"]:checked').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role }),
        });
        const data = await res.json();

        if (!res.ok) {
            errorMsg.textContent = data.error || 'Login failed';
            return;
        }

        window.location.href = data.role === 'manager' ? 'manager.html' : 'employee.html';
    } catch (err) {
        errorMsg.textContent = 'Server error. Please try again later.';
    }
});

// Initialize state check
usernameInput.dispatchEvent(new Event('input'));
passwordInput.dispatchEvent(new Event('input'));

const togglePassword = document.getElementById('togglePassword');
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        if (type === 'text') {
            passwordInput.classList.add('password-visible');
            this.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            passwordInput.classList.remove('password-visible');
            this.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    });
}
