// DOM Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Sign up
signupBtn.addEventListener('click', () => {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            // Clear the form
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        })
        .catch(error => {
            alert('Error signing up: ' + error.message);
        });
});

// Login
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Clear the form
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        })
        .catch(error => {
            alert('Error logging in: ' + error.message);
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .catch(error => {
            alert('Error logging out: ' + error.message);
        });
});

// Auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        // Load todos when user logs in
        loadTodos();
    } else {
        // User is signed out
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});
