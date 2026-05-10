// ============================================================
// PRESTIGE EVENT — BASE DE DONNÉES INTÉGRÉE (localStorage)
// ============================================================

const ADMIN_WHATSAPP = '+241077643015';
const ADMIN_MASTER_KEY = 'PRESTIGE-2026';

// ─── HELPER DB ───────────────────────────────────────────────
const DB = {
    // --- Users ---
    getUsers() {
        return JSON.parse(localStorage.getItem('pe_users') || '[]');
    },
    saveUsers(users) {
        localStorage.setItem('pe_users', JSON.stringify(users));
    },
    findUserByEmail(email) {
        return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    },
    registerUser(name, email, password) {
        const users = this.getUsers();
        if (this.findUserByEmail(email)) return { error: 'Un compte avec cet email existe déjà.' };
        const newUser = {
            id: 'uid_' + Date.now(),
            full_name: name,
            email,
            password, // NOTE: plain text — acceptable for local demo, use hashing in production
            role: 'client',
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        this.saveUsers(users);
        return { user: newUser };
    },
    updateUser(id, fields) {
        const users = this.getUsers().map(u => u.id === id ? { ...u, ...fields } : u);
        this.saveUsers(users);
    },

    // --- Session ---
    getSession() {
        return JSON.parse(sessionStorage.getItem('pe_session') || 'null');
    },
    setSession(user) {
        sessionStorage.setItem('pe_session', JSON.stringify(user));
    },
    clearSession() {
        sessionStorage.removeItem('pe_session');
    },

    // --- Reservations ---
    getReservations() {
        return JSON.parse(localStorage.getItem('pe_reservations') || '[]');
    },
    addReservation(data) {
        const reservations = this.getReservations();
        const entry = {
            id: 'res_' + Date.now(),
            created_at: new Date().toISOString(),
            ...data
        };
        reservations.push(entry);
        localStorage.setItem('pe_reservations', JSON.stringify(reservations));
        return entry;
    },
    deleteReservation(id) {
        const reservations = this.getReservations().filter(r => r.id !== id);
        localStorage.setItem('pe_reservations', JSON.stringify(reservations));
    }
};

// ─── MAIN DOM LOGIC ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // --- Scroll Reveal ---
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(el => observer.observe(el));

    // --- Nav Scroll Effect ---
    const nav = document.querySelector('nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                nav.style.padding = '12px 60px';
                nav.style.background = 'rgba(5, 5, 5, 0.98)';
            } else {
                nav.style.padding = '25px 80px';
                nav.style.background = 'rgba(5, 5, 5, 0.8)';
            }
        });
    }

    // --- Auth Check (runs on every page) ---
    const session = DB.getSession();
    const loginLink = document.querySelector('a[href*="login.html"]');
    if (session) {
        if (loginLink) {
            loginLink.textContent = 'Déconnexion';
            loginLink.href = '#';
            loginLink.onclick = (e) => {
                e.preventDefault();
                DB.clearSession();
                window.location.reload();
            };
        }
        const adminLink = document.getElementById('admin-link');
        if (adminLink && session.role === 'admin') {
            adminLink.style.display = 'block';
        }
    }

    // ─── SIGNUP ───────────────────────────────────────────────
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;

            if (!name || !email || !password) {
                alert('Veuillez remplir tous les champs.');
                return;
            }
            if (password.length < 6) {
                alert('Le mot de passe doit contenir au moins 6 caractères.');
                return;
            }

            const { user, error } = DB.registerUser(name, email, password);
            if (error) {
                alert('Erreur : ' + error);
                return;
            }

            alert(`Bienvenue, ${name} ! Votre compte a été créé. Vous pouvez maintenant vous connecter.`);
            window.location.href = 'login.html';
        });
    }

    // ─── LOGIN ────────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            const user = DB.findUserByEmail(email);
            if (!user || user.password !== password) {
                alert('Email ou mot de passe incorrect.');
                return;
            }

            DB.setSession(user);

            if (user.role === 'admin') {
                window.location.href = 'admin/dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // ─── RESERVATION FORM ─────────────────────────────────────
    const reservationForm = document.getElementById('booking-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const session = DB.getSession();
            if (!session) {
                alert('Veuillez vous connecter avant de réserver.');
                window.location.href = 'login.html';
                return;
            }

            const formData = new FormData(reservationForm);
            const data = Object.fromEntries(formData.entries());
            data.user_id = session.id;
            data.user_name = session.full_name;
            data.user_email = session.email;

            DB.addReservation(data);

            // Generate PDF if jsPDF loaded
            if (window.jspdf) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFontSize(22);
                doc.setTextColor(212, 175, 55);
                doc.text('PRESTIGE EVENT — RÉCAPITULATIF', 20, 20);
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(`Client: ${session.full_name}`, 20, 40);
                doc.text(`Type: ${data['event-type']}`, 20, 50);
                doc.text(`Date: ${data['event-date']}`, 20, 60);
                doc.text(`Invités: ${data['guests']}`, 20, 70);
                doc.text(`Budget: ${data['budget']} FCFA`, 20, 80);
                doc.text(`Notes: ${data['notes'] || '-'}`, 20, 90);
                doc.save(`Reservation_${data['event-date']}.pdf`);
            }

            const message = `*Nouvelle Réservation — Prestige Event*%0A%0A` +
                `*Client:* ${session.full_name} (${session.email})%0A` +
                `*Type:* ${data['event-type']}%0A` +
                `*Date:* ${data['event-date']}%0A` +
                `*Invités:* ${data['guests']}%0A` +
                `*Budget:* ${data['budget']} FCFA%0A` +
                `*Note:* ${data['notes'] || '-'}`;

            alert('Réservation enregistrée ! Redirection vers WhatsApp...');
            window.location.href = `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`;
        });
    }

    // ─── TICKET PURCHASE ──────────────────────────────────────
    document.querySelectorAll('.buy-ticket').forEach(btn => {
        btn.addEventListener('click', () => {
            const session = DB.getSession();
            if (!session) {
                alert('Veuillez vous connecter avant d\'acheter un billet.');
                window.location.href = 'login.html';
                return;
            }

            const ticketType = btn.getAttribute('data-ticket');
            const ticketPrice = btn.getAttribute('data-price');

            const message = `*Achat de Billet — Prestige Event*%0A%0A` +
                `*Client:* ${session.full_name} (${session.email})%0A` +
                `*Type de Pass:* ${ticketType}%0A` +
                `*Prix:* ${ticketPrice}%0A%0A` +
                `Je souhaite finaliser mon achat pour ce billet.`;

            alert(`Redirection vers WhatsApp pour l'achat du ${ticketType}...`);
            window.location.href = `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`;
        });
    });

    // ─── TRACKING ─────────────────────────────────────────────
    const trackBtn = document.getElementById('track-btn');
    const trackResult = document.getElementById('track-result');
    if (trackBtn) {
        trackBtn.addEventListener('click', () => {
            const id = document.querySelector('#track-id')?.value;
            if (id) {
                const reservations = DB.getReservations();
                const found = reservations.find(r => r.id === id);
                trackResult.style.display = 'block';
                if (found) {
                    trackResult.innerHTML = `<strong>Réservation trouvée :</strong><br>Client: ${found.user_name}<br>Type: ${found['event-type']}<br>Date: ${found['event-date']}<br>Statut: En préparation`;
                } else {
                    trackResult.innerHTML = `<strong>Aucune réservation trouvée</strong> pour le numéro : ${id}`;
                }
            } else {
                alert('Veuillez entrer un numéro de suivi.');
            }
        });
    }

    // ─── ADMIN UPGRADE (Page admin-login.html) ────────────────
    const adminUpgradeForm = document.getElementById('admin-upgrade-form');
    if (adminUpgradeForm) {
        adminUpgradeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const masterKey = document.getElementById('admin-master-key').value;

            if (masterKey !== ADMIN_MASTER_KEY) {
                alert('Clé secrète invalide. Accès refusé.');
                return;
            }

            // Create or retrieve an admin session
            let session = DB.getSession();
            if (session) {
                // Elevate existing session to admin
                DB.updateUser(session.id, { role: 'admin' });
                session = { ...session, role: 'admin' };
            } else {
                // Create a standalone admin session (no registered user needed)
                session = {
                    id: 'admin_root',
                    full_name: 'Administrateur',
                    email: 'admin@prestige-event.com',
                    role: 'admin'
                };
            }
            DB.setSession(session);

            alert('✅ Accès Administrateur accordé ! Redirection vers le tableau de bord...');
            window.location.href = 'admin/dashboard.html';
        });
    }

    // ─── 2FA SIMULATION (kept for compatibility) ──────────────
    const mfaForm = document.getElementById('mfa-form');
    if (mfaForm) {
        mfaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Authentification réussie !');
            window.location.href = 'index.html';
        });
    }
});
