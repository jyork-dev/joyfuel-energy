const navLinks = document.querySelectorAll(".nav-menu a");

navLinks.forEach(link => {

    link.addEventListener("click", (event) => {

        // Don't actually navigate
        event.preventDefault();

        // Which page should we show?
        const pageId = link.dataset.page;

        showPage(pageId);

    });

});

function showPage(pageId) {

    // Hide all pages
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    // Show selected page
    document.getElementById(pageId).classList.add("active");
}