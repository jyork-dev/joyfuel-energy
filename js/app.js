document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.nav-toggle');
    const navbar = document.querySelector('#navbar');
    const navLinks = document.querySelectorAll('.nav-menu a');
    const eventsList = document.getElementById('events-list');
    const eventsPagination = document.getElementById('events-pagination');

    if (toggle && navbar) {
        toggle.addEventListener('click', () => {
            const isOpen = navbar.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbar && navbar.classList.contains('open')) {
                navbar.classList.remove('open');
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    if (eventsList) {
        loadEvents(eventsList, eventsPagination);
    }
});

function loadEvents(container, paginationContainer) {
    const sheetUrl = container.getAttribute('data-sheet-url') || window.JOYFUEL_EVENT_SHEET_URL || '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!sheetUrl || sheetUrl.includes('YOUR_SHEET_ID')) {
        renderEventsMessage(container, 'Publish your Google Sheet to the web and paste the CSV link into the events section to start showing upcoming events.');
        return;
    }

    container.innerHTML = '<p class="events-loading">Loading upcoming events…</p>';

    fetch(sheetUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to load events');
            }
            return response.text();
        })
        .then((csvText) => {
            const entries = parseSheetRows(csvText);
            const upcoming = entries
                .map((entry) => normalizeEvent(entry))
                .filter(Boolean)
                .filter((event) => event.date && event.date >= today)
                .sort((a, b) => a.date - b.date);

            if (!upcoming.length) {
                renderEventsMessage(container, 'No upcoming events are scheduled right now. Reach out to book a pop-up, market, or private gathering.');
                if (paginationContainer) {
                    paginationContainer.innerHTML = '';
                }
                return;
            }

            const eventsPerPage = 6;
            const totalPages = Math.ceil(upcoming.length / eventsPerPage);
            let currentPage = 1;

            function renderPage(page) {
                currentPage = Math.min(Math.max(page, 1), totalPages);
                const startIndex = (currentPage - 1) * eventsPerPage;
                const visibleEvents = upcoming.slice(startIndex, startIndex + eventsPerPage);

                container.innerHTML = visibleEvents.map((event) => `
                    <article class="event-card">
                        <div class="event-date-badge">${escapeHtml(event.dateLabel)}</div>
                        <div class="event-card-body">
                            <h3>${escapeHtml(event.title)}</h3>
                            ${event.location ? `<p class="event-meta"><strong>Location:</strong> ${escapeHtml(event.location)}</p>` : ''}
                            ${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ''}
                            ${event.link ? `<a class="event-link" href="${escapeHtml(event.link)}" target="_blank" rel="noopener noreferrer">Learn more</a>` : ''}
                        </div>
                    </article>
                `).join('');

                if (paginationContainer) {
                    renderPagination(paginationContainer, totalPages, currentPage);
                }
            }

            if (paginationContainer) {
                paginationContainer.addEventListener('click', (event) => {
                    const button = event.target.closest('button[data-page]');
                    if (!button) {
                        return;
                    }

                    const nextPage = Number(button.getAttribute('data-page'));
                    if (!Number.isNaN(nextPage)) {
                        renderPage(nextPage);
                        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            }

            renderPage(currentPage);
        })
        .catch(() => {
            renderEventsMessage(container, 'The events feed is temporarily unavailable. Please try again soon or contact us directly to book your next celebration.');
        });
}

function parseSheetRows(csvText) {
    const rows = parseCsv(csvText);
    if (!rows.length) {
        return [];
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    return rows.slice(1)
        .filter((row) => row.some((value) => value && value.trim()))
        .map((row) => {
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = row[index] ? row[index].trim() : '';
            });
            return entry;
        });
}

function parseCsv(text) {
    const sanitized = text.replace(/^\ufeff/, '').trim();
    if (!sanitized) {
        return [];
    }

    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let index = 0; index < sanitized.length; index += 1) {
        const character = sanitized[index];

        if (character === '"') {
            const nextCharacter = sanitized[index + 1];
            if (inQuotes && nextCharacter === '"') {
                value += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (character === ',' && !inQuotes) {
            row.push(value);
            value = '';
        } else if ((character === '\n' || character === '\r') && !inQuotes) {
            if (character === '\r' && sanitized[index + 1] === '\n') {
                index += 1;
            }
            row.push(value);
            if (row.some((cell) => cell !== '')) {
                rows.push(row);
            }
            row = [];
            value = '';
        } else {
            value += character;
        }
    }

    if (value.length || row.length) {
        row.push(value);
        if (row.some((cell) => cell !== '')) {
            rows.push(row);
        }
    }

    return rows;
}

function normalizeEvent(entry) {
    const title = getFirstValue(entry, ['title', 'event', 'event name', 'name']);
    const dateText = getFirstValue(entry, ['date', 'event date', 'when', 'date/time', 'start date', 'datetime', 'start']);
    const location = getFirstValue(entry, ['location', 'venue', 'place']);
    const description = getFirstValue(entry, ['description', 'details', 'notes', 'summary']);
    const link = getFirstValue(entry, ['link', 'url', 'website', 'learn more']);
    const timeText = getFirstValue(entry, ['time', 'event time', 'start time']);

    if (!title || !dateText) {
        return null;
    }

    const parsedDate = new Date(dateText);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    parsedDate.setHours(12, 0, 0, 0);
    const dateLabel = timeText ? `${formatDate(parsedDate)} • ${timeText}` : formatDate(parsedDate);

    return {
        title,
        date: parsedDate,
        dateLabel,
        location,
        description,
        link
    };
}

function getFirstValue(entry, aliases) {
    const normalizedAliases = aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const matchingKey = Object.keys(entry).find((key) => {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedAliases.includes(normalizedKey);
    });

    return matchingKey ? entry[matchingKey] : '';
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function renderEventsMessage(container, message) {
    container.innerHTML = `<p class="events-empty">${escapeHtml(message)}</p>`;
}

function renderPagination(container, totalPages, currentPage) {
    if (!container) {
        return;
    }

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const previousPage = Math.max(1, currentPage - 1);
    const nextPage = Math.min(totalPages, currentPage + 1);

    container.innerHTML = `
        <button class="events-pagination__button" type="button" data-page="${previousPage}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span class="events-pagination__info">Page ${currentPage} of ${totalPages}</span>
        <button class="events-pagination__button" type="button" data-page="${nextPage}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
    `;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
