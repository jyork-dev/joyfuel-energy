document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.nav-toggle');
    const navbar = document.querySelector('#navbar');
    const navLinks = document.querySelectorAll('.nav-menu a');

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
});
