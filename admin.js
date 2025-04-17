import { io } from 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js';

// Utility: Sanitize HTML to prevent XSS
const sanitizeHTML = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Utility: Debounce
const debounce = (fn, ms) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
};

// Initialize Socket.IO
const socket = io();
const tbody = document.getElementById('visitor-table-body');
const searchInput = document.getElementById('search-visitors');
const noResults = document.getElementById('no-results');
const loading = document.getElementById('loading');
const filterPanel = document.getElementById('filter-panel');
const dateRangeFilter = document.getElementById('date-range');
const pageFilter = document.getElementById('page-filter');

// Theme Toggle
const themeToggle = document.querySelector('.theme-toggle');
const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeToggle.innerHTML = `<i class="ri-${theme === 'light' ? 'moon' : 'sun'}-line"></i>`;
    localStorage.setItem('theme', theme);
};

// Load theme (prefer system setting if no saved theme)
const savedTheme = localStorage.getItem('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(savedTheme || systemTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme;
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

// Connection Status
socket.on('connect', () => {
    const status = document.getElementById('connection-status');
    status.textContent = 'Connected';
    status.classList.add('connected');
    status.classList.remove('disconnected');
});

socket.on('disconnect', () => {
    const status = document.getElementById('connection-status');
    status.textContent = 'Disconnected';
    status.classList.add('disconnected');
    status.classList.remove('connected');
    noResults.textContent = 'Connection lost. Please try again later.';
    noResults.classList.remove('hidden');
});

// Update Stats
const updateStats = () => {
    const rows = tbody.querySelectorAll('tr');
    const totalVisitors = rows.length;
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = Array.from(rows).filter((row) =>
        row.cells[2].textContent.includes(today)
    ).length;
    const uniqueIPs = new Set(Array.from(rows).map((row) => row.cells[1].textContent)).size;
    const durations = Array.from(rows)
        .map((row) => parseFloat(row.cells[4].textContent) || 0)
        .filter((d) => d > 0);
    const avgSession = durations.length
        ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
        : 0;

    document.getElementById('total-visitors').textContent = totalVisitors.toLocaleString();
    document.getElementById('today-visitors').textContent = todayVisitors.toLocaleString();
    document.getElementById('unique-ips').textContent = uniqueIPs.toLocaleString();
    document.getElementById('avg-session').textContent = `${avgSession}s`;
};

// Filter Logic
const applyFilters = () => {
    const dateRange = dateRangeFilter.value;
    const pageQuery = pageFilter.value.toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    let hasResults = false;

    rows.forEach((row) => {
        const timestamp = row.cells[2].textContent;
        const page = row.cells[3].textContent.toLowerCase();
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let dateMatch = true;
        if (dateRange === 'today') dateMatch = timestamp.includes(today);
        else if (dateRange === 'week') dateMatch = timestamp >= weekAgo;
        else if (dateRange === 'month') dateMatch = timestamp >= monthAgo;

        const pageMatch = !pageQuery || page.includes(pageQuery);
        const matches = dateMatch && pageMatch;

        row.style.display = matches ? '' : 'none';
        if (matches) hasResults = true;
    });

    noResults.classList.toggle('hidden', hasResults);
};

// Handle New Visitor
socket.on('new_visitor', (visitor) => {
    loading.classList.add('hidden');
    const tr = document.createElement('tr');
    tr.classList.add('fade-in');
    tr.innerHTML = `
        <td>${sanitizeHTML(visitor.id.toString())}</td>
        <td>${sanitizeHTML(visitor.ip_address)}</td>
        <td>${sanitizeHTML(visitor.timestamp)}</td>
        <td>${sanitizeHTML(visitor.page)}</td>
        <td>${sanitizeHTML(visitor.duration || '0s')}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
    updateStats();
    applyFilters();

    tr.style.background = 'rgba(254, 189, 105, 0.2)';
    setTimeout(() => {
        tr.style.background = '';
    }, 1000);
});

// Search
const debouncedSearch = debounce((query) => {
    const rows = tbody.querySelectorAll('tr');
    let hasResults = false;

    rows.forEach((row) => {
        const ip = row.cells[1].textContent.toLowerCase();
        const page = row.cells[3].textContent.toLowerCase();
        const timestamp = row.cells[2].textContent.toLowerCase();
        const matches = ip.includes(query) || page.includes(query) || timestamp.includes(query);
        row.style.display = matches ? '' : 'none';
        if (matches) hasResults = true;
    });

    noResults.classList.toggle('hidden', hasResults);
}, 300);

searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value.toLowerCase());
});

// Sort
document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
        const key = th.dataset.sort;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAsc = !th.classList.contains('asc');
        document.querySelectorAll('th').forEach((t) => {
            t.classList.remove('asc', 'desc');
            t.setAttribute('aria-sort', 'none');
            t.querySelector('i').className = 'ri-arrow-down-s-line';
        });
        th.classList.toggle('asc', isAsc);
        th.classList.toggle('desc', !isAsc);
        th.setAttribute('aria-sort', isAsc ? 'ascending' : 'descending');
        th.querySelector('i').className = `ri-arrow-${isAsc ? 'up' : 'down'}-s-line`;

        rows.sort((a, b) => {
            let valA = a.cells[['id', 'ip_address', 'timestamp', 'page', 'duration'].indexOf(key)].textContent;
            let valB = b.cells[['id', 'ip_address', 'timestamp', 'page', 'duration'].indexOf(key)].textContent;

            if (key === 'id') {
                valA = parseInt(valA);
                valB = parseInt(valB);
            } else if (key === 'timestamp') {
                valA = new Date(valA);
                valB = new Date(valB);
            } else if (key === 'duration') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            return isAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });

        tbody.innerHTML = '';
        rows.forEach((row) => tbody.appendChild(row));
    });

    // Keyboard support for sorting
    th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            th.click();
        }
    });
});

// Export CSV
document.querySelector('.export-btn').addEventListener('click', () => {
    const rows = tbody.querySelectorAll('tr');
    let csv = 'ID,IP Address,Timestamp,Page,Session Duration\n';
    rows.forEach((row) => {
        const cells = Array.from(row.cells).map((cell) => `"${cell.textContent.replace(/"/g, '""')}"`);
        csv += cells.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery_visitors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// Filter Panel Toggle
document.querySelector('.filter-btn').addEventListener('click', () => {
    filterPanel.classList.toggle('hidden');
    filterPanel.setAttribute('aria-hidden', filterPanel.classList.contains('hidden'));
    document.querySelector('.filter-btn').setAttribute('aria-expanded', !filterPanel.classList.contains('hidden'));
});

// Apply Filters
document.getElementById('apply-filters').addEventListener('click', applyFilters);

// Initialize
updateStats();
applyFilters();