// ============================================================
// PRESTIGE EVENT — ADMIN DASHBOARD (Base de données intégrée)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. Check admin session
    const session = DB.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    if (session.role !== 'admin') {
        alert('Accès refusé. Réservé aux administrateurs.');
        window.location.href = '../index.html';
        return;
    }

    // 2. Load data
    loadDashboard();

    // 3. Export button
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
});

function loadDashboard() {
    const reservations = DB.getReservations();
    const tbody = document.getElementById('reservation-body');
    const totalCountElem = document.getElementById('total-reservations');
    const totalPaidElem = document.getElementById('total-paid');

    // Stats
    totalCountElem.textContent = `${reservations.length} Réservation${reservations.length > 1 ? 's' : ''}`;

    let totalBudget = 0;
    reservations.forEach(res => {
        totalBudget += parseFloat(String(res.budget).replace(/[^0-9.]/g, '')) || 0;
    });
    totalPaidElem.textContent = `${totalBudget.toLocaleString('fr-FR')} FCFA`;

    // Table
    tbody.innerHTML = '';
    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 40px;">Aucune réservation enregistrée.</td></tr>';
        return;
    }

    reservations.slice().reverse().forEach(res => {
        const dateFormatted = res['event-date']
            ? new Date(res['event-date']).toLocaleDateString('fr-FR')
            : '-';
        const createdFormatted = new Date(res.created_at).toLocaleDateString('fr-FR');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${res.id.substring(4, 12)}</td>
            <td>${res.user_name || 'Inconnu'}<br><small style="color:var(--text-muted)">${res.user_email || ''}</small></td>
            <td>${res['event-type'] || '-'}</td>
            <td>${dateFormatted}</td>
            <td>${res.guests || '-'}</td>
            <td>${res.budget || '-'} FCFA</td>
            <td><span class="status-badge status-pending">En attente</span></td>
            <td>
                <button class="btn-outline" style="padding: 6px 14px; font-size: 0.8rem; cursor: pointer;"
                    onclick="deleteReservation('${res.id}')">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteReservation(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return;
    DB.deleteReservation(id);
    loadDashboard();
}

function exportToCSV() {
    const reservations = DB.getReservations();
    if (reservations.length === 0) {
        alert('Aucune donnée à exporter.');
        return;
    }

    const headers = ['ID', 'Client', 'Email', 'Type', 'Date Événement', 'Invités', 'Budget', 'Créé le'];
    const rows = reservations.map(r => [
        r.id,
        `"${r.user_name || ''}"`,
        `"${r.user_email || ''}"`,
        `"${r['event-type'] || ''}"`,
        r['event-date'] || '',
        r.guests || '',
        r.budget || '',
        r.created_at || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_prestige_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}
